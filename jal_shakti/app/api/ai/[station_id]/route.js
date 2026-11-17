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

// Language configurations
const LANGUAGE_MAP = {
  en: "English",
  hi: "Hindi (हिंदी)",
  ta: "Tamil (தமிழ்)",
  te: "Telugu (తెలుగు)",
  bn: "Bengali (বাংলা)",
  mr: "Marathi (मराठी)",
  gu: "Gujarati (ગુજરાતી)",
  kn: "Kannada (ಕನ್ನಡ)",
  ml: "Malayalam (മലയാളം)",
  pa: "Punjabi (ਪੰਜਾਬੀ)",
  or: "Odia (ଓଡ଼ିଆ)",
  as: "Assamese (অসমীয়া)",
};

const getCacheKey = (station_id, role, userId, languageId) => 
  `${station_id}:${role}:${userId || "anon"}:${languageId || "en"}`;

export async function GET(req, context) {
  try {
    const { params } = context;
    const { station_id } = await params;
    
    // Get language from query parameters
    const { searchParams } = new URL(req.url);
    const languageId = searchParams.get("language_id") || "en";
    const languageName = LANGUAGE_MAP[languageId] || "English";

    console.log("\n🚀 [AI Recommendations] ========== NEW REQUEST ==========");
    console.log("🏢 Station ID:", station_id);
    console.log("🌐 Language:", languageName, `(${languageId})`);

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
    const cacheKey = getCacheKey(station_id, role, userId, languageId);
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
    
    console.log("✅ Station found:", station.address.state);

    // ============ STEP 5: FETCH WATER QUALITY & USAGE ============
    console.log("📥 Fetching water quality and usage data...");
    
    const qualityDoc = await mongoose.connection.collection("water-quality").findOne({ station_id });
    const usage = await mongoose.connection.collection("water-usage").findOne({ station_id });
    
    // Extract quality data from nested structure
    let quality = null;
    if (qualityDoc?.water_quality) {
      quality = {
        station_id,
        ph: qualityDoc.water_quality.ph || 7.2,
        tds: qualityDoc.water_quality.total_hardness_mgL || 500,
        ec: qualityDoc.water_quality.ec_uScm || 1000,
        fluoride: qualityDoc.water_quality.f_mgL || 0.8,
        nitrate: qualityDoc.water_quality.no3_mgL || 20,
        arsenic: 0.005,
        total_hardness: qualityDoc.water_quality.total_hardness_mgL,
        year: qualityDoc.water_quality.year
      };
    } else {
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

    // ============ STEP 7: BUILD AI PROMPT WITH LANGUAGE INSTRUCTION ============
    console.log("🤖 Building AI prompt...");
    
    const prompt = `You are a senior water management expert in India. Analyze this groundwater station and provide comprehensive, practical recommendations.

CRITICAL LANGUAGE REQUIREMENT:
- You MUST respond in ${languageName} language ONLY
- ALL text fields in the JSON response must be in ${languageName}
- Field names (keys) remain in English, but all values must be in ${languageName}
- This includes summaries, recommendations, tips, and all descriptive text
- Do NOT use English or any other language for the content

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
Generate practical, actionable recommendations in valid JSON format. ALL TEXT CONTENT MUST BE IN ${languageName}. Water quality data is provided (may include default safe values if actual data was unavailable). All recommendations MUST be:
1. Specific to this station's actual water level (${waterStatus}) and quality
2. Tailored to user's role (${role})
${userProfile ? `3. Personalized for their crops (${userProfile.crops?.join(", ") || "various"}), livestock (${userProfile.livestock?.join(", ") || "none"}), and ${userProfile.landAreaAcres || "their"} acres farm` : "3. General but practical"}
4. Include quantified benefits (liters saved, % reduction, cost savings)
5. Suitable for Indian context (climate, resources, schemes)
6. Written ENTIRELY in ${languageName} language

Return ONLY valid JSON (no markdown, no extra text). JSON structure with English keys but ${languageName} values:

{
  "overall_summary": {
    "water_quality_status": "Analyze in ${languageName} if water is safe/moderate/poor for drinking, irrigation, industrial use. Based on the provided parameters (pH: ${quality.ph}, TDS: ${quality.tds}, Fluoride: ${quality.fluoride}, Nitrate: ${quality.nitrate}, Arsenic: ${quality.arsenic}), determine safety. DO NOT mention 'undefined' - use the actual numeric values provided.",
    "water_availability_status": "Describe in ${languageName} current water level (${avgLevel}m = ${waterStatus} status), sustainability, and extraction capacity (${dailyLimitLiters} L/day). Be specific about whether this is adequate or concerning.",
    "urgent_actions": ["List in ${languageName} 3-4 most critical immediate actions based on water level being ${waterStatus} and the specific quality parameters provided"]
  },
  "water_quality": {
    "status": "safe/moderate/poor in ${languageName}",
    "summary": "Brief assessment in ${languageName}",
    "parameters_analysis": {
      "ph": "${quality.ph}",
      "tds": "${quality.tds}",
      "fluoride": "${quality.fluoride}",
      "nitrate": "${quality.nitrate}",
      "arsenic": "${quality.arsenic}"
    },
    "treatment_needed": ["List in ${languageName} 4-5 specific treatments needed based on ACTUAL parameters"],
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
        "liters": 60,
        "percentage": 40
      },
      "kitchen": {
        "liters": 30,
        "percentage": 20
      },
      "laundry": {
        "liters": 25,
        "percentage": 17
      },
      "cleaning": {
        "liters": 20,
        "percentage": 13
      },
      "outdoor": {
        "liters": 15,
        "percentage": 10
      }
    },
    "conservation_tips": ["Provide in ${languageName} exactly 5 household water conservation tips with quantified savings"]
  },
  ${role === "farmer" || role === "normal citizen" ? `"farmer_recommendations": {
    "crop_suggestions": ["Suggest in ${languageName} 5 water-efficient crops suitable for ${station.address?.district || "this region"}"],
    "irrigation_tips": ["Provide in ${languageName} 5 irrigation optimization tips"],
    "livestock_water_management": ["Provide in ${languageName} 4 tips for efficient livestock water management"],
    "farm_conservation": ["Provide in ${languageName} 5 farm-specific water conservation techniques"],
    "government_schemes": ["List in ${languageName} 3-4 relevant Indian government schemes with brief benefits"],
    "immediate_actions": ["Provide in ${languageName} 5 urgent steps farmers should take"]
  },` : ""}
  ${role === "decision maker" || role === "ground water researcher" || role === "town planner" ? `"policy_recommendations": {
    "executive_summary": "2-3 sentence summary in ${languageName}",
    "immediate_actions": ["5 urgent policy actions in ${languageName}"],
    "short_term_6months": ["4 initiatives in ${languageName}"],
    "medium_term_2years": ["4 projects in ${languageName}"],
    "long_term_5years": ["3 strategic plans in ${languageName}"],
    "infrastructure_needs": ["4 critical projects in ${languageName}"],
    "funding_sources": ["5 funding sources in ${languageName}"],
    "monitoring_requirements": ["4 monitoring measures in ${languageName}"]
  },` : ""}
  "general_recommendations": {
    "water_conservation": ["5 tips in ${languageName}"],
    "community_initiatives": ["4 actions in ${languageName}"],
    "technology_solutions": ["4 solutions in ${languageName}"],
    "cost_saving_measures": ["4 measures in ${languageName}"]
  },
  "seasonal_advice": {
    "monsoon": ["3 actions in ${languageName}"],
    "summer": ["3 tips in ${languageName}"],
    "winter": ["3 preparations in ${languageName}"]
  },
  "metadata": {
    "generated_at": "${new Date().toISOString()}",
    "station_id": "${station_id}",
    "user_role": "${role}",
    "language_id": "${languageId}",
    "language_name": "${languageName}",
    "has_farming_profile": ${!!userProfile},
    "data_completeness": "${quality && usage ? "complete" : quality ? "partial_quality_only" : usage ? "partial_usage_only" : "minimal"}"
  }
}

CRITICAL RULES:
- Return ONLY the JSON object, no markdown, no backticks, no extra text
- JSON keys (field names) remain in English
- ALL text values MUST be in ${languageName} language
- All strings must be properly formatted (no line breaks inside strings)
- All numbers must be unquoted
- DO NOT use the word "undefined" anywhere
- Use realistic Indian values and context
- Be specific to the water situation (${waterStatus} level at ${avgLevel}m)`;

    // ============ STEP 8: CALL GROQ AI ============
    console.log("🚀 Calling Groq AI...");
    
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content: `You are a water management expert. Return ONLY valid JSON. No markdown, no backticks, no extra text. You MUST respond in ${languageName} language - all text content in your JSON response must be in ${languageName}.`
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
      
      // Ensure metadata includes language info
      if (data.metadata) {
        data.metadata.language_id = languageId;
        data.metadata.language_name = languageName;
      }
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
        },
        metadata: {
          language_id: languageId,
          language_name: languageName
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