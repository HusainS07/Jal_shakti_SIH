// app/api/ai/[station_id]/route.js

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";
import { analyzeWaterStatus } from "@/utils/waterLevelStatus";
import Groq from "groq-sdk";
import jwt from "jsonwebtoken";

// SECRET FIXED — ab token verify hoga pakka
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// Simple cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 60 * 1000; // 5 hours

const getKey = (id, role) => `${id}:${role || "public"}`;
const getCached = (id, role) => {
  const key = getKey(id, role);
  const item = cache.get(key);
  if (item && Date.now() - item.ts < CACHE_TTL) return item.data;
  cache.delete(key);
  return null;
};
const setCached = (id, role, data) => {
  cache.set(getKey(id, role), { data, ts: Date.now() });
};

async function handleStationAI(station_id, userRole = null) {
  const role = userRole?.toLowerCase(); // "user" ya "town_planner"

  // Cache check
  const cached = getCached(station_id, role);
  if (cached) return NextResponse.json(cached);

  await dbConnect();

  const station = await Station.findOne({ station_id }).lean();
  if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

  const waterStatus = analyzeWaterStatus(station);

  const latestYear = Object.keys(station.historical_water_levels || {})
    .map(Number)
    .sort((a, b) => b - a)[0];
  const current_levels = station.historical_water_levels?.[latestYear] || {};

  const quality = await mongoose.connection.collection("water-quality").findOne({ station_id });
  const usage = await mongoose.connection.collection("water-usage").findOne({ station_id });

  const daily_extraction_limit_liters =
    (station.extraction_infrastructure?.average_extraction_rate_m3_day || 0) * 1000;

  const buckets_per_borewell =
    daily_extraction_limit_liters / 20 / (station.extraction_infrastructure?.borewell_count || 1);

  const levels = Object.values(current_levels).filter(Boolean);
  const avg_level = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;

  let water_level_status = "safe";
  if (avg_level < 3.5) water_level_status = "critical";
  else if (avg_level < 4) water_level_status = "low";

  // STRICT ROLE CHECK — PUBLIC MODE OFF!
// AB YE KAR DE — 4 ROLES SUPPORT
const isUser = ["farmer", "normal citizen"].includes(role);
const isPlanner = ["decision maker", "ground water researcher"].includes(role);

  // Base fields hamesha jayenge
  let jsonStructure = `
  "daily_extraction_limit_liters": ${daily_extraction_limit_liters},
  "buckets_per_borewell": ${Number(buckets_per_borewell.toFixed(2))},
  "water_level_status": "${water_level_status}",
  "household_water_liters": 150,
  "agriculture_water_m3_year": ${usage?.agriculture?.total_water_requirement_m3_year || 0},
  "industrial_extraction_limit_m3_year": ${usage?.industries?.total_usage_m3_year || 0},
  `;

  // SIRF USER KO DIKHAO
  if (isUser) {
    jsonStructure += `
  "user_recommendations": {
    "crops": ["Pearl millet - drought resistant", "Moong bean - low water", "Bajra - dry tolerant", "Sorghum - highly drought tolerant"],
    "livestock_water": { "cattle_adult_liters_per_day": 60, "cattle_calf_liters_per_day": 25, "poultry_liters_per_day": 0.3 },
    "household_conservation": ["Fix all leaks immediately", "Use bucket instead of shower", "Harvest rooftop rainwater", "Install low-flow taps", "Reuse greywater for plants"],
    "water_quality_notes": "High fluoride detected. Install RO or activated alumina filter."
  },`;
  }

  // SIRF TOWN PLANNER KO DIKHAO
  if (isPlanner) {
    jsonStructure += `
  "town_planner_recommendations": {
    "industrial_limits": "Maximum 50,000 m³/year per industry. Permit system + heavy fines for violation.",
    "recharge_interventions": ["Check dams on seasonal rivers", "Percolation tanks in villages", "Mandatory rooftop rainwater harvesting", "Injection wells in depleted zones"],
    "irrigation_improvements": ["Promote drip & sprinkler systems", "Install soil moisture sensors", "Train farmers on scheduling", "Shift to less water-intensive crops"],
    "infrastructure_projects": ["Renovate traditional johads & tanks", "Construct new check dams", "Desilting of existing ponds", "Pipeline network for treated water reuse"],
    "future_planning": "Demand projected to rise 35% by 2030 and 60% by 2040. Urgent need for large-scale recharge + strict industrial regulation."
  },`;
  }

  // Summary hamesha
  jsonStructure += `"summary": "Water level: ${water_level_status}. Immediate action required on conservation and recharge."`;

  const prompt = `Return ONLY valid JSON with this exact structure:\n{\n${jsonStructure}\n}`;

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "Return only clean valid JSON. No extra text, no markdown." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    let text = completion.choices[0]?.message?.content || "{}";
    text = text.replace(/```json|```/g, "").trim();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      data = JSON.parse(match ? match[0] : "{}");
    }

    // Fallback for base fields
    data.daily_extraction_limit_liters ??= daily_extraction_limit_liters;
    data.buckets_per_borewell ??= Number(buckets_per_borewell.toFixed(2));
    data.water_level_status ??= water_level_status;

    setCached(station_id, role, data);
    return NextResponse.json(data);

  } catch (error) {
    console.error("AI Error:", error.message);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}

// Route handler
async function handler(req, { params }) {
  const { station_id } = await params;
  let role = null;

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    try {
      const token = auth.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      role = decoded.role?.toLowerCase();
      console.log("Valid token → role:", role); // ← Ab yeh dikhega
    } catch (e) {
      console.log("Invalid/expired token → public mode");
    }
  }

  return handleStationAI(station_id, role);
}

export const GET = handler;
export const POST = handler;