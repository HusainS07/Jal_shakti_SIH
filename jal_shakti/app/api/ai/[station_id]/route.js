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
const LANGUAGES = {
  en: { name: "English", instruction: "Respond in English" },
  hi: { name: "Hindi", instruction: "Respond in Hindi (हिंदी). Use Devanagari script." },
  ta: { name: "Tamil", instruction: "Respond in Tamil (தமிழ்). Use Tamil script." },
  te: { name: "Telugu", instruction: "Respond in Telugu (తెలుగు). Use Telugu script." },
  kn: { name: "Kannada", instruction: "Respond in Kannada (ಕನ್ನಡ). Use Kannada script." },
  ml: { name: "Malayalam", instruction: "Respond in Malayalam (മലയാളം). Use Malayalam script." },
  mr: { name: "Marathi", instruction: "Respond in Marathi (मराठी). Use Devanagari script." },
  gu: { name: "Gujarati", instruction: "Respond in Gujarati (ગુજરાતી). Use Gujarati script." },
  bn: { name: "Bengali", instruction: "Respond in Bengali (বাংলা). Use Bengali script." },
  pa: { name: "Punjabi", instruction: "Respond in Punjabi (ਪੰਜਾਬੀ). Use Gurmukhi script." }
};

const getCacheKey = (station_id, role, userId, language) => 
  `${station_id}:${role}:${userId || "anon"}:${language}`;

