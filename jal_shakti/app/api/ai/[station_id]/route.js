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

// Analyze water quality
function analyzeWaterQuality(quality) {
  if (!quality) return { status: "unknown", issues: [], summary: "No water quality data available" };

  const issues = [];
  if (quality.tds > 2000) issues.push(`High TDS (${quality.tds} mg/L) - water may be salty`);
  if (quality.fluoride > 1.5) issues.push(`Excess Fluoride (${quality.fluoride} mg/L) - risk of fluorosis`);
  if (quality.nitrate > 45) issues.push(`High Nitrate (${quality.nitrate} mg/L) - health risk`);
  if (quality.arsenic > 0.01) issues.push(`Arsenic detected (${quality.arsenic} mg/L) - toxic`);
  if (quality.ph < 6.5 || quality.ph > 8.5) issues.push(`pH out of range (${quality.ph})`);

  const status = issues.length === 0 ? "safe" : issues.length <= 2 ? "moderate" : "poor";

  return {
    status,
    issues,
    summary: issues.length === 0
      ? "Water quality is safe for drinking and irrigation"
      : `Water quality is ${status}. ${issues.length} parameter(s) exceed safe limits.`
  };
}

export async function GET(req, context) {
  try {
    const { params } = context;
    const { station_id } = await params;

    if (!station_id) {
      return NextResponse.json({ error: "station_id is required" }, { status: 400 });
    }

    let userId = null;
    let role = "normal citizen";

    const auth = req.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      try {
        const token = auth.slice(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId || decoded.id;
        role = (decoded.role || "normal citizen").toLowerCase();
      } catch (e) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const cacheKey = getCacheKey(station_id, role, userId);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    await dbConnect();

    const user = await User.findById(userId).select("role farmingProfile email").lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const station = await Station.findOne({ station_id }).lean();
    if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

    const quality = await mongoose.connection.collection("water-quality").findOne({ station_id });
    const usage = await mongoose.connection.collection("water-usage").findOne({ station_id });

    const latestYear = Math.max(...Object.keys(station.historical_water_levels || {}).map(Number));
    const currentLevels = station.historical_water_levels?.[latestYear] || {};
    const levels = Object.values(currentLevels).filter(Boolean);
    const avgLevel = levels.length ? (levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(2) : 0;

    const waterStatus = avgLevel < 3.5 ? "critical" : avgLevel < 4 ? "low" : "safe";
    const dailyLimitLiters = (station.extraction_infrastructure?.average_extraction_rate_m3_day || 22) * 1000;
    const borewellCount = station.extraction_infrastructure?.borewell_count || 1;
    const bucketsPerBorewell = (dailyLimitLiters / borewellCount / 20).toFixed(2);

    const qualityAnalysis = analyzeWaterQuality(quality);

    const prompt = `
You are a senior groundwater and water quality expert in India.

STATION: ${station.station_name || station_id}, ${station.address?.district}, ${station.address?.state}
WATER LEVEL: ${avgLevel}m → ${waterStatus.toUpperCase()}
EXTRACTION: ${dailyLimitLiters.toLocaleString()} liters/day
BOREWELLS: ${borewellCount} → ${bucketsPerBorewell} buckets (20L) per borewell
USER ROLE: ${role}
${user.farmingProfile ? `FARM: ${user.farmingProfile.landAreaAcres} acres, Crops: ${user.farmingProfile.crops?.join(", ")}, Irrigation: ${user.farmingProfile.irrigationMethod}` : ""}

WATER QUALITY:
${quality ? `pH: ${quality.ph}, TDS: ${quality.tds}, Fluoride: ${quality.fluoride}, Nitrate: ${quality.nitrate}, Arsenic: ${quality.arsenic || 0}` : "No data available"}

Return ONLY valid JSON with this exact structure:

{
  "water_quality": {
    "status": "${qualityAnalysis.status}",
    "summary": "${qualityAnalysis.summary}"
    
  },
  "key_metrics": {
    "daily_extraction_limit_liters": ${dailyLimitLiters},
    "buckets_per_borewell": ${parseFloat(bucketsPerBorewell)},
    "water_level_status": "${waterStatus}",
    "household_water_liters": 150,
    "agriculture_water_m3_year": ${usage?.agriculture?.total_water_requirement_m3_year || 0},
    "industrial_extraction_limit_m3_year": ${usage?.industries?.total_usage_m3_year || 0}
  },
  "summary": "3-4 sentence overall summary starting with water quality and level status",
  "water_conservation": {
    "household_tips": ["5 practical tips"],
    "farm_tips": ["5 farm-specific tips"${user.farmingProfile?.crops ? ` especially for ${user.farmingProfile.crops.join(", ")}` : ""}]
  },
  "general_recommendations": {
    "water_conservation": ["5 general tips"],
    "community_initiatives": ["4 community actions"]
  },
  ${role.includes("decision") || role.includes("researcher") ? `"decision_maker_recommendations": {
    "executive_summary": "2-3 lines",
    "immediate_actions": ["5 urgent policy steps"],
    "short_term": ["4 policies"],
    "medium_term": ["4 projects"],
    "long_term": ["3 strategies"],
    "funding_sources": ["4-5 sources"]
  },` : `"farmer_recommendations": {
    "crop_suggestions": ["5 low-water crops for this region and season"],
    "irrigation_tips": ["5 advanced tips"],
    "government_schemes": ["3 relevant schemes with benefits"],
    "immediate_actions": ["5 urgent steps for farmers"]
  },`}
  "metadata": {
    "generated_at": "${new Date().toISOString()}",
    "ai_model": "llama-3.3-70b-versatile",
    "station_id": "${station_id}",
    "user_role": "${role}"
  }
}
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "Return only valid JSON. No markdown. No extra text." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: "json_object" }
    });

    let raw = completion.choices[0]?.message?.content?.trim() || "{}";
    raw = raw.replace(/```json|```/g, "").trim();

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      const match = raw.match(/\{[\s\S]*\}/);
      data = match ? JSON.parse(match[0]) : { error: "AI parsing failed" };
    }

    // Ensure water_quality is always first and correct
    data.water_quality = {
      status: qualityAnalysis.status,
      summary: qualityAnalysis.summary,
      issues: qualityAnalysis.issues,
      ...data.water_quality
    };

    cache.set(cacheKey, { data, ts: Date.now() });

    return NextResponse.json(data);

  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}