// app/api/ai/[station_id]/route.js

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";
import User from "@/models/user";
import Groq from "groq-sdk";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const cache = new Map();
const CACHE_TTL = 5 * 60 * 60 * 1000; // 5 hours

const getCacheKey = (station_id, role, userId) =>
  `${station_id}:${role || "public"}${userId ? `:user_${userId}` : ""}`;

// Function to get complete user data for AI context
async function getUserDataForAI(userId) {
  console.log("\n👤 [getUserDataForAI] Fetching complete user data for userId:", userId);
  
  try {
    await dbConnect();
    
    const user = await User.findById(userId)
      .select("email role farmingProfile createdAt")
      .lean();
    
    if (!user) {
      console.log("❌ [getUserDataForAI] User not found:", userId);
      return null;
    }
    
    console.log("✅ [getUserDataForAI] User data retrieved successfully");
    return user;
    
  } catch (error) {
    console.error("❌ [getUserDataForAI] Error fetching user data:", error.message);
    return null;
  }
}

async function handleStationAI(station_id, role = null, userId = null) {
  console.log("\n🔍 [AI API] ========= NEW REQUEST =========");
  console.log("🏢 Station ID:", station_id);
  console.log("👤 Role:", role);
  console.log("🆔 UserId:", userId);
  
  // AUTHENTICATION CHECK: If userId is null, don't make AI call
  if (!userId || !role) {
    console.log("🔒 [AI API] Authentication required - No user ID or role");
    return { 
      error: "Authentication required",
      message: "Please log in to access AI recommendations",
      login_required: true,
      status: "unauthorized"
    };
  }
  
  const cacheKey = getCacheKey(station_id, role, userId);

  // Cache check
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    console.log("⚡ Cache hit! Returning cached data");
    return cached.data;
  }
  console.log("📦 No cache - fetching from DB");

  await dbConnect();

  // First, verify user exists
  const userData = await getUserDataForAI(userId);
  if (!userData) {
    console.log("❌ [AI API] User not found in database, denying AI access");
    return { 
      error: "User not found",
      message: "Your account could not be found. Please log in again.",
      status: "user_not_found"
    };
  }

  console.log("✅ [AI API] User authenticated:", userData.email);

  const station = await Station.findOne({ station_id }).lean();
  if (!station) {
    console.log("❌ Station not found:", station_id);
    return { error: "Station not found" };
  }
  console.log("✅ Station found:", station.address?.village);

  // Water level calculation
  const years = Object.keys(station.historical_water_levels || {}).map(Number);
  const latestYear = years.length ? Math.max(...years) : null;
  const current_levels = latestYear ? station.historical_water_levels[latestYear] : {};
  const levels = Object.values(current_levels).filter(Boolean);
  const avg_level = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;

  let water_level_status = "safe";
  if (avg_level < 3.5) water_level_status = "critical";
  else if (avg_level < 4) water_level_status = "low";

  const daily_extraction_limit_liters =
    (station.extraction_infrastructure?.average_extraction_rate_m3_day || 0) * 1000;

  const buckets_per_borewell =
    daily_extraction_limit_liters /
    20 /
    (station.extraction_infrastructure?.borewell_count || 1);

  const quality = await mongoose.connection.collection("water-quality").findOne({ station_id });
  const usage = await mongoose.connection.collection("water-usage").findOne({ station_id });

  const isUser = ["farmer", "normal citizen"].includes(role?.toLowerCase());
  const isPlanner = ["decision maker", "ground water researcher"].includes(role?.toLowerCase());

  console.log("\n📊 [AI API] Role Analysis:");
  console.log("  isUser:", isUser, "(farmer or normal citizen)");
  console.log("  isPlanner:", isPlanner, "(decision maker or ground water researcher)");

  const baseData = {
    daily_extraction_limit_liters,
    buckets_per_borewell: Number(buckets_per_borewell.toFixed(2)),
    water_level_status,
    household_water_liters: 150,
    agriculture_water_m3_year: usage?.agriculture?.total_water_requirement_m3_year || 0,
    industrial_extraction_limit_m3_year: usage?.industries?.total_usage_m3_year || 0,
    station_id: station_id,
    village: station.address?.village || "Unknown",
    district: station.address?.district || "Unknown"
  };

  // Build AI Prompt - SIMPLIFIED to let AI generate everything
  let prompt = `You are a senior groundwater expert and policy advisor from India. Provide detailed, actionable recommendations.

USER PROFILE:
- Email: ${userData.email}
- Role: ${userData.role}
- Experience: Registered since ${new Date(userData.createdAt).toLocaleDateString()}`;

  if (userData.farmingProfile) {
    const farming = userData.farmingProfile;
    prompt += `
FARMING PROFILE:
- Crops: ${farming.crops?.join(", ") || "None specified"}
- Livestock: ${farming.livestock?.join(", ") || "None specified"}
- Land Area: ${farming.landAreaAcres || "Not specified"} acres
- Irrigation Method: ${farming.irrigationMethod || "Not specified"}`;
  }

  prompt += `

CURRENT WATER SITUATION AT STATION ${station_id}:
- Location: ${station.address?.village || "Unknown"}, ${station.address?.district || "Unknown District"}
- Water Level: ${avg_level.toFixed(2)} meters (Status: ${water_level_status})
- Daily Safe Extraction Limit: ${daily_extraction_limit_liters.toLocaleString()} liters/day
- Water Quality: ${quality?.fluoride > 1.5 ? "HIGH FLUORIDE (" + quality.fluoride + " mg/L)" : "Normal"}
- Agriculture Usage: ${baseData.agriculture_water_m3_year || 0} m³/year
- Industrial Limit: ${baseData.industrial_extraction_limit_m3_year || 0} m³/year
- Borewells: ${station.extraction_infrastructure?.borewell_count || "Unknown"} units

Return ONLY valid JSON with this exact structure. Generate ALL recommendations naturally based on the data above. Make each recommendation 2-3 lines descriptive:
{
  "user_info": {
    "email": "${userData.email}",
    "role": "${userData.role}",
    "has_farming_profile": ${!!userData.farmingProfile},
    "greeting": "Generate a personalized greeting for the user"
  },
  "station_info": {
    "station_id": "${station_id}",
    "location": "${station.address?.village || "Unknown"}, ${station.address?.district || "Unknown District"}",
    "water_level": ${avg_level.toFixed(2)},
    "water_status": "${water_level_status}",
    "daily_limit_liters": ${baseData.daily_extraction_limit_liters},
    "buckets_per_borewell": ${Number(buckets_per_borewell.toFixed(2))},
    "historical_years": ${years.length}
  },
  "key_metrics": {
    "daily_extraction_limit_liters": ${baseData.daily_extraction_limit_liters},
    "buckets_per_borewell": ${Number(buckets_per_borewell.toFixed(2))},
    "water_level_status": "${baseData.water_level_status}",
    "household_water_liters": ${baseData.household_water_liters},
    "agriculture_water_m3_year": ${baseData.agriculture_water_m3_year},
    "industrial_extraction_limit_m3_year": ${baseData.industrial_extraction_limit_m3_year}
  }`;

  // Add personalized section based on user role - SIMPLIFIED
  if (isUser) {
    prompt += `,
  "personalized_recommendations": {
    "greeting": "Generate personalized greeting based on user role and time",
    "summary": "Generate 5 line summary of their water situation",
    "immediate_actions": ["Generate 3-5 immediate actions with 5-6lines each"],
    ${userData.farmingProfile?.crops?.length ? `"crop_advice": {
      "current_crops": "${userData.farmingProfile.crops.join(", ")}",
      "water_efficiency_tips": ["Generate 3 crop-specific water efficiency tips"],
      "alternative_crops": ["Suggest 3 less water-intensive alternatives"]
    },` : ''}
    "water_conservation": {
      "household_tips": ["Generate 5 household water-saving tips"],
      "farm_tips": ${userData.farmingProfile ? '["Generate 5 farm-specific water conservation tips"]' : '["Generate 5 general water conservation tips"]'}
    },
    "government_schemes": ["Generate 3 relevant government schemes with brief descriptions"],
    "critical_warning": "Generate appropriate warning based on water level status"
  }`;
  }

  // Enhanced Planner Recommendations - SIMPLIFIED
  if (isPlanner) {
    prompt += `,
  "planner_recommendations": {
    "executive_summary": "Generate 2-3 sentence executive summary",
    "urgency_level": "Generate urgency level assessment",
    "immediate_actions": ["Generate 5 immediate policy actions with details"],
    "short_term_policies": ["Generate 4 short-term policy recommendations"],
    "medium_term_projects": ["Generate 4 medium-term infrastructure projects"],
    "long_term_strategies": ["Generate 3 long-term strategic initiatives"],
    "budget_estimates": {
      "immediate_actions": "Generate budget estimate for immediate actions",
      "short_term": "Generate budget estimate for short-term policies",
      "medium_term": "Generate budget estimate for medium-term projects",
      "total_required": "Generate total budget required"
    },
    "funding_sources": ["Generate 4-5 potential funding sources"],
    "performance_indicators": ["Generate 5 key performance indicators"],
    "risk_assessment": {
      "current_risk": "Generate current risk assessment",
      "potential_impact": "Generate potential impact analysis",
      "mitigation_strategies": ["Generate 3 mitigation strategies"]
    }
  }`;
  }

  // Add general recommendations for all users
  prompt += `,
  "general_recommendations": {
    "water_conservation": ["Generate 5 general water conservation tips"],
    "community_initiatives": ["Generate 4 community engagement initiatives"],
    "monitoring_suggestions": ["Generate 4 water monitoring suggestions"]
  },
  "summary": "Generate comprehensive 3-4 line summary",
  "metadata": {
    "timestamp": "${new Date().toISOString()}",
    "cache_key": "${cacheKey}",
    "ai_model": "llama-3.3-70b-versatile",
    "station_id": "${station_id}",
    "user_role": "${role}",
    "analysis_type": "${isPlanner ? 'Policy Planning' : isUser ? 'Personal Advisory' : 'General'}"
  }
}`;

  // Call Groq AI
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  console.log("\n🤖 [AI API] Calling Groq AI for authenticated user...");
  console.log("📋 Prompt length:", prompt.length, "characters");
  console.log("👤 User role:", role, "| Is planner:", isPlanner);
  
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { 
          role: "system", 
          content: `You are a groundwater management expert in India. 
          Return ONLY clean valid JSON. No markdown, no extra text outside JSON. 
          Generate all recommendations naturally based on the provided data.
          Make each recommendation descriptive (2-3 lines) and contextually relevant.
          Fill all fields in the JSON structure with generated content.` 
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8, // Increased temperature for more creative responses
      max_tokens: 3000, // Increased tokens for detailed responses
    });

    console.log("✅ Groq response received");
    let text = completion.choices[0]?.message?.content || "{}";
    console.log("📄 Raw response length:", text.length, "chars");
    
    // Clean and parse JSON
    text = text.replace(/```json|```/g, "").trim();
    let data;
    try {
      data = JSON.parse(text);
      console.log("✅ JSON parsed successfully");
      console.log("📦 Response keys:", Object.keys(data));
      if (data.planner_recommendations) {
        console.log("📊 Planner recommendations found, keys:", Object.keys(data.planner_recommendations));
      }
    } catch (parseErr) {
      console.log("⚠️  JSON parse failed, extracting JSON from text...");
      console.log("Error:", parseErr.message);
      console.log("Text sample:", text.substring(0, 500));
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          data = JSON.parse(match[0]);
          console.log("✅ Extracted JSON successfully");
        } catch (e) {
          console.log("❌ Even extracted JSON failed:", e.message);
          data = {};
        }
      } else {
        data = {};
      }
    }

    // Ensure critical data is included with fallbacks
    data.user_info = {
      email: userData.email,
      role: userData.role,
      has_farming_profile: !!userData.farmingProfile,
      greeting: data.user_info?.greeting || `Welcome ${userData.role}`,
      ...data.user_info
    };

    data.station_info = {
      station_id,
      location: `${station.address?.village || "Unknown"}, ${station.address?.district || "Unknown District"}`,
      water_level: avg_level.toFixed(2),
      water_status: water_level_status,
      daily_limit_liters: baseData.daily_extraction_limit_liters,
      buckets_per_borewell: Number(buckets_per_borewell.toFixed(2)),
      historical_years: years.length,
      ...data.station_info
    };

    data.key_metrics = {
      ...baseData,
      ...data.key_metrics
    };

    // Ensure arrays are properly formatted
    const ensureArray = (obj, path) => {
      const keys = path.split('.');
      let current = data;
      for (let i = 0; i < keys.length; i++) {
        if (!current[keys[i]]) {
          if (i === keys.length - 1) {
            current[keys[i]] = [];
          } else {
            current[keys[i]] = {};
          }
        }
        current = current[keys[i]];
      }
    };

    // Ensure all required arrays exist
    if (isPlanner && data.planner_recommendations) {
      ensureArray('planner_recommendations.immediate_actions');
      ensureArray('planner_recommendations.short_term_policies');
      ensureArray('planner_recommendations.medium_term_projects');
      ensureArray('planner_recommendations.long_term_strategies');
      ensureArray('planner_recommendations.funding_sources');
      ensureArray('planner_recommendations.performance_indicators');
      
      // Ensure budget estimates exist
      if (!data.planner_recommendations.budget_estimates) {
        data.planner_recommendations.budget_estimates = {};
      }
      
      // Ensure risk assessment exists
      if (!data.planner_recommendations.risk_assessment) {
        data.planner_recommendations.risk_assessment = {};
      }
      
      // Add urgency level if missing
      if (!data.planner_recommendations.urgency_level) {
        data.planner_recommendations.urgency_level = water_level_status === 'critical' ? 'HIGH URGENCY' : 
                                                     water_level_status === 'low' ? 'MEDIUM URGENCY' : 'MONITOR CLOSELY';
      }
    }

    if (isUser && data.personalized_recommendations) {
      ensureArray('personalized_recommendations.immediate_actions');
      ensureArray('personalized_recommendations.government_schemes');
      
      // Ensure water_conservation exists
      if (!data.personalized_recommendations.water_conservation) {
        data.personalized_recommendations.water_conservation = {};
      }
      ensureArray('personalized_recommendations.water_conservation.household_tips');
      ensureArray('personalized_recommendations.water_conservation.farm_tips');
      
      // Add critical warning if missing
      if (!data.personalized_recommendations.critical_warning) {
        data.personalized_recommendations.critical_warning = water_level_status === 'critical' ? 
          'URGENT: Water level is critical - immediate action required' : 
          water_level_status === 'low' ? 
          'WARNING: Water level is low - conservation measures needed' : 
          'Water level is stable - maintain conservation practices';
      }
    }

    // Ensure general recommendations exist
    if (!data.general_recommendations) {
      data.general_recommendations = {};
    }
    ensureArray('general_recommendations.water_conservation');
    ensureArray('general_recommendations.community_initiatives');
    ensureArray('general_recommendations.monitoring_suggestions');

    // Ensure summary exists
    if (!data.summary) {
      data.summary = `Water level at ${avg_level.toFixed(2)}m (${water_level_status}). Daily extraction limit: ${daily_extraction_limit_liters.toLocaleString()} liters. ${isPlanner ? 'Policy interventions recommended.' : 'Conservation measures advised.'}`;
    }

    // Ensure metadata exists
    data.metadata = {
      timestamp: new Date().toISOString(),
      cache_key: cacheKey,
      ai_model: "llama-3.3-70b-versatile",
      station_id,
      user_role: role,
      analysis_type: isPlanner ? 'Policy Planning' : isUser ? 'Personal Advisory' : 'General',
      ...data.metadata
    };

    // Cache result
    console.log("\n💾 Caching response with key:", cacheKey);
    cache.set(cacheKey, { data, ts: Date.now() });

    console.log("✅ [AI API] AI response ready for user:", userData.email);
    return data;
    
  } catch (error) {
    console.error("❌ [AI API] Groq Error:", error.message);
    
    // Create comprehensive fallback response
    const fallbackData = {
      user_info: {
        email: userData.email,
        role: userData.role,
        has_farming_profile: !!userData.farmingProfile,
        greeting: `Welcome ${userData.role}`
      },
      station_info: {
        station_id,
        location: `${station.address?.village || "Unknown"}, ${station.address?.district || "Unknown District"}`,
        water_level: avg_level.toFixed(2),
        water_status: water_level_status,
        daily_limit_liters: baseData.daily_extraction_limit_liters,
        buckets_per_borewell: Number(buckets_per_borewell.toFixed(2)),
        historical_years: years.length
      },
      key_metrics: { ...baseData },
      general_recommendations: {
        water_conservation: [
          "Fix leaking taps and pipelines immediately to prevent water wastage",
          "Use drip irrigation systems for agriculture to reduce water consumption by 30-40%",
          "Implement rainwater harvesting to capture monsoon rainfall for dry season use"
        ],
        community_initiatives: [
          "Organize water conservation awareness camps in local communities",
          "Create water user groups to manage shared water resources effectively",
          "Establish village water committees for participatory water management"
        ],
        monitoring_suggestions: [
          "Install automated water level sensors for real-time monitoring",
          "Conduct monthly water quality tests to ensure safe drinking water",
          "Maintain detailed extraction records for all borewells and wells"
        ]
      }
    };

    // Add planner recommendations for decision makers
    if (isPlanner) {
      fallbackData.planner_recommendations = {
        executive_summary: `Water management recommendations for ${station.address?.village || station_id}. Current water level: ${avg_level.toFixed(2)}m (${water_level_status}). Requires ${water_level_status === 'critical' ? 'immediate intervention' : 'proactive management'}.`,
        urgency_level: water_level_status === 'critical' ? 'HIGH URGENCY' : water_level_status === 'low' ? 'MEDIUM URGENCY' : 'MONITOR CLOSELY',
        immediate_actions: [
          "Declare water alert status and restrict non-essential water use",
          "Deploy emergency water testing teams to monitor quality parameters",
          "Activate public awareness campaign on water conservation measures"
        ],
        short_term_policies: [
          "Implement tiered water pricing to discourage excessive consumption",
          "Mandate rainwater harvesting in all new residential and commercial buildings",
          "Launch farmer training programs on efficient irrigation techniques"
        ],
        medium_term_projects: [
          "Construct check dams and percolation tanks to enhance groundwater recharge",
          "Renovate traditional water bodies like ponds and stepwells for storage",
          "Install network of water level sensors for comprehensive monitoring"
        ],
        long_term_strategies: [
          "Develop integrated water resource management plan for the region",
          "Establish water security fund for sustainable infrastructure development",
          "Implement aquifer mapping and management for long-term sustainability"
        ],
        budget_estimates: {
          immediate_actions: water_level_status === 'critical' ? '₹50-75 lakh for emergency measures' : '₹20-40 lakh for immediate actions',
          short_term: "₹80-120 lakh for policy implementation and training",
          medium_term: "₹200-400 lakh for infrastructure development",
          total_required: water_level_status === 'critical' ? '₹330-595 lakh comprehensive package' : '₹300-560 lakh phased approach'
        },
        funding_sources: [
          "Atal Bhujal Yojana for groundwater management",
          "MGNREGA funds for water conservation works",
          "Corporate Social Responsibility (CSR) initiatives",
          "District Mineral Foundation (DMF) for affected areas"
        ],
        performance_indicators: [
          "Reduce groundwater extraction by 15% within 6 months",
          "Increase rainwater harvesting coverage by 30% in 1 year",
          "Train minimum 300 farmers in water-efficient practices annually",
          "Establish 5-10 new water monitoring stations",
          "Improve water quality compliance to 90% in affected areas"
        ],
        risk_assessment: {
          current_risk: water_level_status === 'critical' ? 'HIGH - Requires immediate intervention' : water_level_status === 'low' ? 'MEDIUM - Needs preventive action' : 'LOW - Monitor regularly',
          potential_impact: `Affects drinking water security, agricultural productivity, and industrial operations in ${station.address?.village || "the local area"}`,
          mitigation_strategies: [
            "Implement water conservation and demand management",
            "Develop alternative water sources and recharge structures",
            "Strengthen policy framework and community participation"
          ]
        }
      };
    }

    // Add personalized recommendations for users
    if (isUser) {
      fallbackData.personalized_recommendations = {
        greeting: `Hello ${userData.role}, based on your profile and local water conditions`,
        summary: `Water level in your area is ${water_level_status} at ${avg_level.toFixed(2)}m. Daily extraction limit is ${daily_extraction_limit_liters.toLocaleString()} liters.`,
        immediate_actions: [
          "Check all water connections and fix leaks immediately to prevent wastage",
          "Schedule irrigation during early morning or late evening to reduce evaporation",
          "Install water-saving devices like low-flow showerheads and dual-flush toilets"
        ],
        water_conservation: {
          household_tips: [
            "Collect and reuse greywater from washing for gardening purposes",
            "Take shorter showers and turn off taps while brushing or shaving",
            "Use bucket instead of hose for washing vehicles and outdoor cleaning"
          ],
          farm_tips: [
            "Adopt drip or sprinkler irrigation instead of flood irrigation methods",
            "Use organic mulch around plants to retain soil moisture longer",
            "Practice crop rotation with drought-resistant varieties during dry seasons"
          ]
        },
        government_schemes: [
          "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY) for irrigation infrastructure",
          "Atal Jal Yojana for groundwater management in water-stressed areas",
          "MGNREGA water conservation works for rural employment and water security"
        ],
        critical_warning: water_level_status === 'critical' ? 'URGENT: Water level is critically low - reduce consumption immediately' : 
                         water_level_status === 'low' ? 'WARNING: Water level is below normal - implement conservation measures' : 
                         'Water conditions are stable - continue good conservation practices'
      };
    }

    fallbackData.summary = `Water level at ${avg_level.toFixed(2)}m (${water_level_status}). Daily extraction limit: ${daily_extraction_limit_liters.toLocaleString()} liters. ${isPlanner ? 'Policy interventions and infrastructure development recommended.' : 'Water conservation and efficient usage advised.'}`;
    
    fallbackData.metadata = {
      timestamp: new Date().toISOString(),
      ai_error: true,
      error_message: error.message,
      station_id,
      user_role: role,
      analysis_type: isPlanner ? 'Policy Planning' : isUser ? 'Personal Advisory' : 'General',
      fallback_data: true
    };

    console.log("⚠️  Using fallback data");
    cache.set(cacheKey, { data: fallbackData, ts: Date.now() });
    return fallbackData;
  }
}

