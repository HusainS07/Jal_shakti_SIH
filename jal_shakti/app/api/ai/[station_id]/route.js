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

async function handleStationAI(station_id, role = null, userId = null) {
  console.log("\n🔍 [AI API] ========== NEW REQUEST ==========");
  console.log("🏢 Station ID:", station_id);
  console.log("👤 Role:", role);
  console.log("🆔 UserId:", userId);
  
  const cacheKey = getCacheKey(station_id, role, userId);

  // Cache check
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    console.log("⚡ Cache hit! Returning cached data");
    return cached.data;
  }
  console.log("📦 No cache - fetching from DB");

  await dbConnect();

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

  // Fetch personal farming profile
  let farmingProfile = null;
  if (userId && isUser) {
    console.log("\n🚜 [AI API] Fetching farming profile for user:", userId);
    const user = await User.findById(userId).select("farmingProfile").lean();
    if (user) {
      console.log("  ✅ User found in DB");
      if (user.farmingProfile) {
        farmingProfile = user.farmingProfile;
        console.log("  ✅ Farming profile found!");
        console.log("  📋 Profile data:", JSON.stringify(farmingProfile, null, 2));
      } else {
        console.log("  ⚠️  User exists but NO farming profile saved");
      }
    } else {
      console.log("  ❌ User NOT found in DB:", userId);
    }
  } else {
    console.log("\n⏭️  [AI API] Skipping profile fetch:");
    if (!userId) console.log("  - No userId provided");
    if (!isUser) console.log("  - Not a user role (role:", role, ")");
  }

  const baseData = {
    daily_extraction_limit_liters,
    buckets_per_borewell: Number(buckets_per_borewell.toFixed(2)),
    water_level_status,
    household_water_liters: 150,
    agriculture_water_m3_year: usage?.agriculture?.total_water_requirement_m3_year || 0,
    industrial_extraction_limit_m3_year: usage?.industries?.total_usage_m3_year || 0,
  };

  // Build Prompt Step-by-Step (no if inside template)
  let prompt = `You are a senior groundwater expert from India. Speak in simple Hindi + English mix.

Current situation:
- Water level: ${water_level_status}
- Daily safe limit: ${daily_extraction_limit_liters.toLocaleString()} liters (~${baseData.buckets_per_borewell} buckets per borewell)
- Water quality: ${quality?.fluoride > 1.5 ? "High fluoride" : "Normal"}\n`;

  if (farmingProfile) {
    const crops = farmingProfile.crops?.length ? farmingProfile.crops.join(", ") : "no crops";
    const animals = farmingProfile.livestock?.length ? farmingProfile.livestock.join(", ") : "no animals";
    const land = farmingProfile.landAreaAcres ? `${farmingProfile.landAreaAcres} acres` : "unknown area";
    const irrig = {
      flood: "flood irrigation",
      drip: "drip irrigation",
      sprinkler: "sprinkler",
      rainfed: "only rainfed",
    }[farmingProfile.irrigationMethod || "flood"];

    prompt += `This farmer has:
- Crops: ${crops}
- Animals: ${animals}
- Land: ${land}
- Irrigation: ${irrig}

Give highly personalized advice based on their actual farm.\n`;
  }

  prompt += `
Return ONLY valid JSON with this exact structure:
{
  "daily_extraction_limit_liters": ${baseData.daily_extraction_limit_liters},
  "buckets_per_borewell": ${baseData.buckets_per_borewell},
  "water_level_status": "${baseData.water_level_status}",
  "household_water_liters": ${baseData.household_water_liters},
  "agriculture_water_m3_year": ${baseData.agriculture_water_m3_year},
  "industrial_extraction_limit_m3_year": ${baseData.industrial_extraction_limit_m3_year}`;

  if (isUser) {
    const profileJSON = JSON.stringify(farmingProfile || {});
    prompt += `,
  "personal_advice": {
    "message_to_farmer": "Generate personalized greeting in English based on their farm profile",
    "your_profile": ${profileJSON},
    "immediate_actions": ["Generate 3-5 specific actionable steps as an array of strings based on their crops, livestock, land, and irrigation"],
    "crop_recommendations": {
      "your_current_crops": "List their crops (${farmingProfile?.crops?.join(", ") || "none"})",
      "personalized_advice": "Analyze their current crops and recommend water-efficient companions and rotations",
      "recommended_additions": ["List 3-5 recommended water-efficient companion crops as an array"],
      "avoid_in_dry_season": ["List 3-4 crops to avoid in dry season as an array"],
      "water_efficient_varieties": "Give water-efficient tips for their crops"
    },
    "irrigation_tips": {
      "method": "${farmingProfile?.irrigationMethod || "unknown"}",
      "tips": ["Generate 3-5 specific actionable tips for their irrigation method as an array"]
    },
    "livestock_care": {
      "animals": "${farmingProfile?.livestock?.join(", ") || "none"}",
      "tips": ["Generate 3-5 specific water management and care tips for their livestock as an array"]
    },
    "rainwater_harvesting": {
      "farm_size": "${farmingProfile?.landAreaAcres} acres",
      "solutions": ["Generate 3-4 practical rainwater harvesting solutions for their farm size as an array"]
    },
    "government_schemes": ["List 3-4 relevant government schemes and subsidies as an array"],
    "critical_warning": "If water level is ${water_level_status}, provide appropriate warnings"
  },
  "general_conservation_tips": {
    "household": ["Generate 5 household water-saving tips as array of strings"],
    "agriculture": ["Generate 5 agricultural conservation tips as array of strings"],
    "livestock": ["Generate 5 livestock water management tips as array of strings"]
  }`;
  }

    if (isPlanner) {
    prompt += `,
  "planner_recommendations": {
    "immediate_actions": [
      "Declare water alert zone if level < 4m",
      "Restrict industrial extraction by 30%",
      "Mandate water audits for all large users",
      "Activate rainwater harvesting in 100+ structures"
    ],
    "policy_interventions": {
      "industrial_limits": "Cap at 50,000 m³/year per unit - fine ₹10 lac + closure for violations",
      "agricultural_regulation": "Ensure drip/sprinkler on >60% of irrigated area by 2026",
      "domestic_incentives": "Rebate for RWH + low-flow fixtures (50% subsidy)",
      "well_registration": "Track all borewells via GPS - penalize unregistered drilling"
    },
    "recharge_infrastructure": {
      "johads_and_tanks": "Renovate 50+ traditional structures - restore 5+ crore liters capacity",
      "check_dams": "Build 20+ check dams on seasonal nallas to slow runoff",
      "percolation_ponds": "One per 500 hectares in agriculture zones",
      "injection_wells": "Install 5-10 in urban areas for excess monsoon runoff",
      "rooftop_harvesting": "Mandate in all new buildings - can harvest 4 lac liters/year per structure"
    },
    "irrigation_modernization": {
      "drip_subsidy": "50-60% government support for farmers <5 acres",
      "soil_moisture_sensors": "Provide 1000 sensors to farmer groups - data-driven scheduling",
      "crop_shift_program": "Incentivize bajra, moong, gram instead of rice/sugarcane",
      "farmer_training": "Monthly water-saving workshops in 20+ villages",
      "irrigation_scheduling": "Coordinate water release with weather forecasts"
    },
    "water_quality_management": {
      "fluoride_mitigation": "Install RO plants in 10+ villages if F > 1.5 mg/L",
      "monitoring": "Quarterly testing of 50+ wells across district",
      "treatment_plants": "Subsidize household filters - ₹5000 rebate per unit"
    },
    "future_projections": {
      "demand_2030": "Demand will rise 35% - from current to ${daily_extraction_limit_liters * 1.35} liters/day",
      "demand_2040": "Projected 60% increase - urgent large-scale intervention needed",
      "risk_assessment": "${water_level_status === 'critical' ? 'CRITICAL: Decline of 2-3m/year expected' : 'Monitor closely - trend shows ' + (avg_level < 4 ? 'declining' : 'stable') + ' levels'}",
      "intervention_urgency": "Begin recharge + regulation NOW to prevent crisis by 2030"
    },
    "financing": {
      "government_schemes": ["PMKSY-AIBP", "Atal Jal Yojana", "MGNREGA for water structures", "CSR funds from industries"],
      "estimated_cost": "₹500-800 lac for comprehensive district-level program",
      "community_funding": "User charges + corporate partnerships can cover 30-40%"
    }
  }`;
  }

  prompt += `,
  "summary": "Jal Shakti Status: ${water_level_status}. Water level at ${avg_level.toFixed(1)}m. Daily safe extraction: ${daily_extraction_limit_liters.toLocaleString()} liters. Immediate conservation + recharge needed. ${isUser ? 'Farmers should shift to drip irrigation & low-water crops.' : 'Policy makers must implement industrial caps & recharge infrastructure.'}"
}`;

  // Call Groq
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  console.log("\n🤖 [AI API] Calling Groq AI...");
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "Return ONLY clean valid JSON. No markdown, no extra text." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    console.log("✅ Groq response received");
    let text = completion.choices[0]?.message?.content || "{}";
    console.log("📄 Raw response length:", text.length, "chars");
    
    text = text.replace(/```json|```/g, "").trim();

    let data;
    try {
      data = JSON.parse(text);
      console.log("✅ JSON parsed successfully");
      console.log("📦 Response keys:", Object.keys(data));
    } catch (parseErr) {
      console.log("⚠️  JSON parse failed, extracting JSON from text...");
      const match = text.match(/\{[\s\S]*\}/);
      data = match ? JSON.parse(match[0]) : {};
      console.log("📦 Extracted keys:", Object.keys(data));
    }

    // Fallbacks for critical fields
    Object.keys(baseData).forEach((k) => {
      if (data[k] === undefined) {
        console.log(`  Setting fallback for ${k}:`, baseData[k]);
        data[k] = baseData[k];
      }
    });

    // Cache result
    console.log("\n💾 Caching response with key:", cacheKey);
    cache.set(cacheKey, { data, ts: Date.now() });

    console.log("✅ [AI API] Response ready. Response has", Object.keys(data).length, "keys\n");
    return data;
  } catch (error) {
    console.error("❌ [AI API] Groq Error:", error.message);
    // If no role and Groq fails, return baseData with summary
    const fallbackData = {
      ...baseData,
      summary: `Water Level: ${water_level_status}. Daily extraction limit: ${daily_extraction_limit_liters.toLocaleString()} liters. ${water_level_status === 'critical' ? 'CRITICAL: Urgent conservation needed!' : water_level_status === 'low' ? 'WARNING: Water level is low - reduce extraction' : 'Safe - continue monitoring'}`
    };
    console.log("⚠️  Using fallback data (baseData only)");
    cache.set(cacheKey, { data: fallbackData, ts: Date.now() });
    return fallbackData;
  }
}// Route Handler
async function handler(req, { params }) {
  const { station_id } = await params;
  let role = null;
  let userId = null;

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
    }
  } else {
    console.log("ℹ️ No authorization header");
  }

  const data = await handleStationAI(station_id, role, userId);
  return NextResponse.json(data);
}

export const GET = handler;
export const POST = handler;