export async function GET(req, context) {
  try {
    const { params } = context;
    const { station_id } = await params;
    const { searchParams } = new URL(req.url);
    const language = searchParams.get("language") || "en";

    console.log("\n🚀 [AI Recommendations] ========== NEW REQUEST ==========");
    console.log("🏢 Station ID:", station_id);
    console.log("🌐 Language:", language, `(${LANGUAGES[language]?.name || "Unknown"})`);

    if (!station_id) {
      return NextResponse.json({ error: "station_id is required" }, { status: 400 });
    }

    if (!LANGUAGES[language]) {
      return NextResponse.json({ 
        error: `Unsupported language: ${language}. Supported languages: ${Object.keys(LANGUAGES).join(", ")}` 
      }, { status: 400 });
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
    const cacheKey = getCacheKey(station_id, role, userId, language);
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

    // ============ STEP 7: BUILD AI PROMPT WITH LANGUAGE ============
    console.log("🤖 Building AI prompt...");
    
    const languageInstruction = LANGUAGES[language].instruction;
    
    const prompt = `${languageInstruction}

You are a senior water management expert in India. Analyze this groundwater station and provide comprehensive, practical recommendations.

IMPORTANT: All text content in your response must be in ${LANGUAGES[language].name}. However, keep all JSON keys in English, and keep numeric values as numbers (not translated text).

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
Generate practical, actionable recommendations in ${LANGUAGES[language].name}. All text content (descriptions, recommendations, summaries) must be in ${LANGUAGES[language].name}, but JSON keys must remain in English.

Return ONLY valid JSON format:

{
  "overall_summary": {
    "water_quality_status": "IN ${LANGUAGES[language].name}: Analyze if water is safe/moderate/poor based on pH: ${quality.ph}, TDS: ${quality.tds}, Fluoride: ${quality.fluoride}, Nitrate: ${quality.nitrate}, Arsenic: ${quality.arsenic}",
    "water_availability_status": "IN ${LANGUAGES[language].name}: Describe current water level (${avgLevel}m = ${waterStatus} status), sustainability, and extraction capacity",
    "urgent_actions": ["IN ${LANGUAGES[language].name}: List 3-4 most critical immediate actions"]
  },
  "water_quality": {
    "status": "${quality.ph >= 6.5 && quality.ph <= 8.5 && quality.tds <= 2000 && quality.fluoride <= 1.5 && quality.nitrate <= 45 && quality.arsenic <= 0.01 ? 'safe' : (quality.tds > 2000 || quality.fluoride > 1.5 || quality.nitrate > 45 || quality.arsenic > 0.01) ? 'poor' : 'moderate'}",
    "summary": "IN ${LANGUAGES[language].name}: Brief assessment of water quality",
    "parameters_analysis": {
      "ph": "${quality.ph}",
      "tds": "${quality.tds}",
      "fluoride": "${quality.fluoride}",
      "nitrate": "${quality.nitrate}",
      "arsenic": "${quality.arsenic}"
    },
    "treatment_needed": ["IN ${LANGUAGES[language].name}: List 4-5 specific treatments needed"],
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
    "conservation_tips": ["IN ${LANGUAGES[language].name}: Provide exactly 5 household water conservation tips with quantified savings"]
  },
  ${role === "farmer" || role === "normal citizen" ? `"farmer_recommendations": {
    "crop_suggestions": ["IN ${LANGUAGES[language].name}: Suggest 5 water-efficient crops"],
    "irrigation_tips": ["IN ${LANGUAGES[language].name}: 5 irrigation optimization tips"],
    "livestock_water_management": ["IN ${LANGUAGES[language].name}: 4 tips for efficient livestock water management"],
    "farm_conservation": ["IN ${LANGUAGES[language].name}: 5 farm-specific water conservation techniques"],
    "government_schemes": ["IN ${LANGUAGES[language].name}: List 3-4 relevant Indian government schemes"],
    "immediate_actions": ["IN ${LANGUAGES[language].name}: 5 urgent steps farmers should take"]
  },` : ""}
  ${role === "decision maker" || role === "ground water researcher" || role === "town planner" ? `"policy_recommendations": {
    "executive_summary": "IN ${LANGUAGES[language].name}: 2-3 sentence summary",
    "immediate_actions": ["IN ${LANGUAGES[language].name}: 5 urgent policy actions"],
    "short_term_6months": ["IN ${LANGUAGES[language].name}: 4 initiatives for next 6 months"],
    "medium_term_2years": ["IN ${LANGUAGES[language].name}: 4 projects for 1-2 years"],
    "long_term_5years": ["IN ${LANGUAGES[language].name}: 3 strategic long-term plans"],
    "infrastructure_needs": ["IN ${LANGUAGES[language].name}: 4 critical infrastructure projects"],
    "funding_sources": ["IN ${LANGUAGES[language].name}: List 5 Indian government schemes"],
    "monitoring_requirements": ["IN ${LANGUAGES[language].name}: 4 monitoring measures"]
  },` : ""}
  "general_recommendations": {
    "water_conservation": ["IN ${LANGUAGES[language].name}: 5 general water conservation tips"],
    "community_initiatives": ["IN ${LANGUAGES[language].name}: 4 community-level actions"],
    "technology_solutions": ["IN ${LANGUAGES[language].name}: 4 modern tech solutions"],
    "cost_saving_measures": ["IN ${LANGUAGES[language].name}: 4 measures with estimated savings"]
  },
  "seasonal_advice": {
    "monsoon": ["IN ${LANGUAGES[language].name}: 3 monsoon-specific actions"],
    "summer": ["IN ${LANGUAGES[language].name}: 3 summer water management tips"],
    "winter": ["IN ${LANGUAGES[language].name}: 3 winter preparations"]
  },
  "metadata": {
    "generated_at": "${new Date().toISOString()}",
    "station_id": "${station_id}",
    "user_role": "${role}",
    "language": "${language}",
    "language_name": "${LANGUAGES[language].name}",
    "has_farming_profile": ${!!userProfile},
    "data_completeness": "${quality && usage ? "complete" : quality ? "partial_quality_only" : usage ? "partial_usage_only" : "minimal"}"
  }
}

CRITICAL RULES:
- ALL text content (descriptions, recommendations, tips) MUST be in ${LANGUAGES[language].name}
- Keep JSON keys in English
- Keep numbers as numbers (not text)
- Return ONLY the JSON object, no markdown, no backticks
- Use realistic Indian context`;

    // ============ STEP 8: CALL GROQ AI ============
    console.log("🚀 Calling Groq AI...");
    
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a water management expert. Return ONLY valid JSON. All text content must be in ${LANGUAGES[language].name}, but JSON keys must remain in English. No markdown, no backticks.`
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