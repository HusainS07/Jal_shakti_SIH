// app/api/ai/[station_id]/route.js
///api/ai/RJ_TONK_MALPURA_001

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";
import { analyzeWaterStatus } from "@/utils/waterLevelStatus";
import Groq from "groq-sdk";

// Main logic extracted to a function
async function handleStationAI(station_id) {
  if (!station_id) {
    return NextResponse.json({ error: "station_id is required" }, { status: 400 });
  }

  await dbConnect();

  // Fetch station data
  const station = await Station.findOne({ station_id }).lean();
  if (!station) {
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  const waterStatus = analyzeWaterStatus(station);

  const years = Object.keys(station.historical_water_levels || {})
    .map(Number)
    .sort((a, b) => b - a);
  const latestYear = years[0];
  const current_levels = station.historical_water_levels?.[latestYear] || {};

  const quality = await mongoose.connection
    .collection("water-quality")
    .findOne({ station_id });

  const usage = await mongoose.connection
    .collection("water-usage")
    .findOne({ station_id });

  // Compute metrics
  const daily_extraction_limit_liters = (station.extraction_infrastructure?.average_extraction_rate_m3_day || 0) * 1000;
  const buckets_per_borewell = daily_extraction_limit_liters / 20 / (station.extraction_infrastructure?.borewell_count || 1);

  const levels = Object.values(current_levels).filter(Boolean);
  const avg_level = levels.reduce((a, b) => a + b, 0) / (levels.length || 1);
  let water_level_status = "safe";
  if (avg_level < 3.5) water_level_status = "critical";
  else if (avg_level < 4) water_level_status = "low";

  const household_water_liters = 150;
  const agriculture_water_m3_year = usage?.agriculture?.total_water_requirement_m3_year || 0;
  const industrial_extraction_limit_m3_year = usage?.industries?.total_usage_m3_year || 0;

  // LLM prompt
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API Key missing" }, { status: 500 });
  }

  const groq = new Groq({ apiKey });

  const prompt = `You are an expert water resource management consultant for groundwater monitoring stations in India.

STATION DATA:
${JSON.stringify({
    station_id,
    location: station.address,
    daily_extraction_limit_liters,
    buckets_per_borewell,
    water_level_status,
    current_water_depth: waterStatus.currentDepth,
    seasonal_levels: current_levels,
    aquifer_type: station.aquifer?.type,
    storage_capacity: station.aquifer?.estimated_storage_capacity_m3,
    water_quality: quality?.water_quality,
    household_water_liters,
    agriculture_water_m3_year,
    industrial_extraction_limit_m3_year,
    borewell_count: station.extraction_infrastructure?.borewell_count,
    population: usage?.domestic?.population,
    crop_types: usage?.agriculture?.major_crops
  }, null, 2)}

Generate comprehensive, actionable recommendations for this specific station.

USER RECOMMENDATIONS (for farmers, households, livestock owners):
- Suggest 3-4 specific drought-resistant crops suitable for this region and water availability
- Provide daily water allocation per cattle (adult/calf) and poultry
- List 5 practical household water conservation techniques
- Mention any water quality concerns and treatment suggestions

TOWN PLANNER RECOMMENDATIONS (for municipal authorities):
- Set specific industrial extraction limits with enforcement mechanisms
- Propose 3-4 groundwater recharge interventions suitable for this location
- Recommend irrigation efficiency improvements (drip, sprinkler, timings)
- Suggest infrastructure projects (rainwater harvesting, check dams, etc.)
- Provide population growth considerations and future water demand projections

CRITICAL: Respond ONLY with valid JSON. No markdown, no code blocks, no explanations.
Use this exact structure:

{
  "daily_extraction_limit_liters": ${daily_extraction_limit_liters},
  "buckets_per_borewell": ${buckets_per_borewell.toFixed(2)},
  "water_level_status": "${water_level_status}",
  "household_water_liters": ${household_water_liters},
  "agriculture_water_m3_year": ${agriculture_water_m3_year},
  "industrial_extraction_limit_m3_year": ${industrial_extraction_limit_m3_year},
  "user_recommendations": {
    "crops": ["crop1 - reason", "crop2 - reason", "crop3 - reason"],
    "livestock_water": {
      "cattle_adult_liters_per_day": 0,
      "cattle_calf_liters_per_day": 0,
      "poultry_liters_per_day": 0
    },
    "household_conservation": ["tip1", "tip2", "tip3", "tip4", "tip5"],
    "water_quality_notes": "any concerns or treatment advice"
  },
  "town_planner_recommendations": {
    "industrial_limits": "specific extraction limits and enforcement",
    "recharge_interventions": ["intervention1", "intervention2", "intervention3"],
    "irrigation_improvements": ["improvement1", "improvement2", "improvement3"],
    "infrastructure_projects": ["project1", "project2", "project3"],
    "future_planning": "population growth and demand projections"
  },
  "summary": "2-3 sentence overview of water situation and priority actions"
}`;

  const completion = await groq.chat.completions.create({
    messages: [
      { 
        role: "system", 
        content: "You are a water resource expert. Always respond with valid JSON only, no markdown formatting." 
      },
      { 
        role: "user", 
        content: prompt 
      }
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.5, 
    max_tokens: 2048, 
    top_p: 0.9,
  });

  const text = completion.choices[0]?.message?.content || "";

  // Aggressive cleaning: remove markdown, code blocks, and control characters
  let cleanedText = text
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .replace(/^\s+|\s+$/g, '') // trim
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // remove control chars

  let llmJson = {};
  
  // Try multiple parsing strategies
  try {
    llmJson = JSON.parse(cleanedText);
  } catch (e) {
    console.warn("First parse attempt failed, trying fallback extraction...");
    
    // Strategy 2: Extract JSON object using regex
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const extracted = jsonMatch[0]
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // clean control chars
        llmJson = JSON.parse(extracted);
        console.log("✅ Successfully parsed using regex extraction");
      } catch (e2) {
        console.error("Regex extraction parse failed:", e2.message);
        
        // Strategy 3: Try to fix common JSON issues
        try {
          const fixed = jsonMatch[0]
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
            .replace(/,(\s*[}\]])/g, '$1') // remove trailing commas
            .replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // quote unquoted keys
          llmJson = JSON.parse(fixed);
          console.log("✅ Successfully parsed after fixing common issues");
        } catch (e3) {
          console.error("All parsing strategies failed");
          console.log("Raw text sample:", text.substring(0, 200));
          
          llmJson = { 
            error: "Unable to parse JSON response", 
            raw_text: text,
            fallback_data: {
              daily_extraction_limit_liters,
              buckets_per_borewell,
              water_level_status,
              household_water_liters,
              agriculture_water_m3_year,
              industrial_extraction_limit_m3_year
            }
          };
        }
      }
    } else {
      console.error("No JSON object found in response");
      llmJson = { 
        error: "No JSON object found", 
        raw_text: text,
        fallback_data: {
          daily_extraction_limit_liters,
          buckets_per_borewell,
          water_level_status,
          household_water_liters,
          agriculture_water_m3_year,
          industrial_extraction_limit_m3_year
        }
      };
    }
  }

  return NextResponse.json(llmJson);
}

// CHANGE: Await params before accessing station_id
export async function GET(req, { params }) {
  const { station_id } = await params;
  return handleStationAI(station_id);
}

export async function POST(req, { params }) {
  const { station_id } = await params;
  return handleStationAI(station_id);
}