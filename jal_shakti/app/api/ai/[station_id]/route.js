// app/api/ai/[station_id]/route.js

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";
import User from "@/models/user";
import Groq from "groq-sdk";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const cache = new Map();
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

const getCacheKey = (station_id, role, userId) => `${station_id}:${role}:${userId || "anon"}`;

export async function GET(req, context) {
  try {
    const { params } = context;
    const { station_id } = await params;

    console.log("\n🚀 [AI Recommendations] ========== NEW REQUEST ==========");
    console.log("🏢 Station ID:", station_id);

    if (!station_id) {
      return NextResponse.json({ error: "station_id is required" }, { status: 400 });
    }

    // ============ STEP 1: AUTHENTICATE USER ============
    let userId = null;
    let role = "normal citizen";
    let userProfile = null;

    const auth = req.headers.get("authorization");
    console.log("🔐 Auth header present:", !!auth);

    if (!auth?.startsWith("Bearer ")) {
      console.log("❌ No valid authorization header");
      return NextResponse.json({ error: "Login required. Please provide a valid token." }, { status: 401 });
    }

    try {
      const token = auth.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId || decoded.id;
      role = (decoded.role || "normal citizen").toLowerCase();
      
      console.log("✅ Token verified");
      console.log("👤 User ID:", userId);
      console.log("🎭 Role:", role);
    } catch (e) {
      console.log("❌ Invalid token:", e.message);
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // ============ STEP 2: CHECK CACHE ============
    const cacheKey = getCacheKey(station_id, role, userId);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      console.log("⚡ Returning cached response");
      return NextResponse.json(cached.data);
    }

    // ============ STEP 3: FETCH USER DATA ============
    await dbConnect();
    
    console.log("📥 Fetching user from database...");
    const user = await User.findById(userId).select("role farmingProfile email").lean();
    
    if (!user) {
      console.log("❌ User not found in database");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    console.log("✅ User found:", user.email);
    if (user.farmingProfile) {
      console.log("🌾 Farming profile exists");
      console.log("   - Crops:", user.farmingProfile.crops);
      console.log("   - Livestock:", user.farmingProfile.livestock);
      console.log("   - Land:", user.farmingProfile.landAreaAcres, "acres");
      console.log("   - Irrigation:", user.farmingProfile.irrigationMethod);
      userProfile = user.farmingProfile;
    } else {
      console.log("ℹ️  No farming profile");
    }

    // ============ STEP 4: FETCH STATION DATA ============
    console.log("📥 Fetching station data...");
    const station = await Station.findOne({ station_id }).lean();
    
    if (!station) {
      console.log("❌ Station not found");
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }
    
    console.log("✅ Station found:", station.station_name);

    // ============ STEP 5: FETCH WATER QUALITY & USAGE ============
    console.log("📥 Fetching water quality and usage data...");
    
    const qualityDoc = await mongoose.connection.collection("water-quality").findOne({ station_id });
    const usage = await mongoose.connection.collection("water-usage").findOne({ station_id });
    
    // Extract quality data from nested structure (similar to by-id route)
    let quality = null;
    if (qualityDoc?.water_quality) {
      quality = {
        station_id,
        ph: qualityDoc.water_quality.ph || 7.2,
        tds: qualityDoc.water_quality.total_hardness_mgL || 500, // Using hardness as proxy for TDS
        ec: qualityDoc.water_quality.ec_uScm || 1000,
        fluoride: qualityDoc.water_quality.f_mgL || 0.8,
        nitrate: qualityDoc.water_quality.no3_mgL || 20,
        arsenic: 0.005, // Default safe value
        total_hardness: qualityDoc.water_quality.total_hardness_mgL,
        year: qualityDoc.water_quality.year
      };
    } else {
      // Use safe dummy values if no quality data exists
      console.log("⚠️  No quality data found - using safe dummy values");
      quality = {
        station_id,
        ph: 7.2,
        tds: 500,
        ec: 1000,
        fluoride: 0.8,
        nitrate: 20,
        arsenic: 0.005
      };
    }
    
    console.log("💧 Quality data:", qualityDoc ? "Available" : "Using defaults");
    console.log("   - pH:", quality.ph);
    console.log("   - TDS/Hardness:", quality.tds);
    console.log("   - Fluoride:", quality.fluoride);
    console.log("   - Nitrate:", quality.nitrate);
    console.log("📊 Usage data:", usage ? "Found" : "Not found");

    // ============ STEP 6: CALCULATE METRICS ============
    const latestYear = Math.max(...Object.keys(station.historical_water_levels || {}).map(Number));
    const currentLevels = station.historical_water_levels?.[latestYear] || {};
    const levels = Object.values(currentLevels).filter(Boolean);
    const avgLevel = levels.length ? (levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(2) : 0;

    const waterStatus = avgLevel < 3.5 ? "critical" : avgLevel < 4 ? "low" : "safe";
    const dailyLimitLiters = (station.extraction_infrastructure?.average_extraction_rate_m3_day || 22) * 1000;
    const borewellCount = station.extraction_infrastructure?.borewell_count || 1;
    const bucketsPerBorewell = (dailyLimitLiters / borewellCount / 20).toFixed(2);

    console.log("📊 Calculated metrics:");
    console.log("   - Water level:", avgLevel, "m");
    console.log("   - Status:", waterStatus);
    console.log("   - Daily limit:", dailyLimitLiters, "L");
    console.log("   - Borewells:", borewellCount);

    // ============ STEP 7: BUILD AI PROMPT ============
    console.log("🤖 Building AI prompt...");
    
    const prompt = `You are a senior water management expert in India. Analyze this groundwater station and provide comprehensive, practical recommendations.

STATION DETAILS:
- Name: ${station.station_name || station_id}
- Location: ${station.address?.district || "Unknown"}, ${station.address?.state || "Unknown"}
- Water Level: ${avgLevel}m (Status: ${waterStatus.toUpperCase()})
- Daily Extraction Capacity: ${dailyLimitLiters.toLocaleString()} liters
- Borewells: ${borewellCount} (${bucketsPerBorewell} buckets of 20L each)

WATER QUALITY DATA:
- pH: ${quality.ph} (Safe range: 6.5-8.5)
- TDS/Hardness: ${quality.tds} mg/L (Safe limit: 2000 mg/L)
- EC: ${quality.ec || 'N/A'} µS/cm (Safe limit: 3000 µS/cm)
- Fluoride: ${quality.fluoride} mg/L (Safe limit: 1.5 mg/L)
- Nitrate: ${quality.nitrate} mg/L (Safe limit: 45 mg/L)
- Arsenic: ${quality.arsenic} mg/L (Safe limit: 0.01 mg/L)
${quality.year ? `- Data Year: ${quality.year}` : ''}

WATER USAGE DATA:
${usage ? `- Agriculture: ${usage.agriculture?.total_water_requirement_m3_year || 0} m³/year
- Industrial: ${usage.industries?.total_usage_m3_year || 0} m³/year
- Household: ${usage.domestic?.total_usage_m3_year || 0} m³/year` : "- No usage data available"}

USER PROFILE:
- Role: ${role}
${userProfile ? `- Crops: ${userProfile.crops?.join(", ") || "Not specified"}
- Livestock: ${userProfile.livestock?.join(", ") || "Not specified"}
- Land Area: ${userProfile.landAreaAcres || "Not specified"} acres
- Irrigation: ${userProfile.irrigationMethod || "Not specified"}` : "- No farming profile"}

INSTRUCTIONS:
Generate practical, actionable recommendations in valid JSON format. Water quality data is provided (may include default safe values if actual data was unavailable). All recommendations MUST be:
1. Specific to this station's actual water level (${waterStatus}) and quality
2. Tailored to user's role (${role})
${userProfile ? `3. Personalized for their crops (${userProfile.crops?.join(", ") || "various"}), livestock (${userProfile.livestock?.join(", ") || "none"}), and ${userProfile.landAreaAcres || "their"} acres farm` : "3. General but practical"}
4. Include quantified benefits (liters saved, % reduction, cost savings)
5. Suitable for Indian context (climate, resources, schemes)

Return ONLY valid JSON (no markdown, no extra text):

{
  "overall_summary": {
    "water_quality_status": "Analyze if water is safe/moderate/poor for drinking, irrigation, industrial use. Based on the provided parameters (pH: ${quality.ph}, TDS: ${quality.tds}, Fluoride: ${quality.fluoride}, Nitrate: ${quality.nitrate}, Arsenic: ${quality.arsenic}), determine safety. DO NOT mention 'undefined' - use the actual numeric values provided.",
    "water_availability_status": "Describe current water level (${avgLevel}m = ${waterStatus} status), sustainability, and extraction capacity (${dailyLimitLiters} L/day). Be specific about whether this is adequate or concerning.",
    "urgent_actions": ["List 3-4 most critical immediate actions based on water level being ${waterStatus} and the specific quality parameters provided"]
  },
  "water_quality": {
    "status": "Based on parameters (pH: ${quality.ph}, TDS: ${quality.tds}, Fluoride: ${quality.fluoride}, Nitrate: ${quality.nitrate}), classify as: safe, moderate, or poor",
    "summary": "Brief assessment: All parameters are within/outside safe limits. Be specific.",
    "parameters_analysis": {
      "ph": "pH is ${quality.ph}. This is ${quality.ph >= 6.5 && quality.ph <= 8.5 ? "within safe range (6.5-8.5)" : "outside safe range"}. Impact: [explain]",
      "tds": "TDS is ${quality.tds} mg/L. This is ${quality.tds <= 2000 ? "within safe limit (2000)" : "above safe limit"}. Impact: [explain]",
      "fluoride": "Fluoride is ${quality.fluoride} mg/L. This is ${quality.fluoride <= 1.5 ? "within safe limit (1.5)" : "above safe limit"}. Impact: [explain]",
      "nitrate": "Nitrate is ${quality.nitrate} mg/L. This is ${quality.nitrate <= 45 ? "within safe limit (45)" : "above safe limit"}. Impact: [explain]",
      "arsenic": "Arsenic is ${quality.arsenic} mg/L. This is ${quality.arsenic <= 0.01 ? "within safe limit (0.01)" : "above safe limit"}. Impact: [explain]"
    },
    "treatment_needed": ["Based on the ACTUAL parameters above, list 4-5 specific treatments needed. If all parameters are safe, list general maintenance/monitoring recommendations"],
    "safe_for": {
      "drinking": ${quality.ph >= 6.5 && quality.ph <= 8.5 && quality.tds <= 2000 && quality.fluoride <= 1.5 && quality.nitrate <= 45 && quality.arsenic <= 0.01},
      "irrigation": ${quality.arsenic <= 0.01 && quality.tds <= 3000},
      "industrial": ${quality.tds <= 3000}
    }
  },
  "key_metrics": {
    "daily_extraction_limit_liters": ${dailyLimitLiters},
    "buckets_per_borewell": ${parseFloat(bucketsPerBorewell)},
    "water_level_status": "${waterStatus}",
    "average_water_level_m": ${parseFloat(avgLevel)},
    "household_daily_requirement_liters": 150,
    "agriculture_yearly_m3": ${usage?.agriculture?.total_water_requirement_m3_year || 0},
    "industrial_yearly_m3": ${usage?.industries?.total_usage_m3_year || 0}
  },
  "household_water_usage": {
    "daily_breakdown": {
      "bathroom": {
        "liters": "Provide typical daily liters (number)",
        "percentage": "Calculate % of total (number)",
        "activities": ["List 3-4 bathroom activities with consumption"]
      },
      "kitchen": {
        "liters": "Provide typical daily liters (number)",
        "percentage": "Calculate % (number)",
        "activities": ["List 3-4 kitchen activities"]
      },
      "laundry": {
        "liters": "Provide typical daily liters (number)",
        "percentage": "Calculate % (number)",
        "activities": ["List 2-3 laundry activities"]
      },
      "cleaning": {
        "liters": "Provide typical daily liters (number)",
        "percentage": "Calculate % (number)",
        "activities": ["List 2-3 cleaning activities"]
      },
      "outdoor": {
        "liters": "Provide typical daily liters (number)",
        "percentage": "Calculate % (number)",
        "activities": ["List 2-3 outdoor activities"]
      }
    },
    "conservation_tips": {
      "bathroom": ["5 specific bathroom water saving tips with quantified savings"],
      "kitchen": ["5 kitchen water conservation tips"],
      "laundry": ["5 laundry tips"],
      "cleaning": ["4 cleaning tips"],
      "outdoor": ["5 outdoor/garden tips"]
    }
  },
  ${role === "farmer" || role === "normal citizen" ? `"farmer_recommendations": {
    "crop_suggestions": ["Suggest 5 water-efficient crops suitable for ${station.address?.district || "this region"}, considering ${waterStatus} water status${userProfile?.crops ? ` - especially alternatives or complements to current crops: ${userProfile.crops.join(", ")}` : ""}"],
    "irrigation_tips": ["5 irrigation optimization tips${userProfile?.irrigationMethod ? ` for ${userProfile.irrigationMethod} irrigation system` : ""}, considering ${waterStatus} water availability"],
    "livestock_water_management": ["4 tips for efficient livestock water management${userProfile?.livestock?.length ? ` for ${userProfile.livestock.join(", ")}` : ""}"],
    "farm_conservation": ["5 farm-specific water conservation techniques${userProfile?.landAreaAcres ? ` suitable for ${userProfile.landAreaAcres} acres` : ""}"],
    "government_schemes": ["List 3-4 relevant Indian government schemes with brief benefits and eligibility"],
    "immediate_actions": ["5 urgent steps farmers should take given ${waterStatus} water status"]
  },` : ""}
  ${role === "decision maker" || role === "ground water researcher" || role === "town planner" ? `"policy_recommendations": {
    "executive_summary": "2-3 sentence summary of water situation requiring policy intervention",
    "immediate_actions": ["5 urgent policy/regulatory actions needed for ${waterStatus} water level and current quality"],
    "short_term_6months": ["4 initiatives for next 6 months"],
    "medium_term_2years": ["4 projects for 1-2 years"],
    "long_term_5years": ["3 strategic long-term plans"],
    "infrastructure_needs": ["4 critical infrastructure projects needed"],
    "funding_sources": ["List 5 Indian government schemes/funding sources for water projects"],
    "monitoring_requirements": ["4 monitoring and compliance measures"]
  },` : ""}
  "general_recommendations": {
    "water_conservation": ["5 general water conservation tips for everyone"],
    "community_initiatives": ["4 community-level actions"],
    "technology_solutions": ["4 modern tech solutions accessible in India"],
    "cost_saving_measures": ["4 measures with estimated savings/ROI"]
  },
  "seasonal_advice": {
    "monsoon": ["3 monsoon-specific actions"],
    "summer": ["3 summer water management tips"],
    "winter": ["3 winter preparations"]
  },
  "metadata": {
    "generated_at": "${new Date().toISOString()}",
    "station_id": "${station_id}",
    "user_role": "${role}",
    "has_farming_profile": ${!!userProfile},
    "data_completeness": "${quality && usage ? "complete" : quality ? "partial_quality_only" : usage ? "partial_usage_only" : "minimal"}"
  }
}

CRITICAL RULES:
- Return ONLY the JSON object, no markdown, no backticks, no extra text
- All strings must be properly formatted (no line breaks inside strings)
- All numbers must be unquoted
- DO NOT use the word "undefined" anywhere - all parameters have actual numeric values
- Use the provided numeric values: pH=${quality.ph}, TDS=${quality.tds}, Fluoride=${quality.fluoride}, Nitrate=${quality.nitrate}, Arsenic=${quality.arsenic}
- Use realistic Indian values and context
- Be specific to the water situation (${waterStatus} level at ${avgLevel}m)
- Tailor to user's profile and role (${role})${userProfile ? ` with ${userProfile.crops?.join(", ") || "crops"} on ${userProfile.landAreaAcres} acres` : ""}`;

    // ============ STEP 8: CALL GROQ AI ============
    console.log("🚀 Calling Groq AI...");
    
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a water management expert. Return ONLY valid JSON. No markdown, no backticks, no extra text."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 4500,
      response_format: { type: "json_object" }
    });

    let raw = completion.choices[0]?.message?.content?.trim() || "{}";
    console.log("✅ AI response received, length:", raw.length);

    // ============ STEP 9: PARSE AI RESPONSE ============
    raw = raw.replace(/```json|```/g, "").replace(/\\n/g, " ").trim();

    let data;
    try {
      data = JSON.parse(raw);
      console.log("✅ JSON parsed successfully");
    } catch (parseError) {
      console.error("❌ JSON Parse Error:", parseError.message);
      
      // Fallback response
      data = {
        error: "AI generated invalid response",
        overall_summary: {
          water_quality_status: quality ? `Water quality requires attention. Key parameters: pH ${quality.ph}, TDS ${quality.tds}, Fluoride ${quality.fluoride}, Nitrate ${quality.nitrate}` : "No quality data available",
          water_availability_status: `Water level at ${avgLevel}m is ${waterStatus}. Daily extraction capacity: ${dailyLimitLiters.toLocaleString()} liters across ${borewellCount} borewells.`,
          urgent_actions: [
            "Conduct comprehensive water quality testing",
            "Implement water conservation measures immediately",
            "Monitor extraction rates to prevent over-exploitation"
          ]
        },
        key_metrics: {
          daily_extraction_limit_liters: dailyLimitLiters,
          buckets_per_borewell: parseFloat(bucketsPerBorewell),
          water_level_status: waterStatus,
          average_water_level_m: parseFloat(avgLevel),
          household_daily_requirement_liters: 150,
          agriculture_yearly_m3: usage?.agriculture?.total_water_requirement_m3_year || 0,
          industrial_yearly_m3: usage?.industries?.total_usage_m3_year || 0
        }
      };
    }

    // ============ STEP 10: CACHE AND RETURN ============
    cache.set(cacheKey, { data, ts: Date.now() });
    console.log("💾 Response cached");
    console.log("========================================\n");

    return NextResponse.json(data);

  } catch (error) {
    console.error("❌ [AI Recommendations] Error:", error);
    console.error(error.stack);
    return NextResponse.json(
      { 
        error: "Failed to generate recommendations", 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}