// Route Handler
async function handler(req, { params }) {
  const { station_id } = await params;
  let role = null;
  let userId = null;

  // Check authorization header
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    try {
      const token = auth.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      role = decoded.role?.toLowerCase();
      userId = decoded.userId;
      console.log("✅ Token decoded. Role:", role, "UserId:", userId);
    } catch (e) {
      console.log("❌ Invalid token:", e.message);
      return NextResponse.json(
        { 
          error: "Authentication failed",
          message: "Invalid or expired token. Please log in again.",
          status: "invalid_token"
        }, 
        { status: 401 }
      );
    }
  }

  // If no authorization header or invalid token, return error
  if (!userId || !role) {
    console.log("🔒 No valid authentication - returning error");
    return NextResponse.json(
      { 
        error: "Authentication required",
        message: "Please log in to access AI recommendations",
        login_required: true,
        benefits: [
          "Personalized farming recommendations",
          "Crop-specific water management",
          "Government scheme information",
          "Policy planning tools"
        ]
      }, 
      { status: 401 }
    );
  }

  // Only make AI call if user is authenticated
  const data = await handleStationAI(station_id, role, userId);
  
  // Check if authentication failed in handleStationAI
  if (data.error === "Authentication required" || data.error === "User not found") {
    return NextResponse.json(data, { status: 401 });
  }
  
  return NextResponse.json(data);
}

export const GET = handler;
export const POST = handler;