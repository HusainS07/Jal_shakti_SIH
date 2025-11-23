// app/api/ai/[station_id]/route.js

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";
import { analyzeWaterStatus } from "@/utils/waterLevelStatus";
import Groq from "groq-sdk";

// ——— SIMPLE 5-HOUR IN-MEMORY CACHE (Local only) ———
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 60 * 1000; // 5 hours

function getFromCache(station_id) {
  const key = station_id;
  const entry = cache.get(key);
  
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key); // expire old entries
    return null;
  }
  
  console.log(`CACHE HIT for ${station_id} (served from memory)`);
  return entry.data;
}

function saveToCache(station_id, data) {
  cache.set(station_id, {
    data,
    timestamp: Date.now(),
  });
  console.log(`CACHE SET for ${station_id} (5-hour TTL)`);
}

// ——— MAIN AI HANDLER ———
async function handleStationAI(station_id) {
  // Check cache first
  const cachedResponse = getFromCache(station_id);
  if (cachedResponse) {
    return NextResponse.json(cachedResponse);
  }

  if (!station_id) {
    return NextResponse.json({ error: "station_id is required" }, { status: 400 });
  }

  await dbConnect();

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
  const avg_level = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
  let water_level_status = "safe";
  if (avg_level < 3.5) water_level_status = "critical";
  else if (avg_level < 4) water_level_status = "low";

  const household_water_liters = 150;
  const agriculture_water_m3_year = usage?.agriculture?.total_water_requirement_m3_year || 0;
  const industrial_extraction_limit_m3_year = usage?.industries?.total_usage_m3_year || 0;

  // LLM Call
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY missing" }, { status: 500 });
  }

  const groq = new Groq({ apiKey });

  const prompt = `You are an expert water resource management consultant for groundwater monitoring stations in India.

STATION DATA:
${JSON.stringify({
    station_id,
    location: station.address,
    daily_extraction_limit_liters,
    buckets_per_borewell: Number(buckets_per_borewell.toFixed(2)),
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
  "buckets_per_borewell": ${Number(buckets_per_borewell.toFixed(2))},
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

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Return only valid JSON. No explanations. No markdown." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 2048,
    });

    let text = completion.choices[0]?.message?.content || "{}";

    // Clean response aggressively
    text = text.replace(/```json|```/g, "").trim();

    let llmJson;
    try {
      llmJson = JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        llmJson = JSON.parse(jsonMatch[0]
          .replace(/,\s*}/g, "}")
          .replace(/,\s*]/g, "]")
          .replace(/(\w+):/g, '"$1":')
        );
      } else {
        throw e;
      }
    }

    // Cache the successful response for 5 hours
    saveToCache(station_id, llmJson);

    return NextResponse.json(llmJson);

  } catch (error) {
    console.error("AI generation failed:", error.message);
    return NextResponse.json({
      error: "Failed to generate recommendations",
      details: error.message
    }, { status: 500 });
  }
}

// ——— ROUTE HANDLERS ———
export async function GET(req, { params }) {
  const { station_id } = await params;
  return handleStationAI(station_id);
}

export async function POST(req, { params }) {
  const { station_id } = await params;
  return handleStationAI(station_id);
}