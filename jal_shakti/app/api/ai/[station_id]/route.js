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

// Helper function to generate fallback reasoning
function generateFallbackReasoning(role, userProfile, avgLevel, waterStatus, quality, dailyLimitLiters, borewellCount, station) {
  return {
    role_based_justification: `These recommendations are specifically designed for ${role}s who need to make informed decisions about groundwater management. As a ${role}, you have unique responsibilities in water resource planning, policy implementation, and ensuring sustainable use. Unlike general users, your role requires understanding technical parameters, long-term trends, and policy implications of water management decisions.`,
    
    profile_based_customization: userProfile && (userProfile.crops?.length > 0 || userProfile.livestock?.length > 0) ? 
      `Your farming profile with ${userProfile.crops?.join(", ") || "various"} crops, ${userProfile.livestock?.join(", ") || "livestock"}, ${userProfile.landAreaAcres || "your"} acres of land, and ${userProfile.irrigationMethod} irrigation method has directly shaped these recommendations. The water requirements for ${userProfile.crops?.[0] || "your crops"} are specifically considered, along with livestock water needs and the efficiency of your current irrigation system.` :
      `Since you haven't added detailed farming information (crops, livestock) to your profile yet, we've provided general recommendations applicable to most ${role}s. These recommendations can become much more specific and valuable if you add details about your agricultural activities in your profile settings.`,
    
    station_conditions_impact: `The current water level of ${avgLevel}m indicates a ${waterStatus} status, which directly influences the urgency of our recommendations. With water quality parameters showing pH ${quality.ph}, TDS ${quality.tds} mg/L, and Fluoride ${quality.fluoride} mg/L, we've tailored specific treatment and monitoring suggestions. The daily extraction capacity of ${dailyLimitLiters.toLocaleString()} liters determines the scale of conservation measures needed. These local conditions make our recommendations more actionable than generic advice.`,
    
    comparison_to_generic: `Unlike generic water management guides that provide one-size-fits-all solutions, these recommendations are calibrated to your specific role as ${role}, the actual water conditions at this station (${waterStatus} level with specific quality parameters), and your location in ${station.address?.district || "this region"}. This personalization means the advice is directly applicable to your situation rather than requiring interpretation or adaptation.`,
    
    key_personalization_factors: [
      `User Role: ${role} - requiring technical depth and policy perspective`,
      userProfile && (userProfile.crops?.length > 0 || userProfile.livestock?.length > 0) ? 
        `Agricultural Profile: ${userProfile.crops?.join(", ") || "crops"} with ${userProfile.irrigationMethod} irrigation` : 
        `General recommendations (minimal farming profile provided)`,
      `Local Water Status: ${waterStatus} level at ${avgLevel}m requiring ${waterStatus === 'critical' ? 'urgent' : waterStatus === 'low' ? 'immediate' : 'preventive'} action`,
      `Regional Context: ${station.address?.district || "This"} district with specific climatic and geological characteristics`,
      `Infrastructure Constraints: ${dailyLimitLiters.toLocaleString()}L/day extraction capacity across ${borewellCount} borewells`,
      `Water Quality Profile: pH ${quality.ph}, TDS ${quality.tds} mg/L, Fluoride ${quality.fluoride} mg/L requiring specific treatments`
    ]
  };
}

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

    // ============ STEP 2: FETCH USER DATA (BEFORE CACHE CHECK) ============
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
      userProfile = user.farmingProfile;
    }

    // ============ STEP 3: FETCH STATION DATA ============
    console.log("📥 Fetching station data...");
    const station = await Station.findOne({ station_id }).lean();
    
    if (!station) {
      console.log("❌ Station not found");
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    // ============ STEP 4: FETCH WATER QUALITY & USAGE ============
    const qualityDoc = await mongoose.connection.collection("water-quality").findOne({ station_id });
    const usage = await mongoose.connection.collection("water-usage").findOne({ station_id });
    
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
      };
    } else {
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

    // ============ STEP 5: CALCULATE METRICS ============
    const latestYear = Math.max(...Object.keys(station.historical_water_levels || {}).map(Number));
    const currentLevels = station.historical_water_levels?.[latestYear] || {};
    const levels = Object.values(currentLevels).filter(Boolean);
    const avgLevel = levels.length ? (levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(2) : 0;

    const waterStatus = avgLevel < 3.5 ? "critical" : avgLevel < 4 ? "low" : "safe";
    const dailyLimitLiters = (station.extraction_infrastructure?.average_extraction_rate_m3_day || 22) * 1000;
    const borewellCount = station.extraction_infrastructure?.borewell_count || 1;
    const bucketsPerBorewell = (dailyLimitLiters / borewellCount / 20).toFixed(2);

    // ============ STEP 6: CHECK CACHE (AFTER METRICS CALCULATED) ============
    const cacheKey = getCacheKey(station_id, role, userId, languageId);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      console.log("⚡ Returning cached response");
      
      // Add reasoning if missing
      if (!cached.data.personalization_reasoning) {
        cached.data.personalization_reasoning = generateFallbackReasoning(
          role, userProfile, avgLevel, waterStatus, quality, dailyLimitLiters, borewellCount, station
        );
      }
      
      return NextResponse.json(cached.data);
    }

    // ============ STEP 7: BUILD AI PROMPT ============
    const prompt = `You are a senior water management expert in India. Analyze this groundwater station and provide comprehensive, practical recommendations.

⚠️ CRITICAL REQUIREMENT: You MUST include a "personalization_reasoning" section as the FIRST field in your JSON response.

STATION DETAILS:
- Name: ${station.station_name || station_id}
- Location: ${station.address?.district || "Unknown"}, ${station.address?.state || "Unknown"}
- Water Level: ${avgLevel}m (Status: ${waterStatus.toUpperCase()})
- Daily Extraction Capacity: ${dailyLimitLiters.toLocaleString()} liters

WATER QUALITY: pH ${quality.ph}, TDS ${quality.tds} mg/L, Fluoride ${quality.fluoride} mg/L, Nitrate ${quality.nitrate} mg/L

USER PROFILE:
- Role: ${role}
${userProfile ? `- Crops: ${userProfile.crops?.join(", ") || "Not specified"}
- Livestock: ${userProfile.livestock?.join(", ") || "Not specified"}
- Land: ${userProfile.landAreaAcres || "Not specified"} acres
- Irrigation: ${userProfile.irrigationMethod || "Not specified"}` : "- No farming profile"}

Return ONLY valid JSON with this structure:

{
  "personalization_reasoning": {
    "role_based_justification": "3-4 sentences explaining WHY these recommendations are specifically for a ${role}. How does their role differ from others?",
    "profile_based_customization": "${userProfile ? `Explain how the user's crops (${userProfile.crops?.join(", ")}), livestock, land size (${userProfile.landAreaAcres} acres), and irrigation (${userProfile.irrigationMethod}) shaped these recommendations.` : "Explain that general recommendations are provided due to no farming profile, but can be personalized if they add profile details."}",
    "station_conditions_impact": "Explain how water level at ${avgLevel}m (${waterStatus}), quality parameters (pH: ${quality.ph}, TDS: ${quality.tds}, Fluoride: ${quality.fluoride}), and extraction capacity (${dailyLimitLiters}L/day) influenced these recommendations.",
    "comparison_to_generic": "2-3 sentences on what makes these recommendations MORE USEFUL than generic water management advice. Be specific.",
    "key_personalization_factors": [
      "User role (${role}) and specific needs",
      "${userProfile ? `Specific crops/livestock requiring tailored management` : `No farming profile - general recommendations`}",
      "Local water conditions (${waterStatus} level, quality)",
      "Regional context (${station.address?.district || "this"} district)",
      "Extraction capacity and infrastructure limits"
    ]
  },
  "overall_summary": {
    "water_quality_status": "Analyze if water is safe/moderate/poor based on pH: ${quality.ph}, TDS: ${quality.tds}, Fluoride: ${quality.fluoride}, Nitrate: ${quality.nitrate}",
    "water_availability_status": "Describe water level (${avgLevel}m = ${waterStatus}), sustainability, extraction capacity (${dailyLimitLiters}L/day)",
    "urgent_actions": ["3-4 critical actions based on ${waterStatus} level and quality"]
  },
  "water_quality": {
    "status": "safe/moderate/poor",
    "summary": "Brief assessment",
    "parameters_analysis": {
      "ph": "${quality.ph}",
      "tds": "${quality.tds}",
      "fluoride": "${quality.fluoride}",
      "nitrate": "${quality.nitrate}",
      "arsenic": "${quality.arsenic}"
    },
    "treatment_needed": ["4-5 treatments"],
    "safe_for": {
      "drinking": ${quality.ph >= 6.5 && quality.ph <= 8.5 && quality.tds <= 2000 && quality.fluoride <= 1.5},
      "irrigation": ${quality.tds <= 3000},
      "industrial": ${quality.tds <= 3000}
    }
  },
  "key_metrics": {
    "daily_extraction_limit_liters": ${dailyLimitLiters},
    "buckets_per_borewell": ${parseFloat(bucketsPerBorewell)},
    "water_level_status": "${waterStatus}",
    "average_water_level_m": ${parseFloat(avgLevel)}
  },
  ${role === "farmer" || role === "normal citizen" ? `"farmer_recommendations": {
    "crop_suggestions": ["5 water-efficient crops for ${station.address?.district}"],
    "irrigation_tips": ["5 optimization tips"],
    "immediate_actions": ["5 urgent steps"]
  },` : ""}
  ${role === "decision maker" || role === "ground water researcher" || role === "town planner" ? `"policy_recommendations": {
    "executive_summary": "2-3 sentence summary",
    "immediate_actions": ["5 urgent policy actions"],
    "infrastructure_needs": ["4 critical projects"]
  },` : ""}
  "general_recommendations": {
    "water_conservation": ["5 tips"],
    "community_initiatives": ["4 actions"]
  },
  "metadata": {
    "generated_at": "${new Date().toISOString()}",
    "station_id": "${station_id}",
    "user_role": "${role}"
  }
}`;

    // ============ STEP 8: CALL GROQ AI ============
    let data;
    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a water management expert. Return ONLY valid JSON. The personalization_reasoning field MUST be the first field."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 4500,
        response_format: { type: "json_object" }
      });

      let raw = completion.choices[0]?.message?.content?.trim() || "{}";
      raw = raw.replace(/```json|```/g, "").trim();

      data = JSON.parse(raw);
      
      // FORCE ADD REASONING IF MISSING
      if (!data.personalization_reasoning) {
        console.log("⚠️  AI didn't provide reasoning - generating fallback");
        data.personalization_reasoning = generateFallbackReasoning(
          role, userProfile, avgLevel, waterStatus, quality, dailyLimitLiters, borewellCount, station
        );
      }
      
    } catch (error) {
      console.error("❌ AI Error:", error.message);
      
      // Fallback with reasoning
      data = {
        personalization_reasoning: generateFallbackReasoning(
          role, userProfile, avgLevel, waterStatus, quality, dailyLimitLiters, borewellCount, station
        ),
        overall_summary: {
          water_quality_status: `Water quality: pH ${quality.ph}, TDS ${quality.tds} mg/L`,
          water_availability_status: `Water level: ${avgLevel}m (${waterStatus})`,
          urgent_actions: ["Monitor water quality", "Implement conservation measures"]
        },
        key_metrics: {
          daily_extraction_limit_liters: dailyLimitLiters,
          water_level_status: waterStatus,
          average_water_level_m: parseFloat(avgLevel)
        },
        metadata: {
          generated_at: new Date().toISOString(),
          fallback_mode: true
        }
      };
    }

    // ============ STEP 9: CACHE AND RETURN ============
    cache.set(cacheKey, { data, ts: Date.now() });
    return NextResponse.json(data);

  } catch (error) {
    console.error("❌ [AI Recommendations] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations", details: error.message }, 
      { status: 500 }
    );
  }
}