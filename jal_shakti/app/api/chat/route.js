import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";
import { analyzeWaterStatus } from "@/utils/waterLevelStatus";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const sessions = new Map();

/* =========================
   INTENT HELPERS
========================= */

function isExactStationId(message) {
  return /\b[A-Z]{2}_[A-Z]+_\w+\d+\b/i.test(message);
}

function looksLikeLocation(message) {
  return (
    message.trim().split(" ").length <= 3 &&
    !/[?]/.test(message) &&
    !/(how|what|why|tips|farming|irrigation|help|water)/i.test(message)
  );
}

function isGeneralQuery(message) {
  return (
    message.split(" ").length > 3 ||
    /[?]/.test(message) ||
    /(farming|irrigation|crop|tips|scheme|how|what|why|conservation|water)/i.test(
      message
    )
  );
}

/* =========================
   STATION SEARCH
========================= */

async function searchStations(query, limit = 5) {
  const searchQuery = {
    $or: [
      { station_id: { $regex: query, $options: "i" } },
      { "address.state": { $regex: query, $options: "i" } },
      { "address.district": { $regex: query, $options: "i" } },
      { "address.village": { $regex: query, $options: "i" } },
      { "address.block": { $regex: query, $options: "i" } }
    ]
  };

  const stations = await Station.find(searchQuery, {
    station_id: 1,
    "address.village": 1,
    "address.district": 1,
    "address.state": 1,
    _id: 0
  })
    .limit(limit)
    .lean();

  return stations.map(s => ({
    station_id: s.station_id,
    village: s.address?.village || "Unknown",
    district: s.address?.district || "Unknown",
    state: s.address?.state || "Unknown",
  }));
}

/* =========================
   FETCH COMPLETE STATION CONTEXT
========================= */

async function fetchCompleteStationContext(stationId) {
  try {
    // 1. Get station data
    const station = await Station.findOne({ station_id: stationId }).lean();
    
    if (!station) {
      return null;
    }

    // 2. Analyze water status
    const waterStatus = analyzeWaterStatus(station);

    // 3. Get latest year water levels
    const years = Object.keys(station.historical_water_levels || {})
      .map(Number)
      .sort((a, b) => b - a);
    const latestYear = years[0];
    const currentLevels = station.historical_water_levels?.[latestYear] || {};

    // 4. Fetch water quality data
    const quality = await mongoose.connection
      .collection("water-quality")
      .findOne({ station_id: stationId });

    // 5. Fetch water usage data
    const usage = await mongoose.connection
      .collection("water-usage")
      .findOne({ station_id: stationId });

    // 6. Build comprehensive context
    const context = {
      station_id: station.station_id,
      location: {
        village: station.address?.village || "Unknown",
        block: station.address?.block || "Unknown",
        district: station.address?.district || "Unknown",
        state: station.address?.state || "Unknown"
      },
      water_level: {
        current_depth_m: waterStatus.currentDepth?.toFixed(2),
        status: waterStatus.status,
        status_short: waterStatus.statusShort,
        reference_period: waterStatus.referencePeriod
      },
      seasonal_levels: {
        jan: currentLevels.jan?.toFixed(2) || "N/A",
        apr_may: currentLevels.apr_may?.toFixed(2) || "N/A",
        aug: currentLevels.aug?.toFixed(2) || "N/A",
        nov: currentLevels.nov?.toFixed(2) || "N/A"
      },
      aquifer: {
        type: station.aquifer?.type || "Unknown",
        weathered_zone_m: station.aquifer?.weathered_zone_depth_m?.toFixed(2) || "N/A",
        fractured_zone_m: station.aquifer?.fractured_zone_depth_m?.toFixed(2) || "N/A",
        storativity: station.aquifer?.storativity?.toFixed(4) || "N/A",
        transmissivity_m2_day: station.aquifer?.transmissivity_m2_day?.toFixed(2) || "N/A",
        infiltration_rate_percent: station.aquifer?.infiltration_rate_percent?.toFixed(2) || "N/A",
        storage_capacity_m3: station.aquifer?.estimated_storage_capacity_m3?.toFixed(0) || "N/A"
      },
      extraction: {
        borewells: station.extraction_infrastructure?.borewell_count || 0,
        handpumps: station.extraction_infrastructure?.handpump_count || 0,
        open_wells: station.extraction_infrastructure?.open_well_count || 0,
        avg_depth_m: station.extraction_infrastructure?.average_depth_m?.toFixed(2) || "N/A",
        daily_extraction_m3: station.extraction_infrastructure?.average_extraction_rate_m3_day?.toFixed(2) || "N/A"
      },
      water_quality: quality?.water_quality ? {
        year: quality.water_quality.year,
        ph: quality.water_quality.ph?.toFixed(2) || "N/A",
        ec_uScm: quality.water_quality.ec_uScm || "N/A",
        total_hardness_mgL: quality.water_quality.total_hardness_mgL || "N/A",
        no3_mgL: quality.water_quality.no3_mgL?.toFixed(2) || "N/A",
        f_mgL: quality.water_quality.f_mgL?.toFixed(2) || "N/A",
        suitability: (
          quality.water_quality.ph >= 6.5 &&
          quality.water_quality.ph <= 8.5 &&
          quality.water_quality.ec_uScm <= 3000 &&
          quality.water_quality.no3_mgL <= 45 &&
          quality.water_quality.f_mgL <= 1.5
        ) ? "POTABLE" : "REQUIRES TREATMENT"
      } : null,
      water_usage: usage ? {
        year: usage.year,
        domestic_m3_year: usage.domestic_m3_year || 0,
        irrigation_m3_year: usage.irrigation_m3_year || 0,
        industrial_m3_year: usage.industrial_m3_year || 0,
        total_m3_year: usage.total_m3_year || 0,
        population_served: usage.population_served || 0
      } : null
    };

    return context;
  } catch (error) {
    console.error("Error fetching station context:", error);
    return null;
  }
}

/* =========================
   LANGUAGE MAPPING
========================= */

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
  as: "Assamese (অসমীয়া)"
};

/* =========================
   BUILD CONTEXTUAL PROMPT
========================= */

function buildStationPrompt(context, languageId) {
  const lang = LANGUAGE_MAP[languageId] || "English";
  
  let prompt = `You are a groundwater expert assistant for India. Respond ONLY in ${lang}.\n\n`;
  prompt += `STATION CONTEXT:\n`;
  prompt += `Station ID: ${context.station_id}\n`;
  prompt += `Location: ${context.location.village}, ${context.location.block}, ${context.location.district}, ${context.location.state}\n\n`;
  
  prompt += `CURRENT WATER LEVEL:\n`;
  prompt += `- Depth: ${context.water_level.current_depth_m} meters below ground level\n`;
  prompt += `- Status: ${context.water_level.status} (${context.water_level.status_short})\n`;
  prompt += `- Reference Period: ${context.water_level.reference_period}\n\n`;
  
  prompt += `SEASONAL WATER LEVELS (Latest Year):\n`;
  prompt += `- January (Pre-monsoon): ${context.seasonal_levels.jan} m\n`;
  prompt += `- April-May (Summer): ${context.seasonal_levels.apr_may} m\n`;
  prompt += `- August (Monsoon): ${context.seasonal_levels.aug} m\n`;
  prompt += `- November (Post-monsoon): ${context.seasonal_levels.nov} m\n\n`;
  
  prompt += `AQUIFER CHARACTERISTICS:\n`;
  prompt += `- Type: ${context.aquifer.type}\n`;
  prompt += `- Weathered Zone Depth: ${context.aquifer.weathered_zone_m} m\n`;
  prompt += `- Fractured Zone Depth: ${context.aquifer.fractured_zone_m} m\n`;
  prompt += `- Storativity: ${context.aquifer.storativity}\n`;
  prompt += `- Transmissivity: ${context.aquifer.transmissivity_m2_day} m²/day\n`;
  prompt += `- Infiltration Rate: ${context.aquifer.infiltration_rate_percent}%\n`;
  prompt += `- Storage Capacity: ${context.aquifer.storage_capacity_m3} m³\n\n`;
  
  prompt += `EXTRACTION INFRASTRUCTURE:\n`;
  prompt += `- Borewells: ${context.extraction.borewells}\n`;
  prompt += `- Handpumps: ${context.extraction.handpumps}\n`;
  prompt += `- Open Wells: ${context.extraction.open_wells}\n`;
  prompt += `- Average Depth: ${context.extraction.avg_depth_m} m\n`;
  prompt += `- Daily Extraction: ${context.extraction.daily_extraction_m3} m³/day\n\n`;
  
  if (context.water_quality) {
    prompt += `WATER QUALITY (Year ${context.water_quality.year}):\n`;
    prompt += `- pH: ${context.water_quality.ph}\n`;
    prompt += `- Electrical Conductivity: ${context.water_quality.ec_uScm} µS/cm\n`;
    prompt += `- Total Hardness: ${context.water_quality.total_hardness_mgL} mg/L\n`;
    prompt += `- Nitrate (NO3): ${context.water_quality.no3_mgL} mg/L\n`;
    prompt += `- Fluoride (F): ${context.water_quality.f_mgL} mg/L\n`;
    prompt += `- Suitability: ${context.water_quality.suitability}\n\n`;
  }
  
  if (context.water_usage) {
    prompt += `WATER USAGE (Year ${context.water_usage.year}):\n`;
    prompt += `- Domestic: ${context.water_usage.domestic_m3_year} m³/year\n`;
    prompt += `- Irrigation: ${context.water_usage.irrigation_m3_year} m³/year\n`;
    prompt += `- Industrial: ${context.water_usage.industrial_m3_year} m³/year\n`;
    prompt += `- Total Annual Usage: ${context.water_usage.total_m3_year} m³/year\n`;
    prompt += `- Population Served: ${context.water_usage.population_served}\n\n`;
  }
  
  prompt += `Use this comprehensive data to provide accurate, contextual answers about groundwater conditions, quality, usage patterns, and recommendations for this station.`;
  
  return prompt;
}

/* =========================
   POST HANDLER
========================= */

export async function POST(req) {
  try {
    await dbConnect();

    const {
      message,
      sessionId,
      language_id = "en",
      station_id: providedStationId,
      confirmStationId
    } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    /* ===== SESSION ===== */

    let session = sessions.get(sessionId);
    if (!session) {
      session = {
        history: [],
        stationData: null,
        fullContext: null,
        languageId: language_id
      };
      sessions.set(sessionId, session);
    } else {
      session.languageId = language_id;
    }

    /* =========================
       GENERAL MODE (ONLY IF NO STATION LOADED)
    ========================= */

    const generalMode =
      !session.stationData &&
      !confirmStationId &&
      !providedStationId &&
      !isExactStationId(message) &&
      !looksLikeLocation(message) &&
      isGeneralQuery(message);

    if (generalMode) {
      const lang = LANGUAGE_MAP[session.languageId] || "English";

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are Jal Shakti AI Assistant for India. Respond ONLY in ${lang}.
Give practical advice about groundwater, water conservation, irrigation, and farming practices. Do not mention specific stations.`
          },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      return NextResponse.json({
        reply: completion.choices[0].message.content,
        stationData: null,
        languageId: session.languageId
      });
    }

    /* =========================
       CONFIRMATION FLOW
    ========================= */

    if (confirmStationId) {
      const confirmed = message.toLowerCase();

      if (["yes", "y", "हां", "हाँ", "ஆம்", "అవును", "হ্যাঁ", "हो", "હા", "ಹೌದು", "അതെ", "ਹਾਂ", "ହଁ", "হয়"].includes(confirmed)) {
        // Fetch complete context from all 3 databases
        const fullContext = await fetchCompleteStationContext(confirmStationId);
        
        if (!fullContext) {
          return NextResponse.json({ reply: "Station not found." });
        }

        // Store both minimal and full context
        session.stationData = {
          station_id: fullContext.station_id,
          village: fullContext.location.village,
          district: fullContext.location.district,
          state: fullContext.location.state,
          avg_level: fullContext.water_level.current_depth_m,
          water_level_status: fullContext.water_level.status
        };
        
        session.fullContext = fullContext;

        return NextResponse.json({
          reply: `✅ Station loaded: ${fullContext.station_id}\n\nI now have complete data including water levels, aquifer properties, extraction infrastructure, water quality, and usage patterns. Ask me anything about this station!`,
          stationData: session.stationData,
          languageId: session.languageId
        });
      }

      session.stationData = null;
      session.fullContext = null;
      return NextResponse.json({ reply: "Okay, search another place." });
    }

    /* =========================
       DIRECT STATION LOAD
    ========================= */

    const exactMatch = message.match(/\b([A-Z]{2}_[A-Z]+_\w+\d+)\b/i);
    const stationId = providedStationId || (exactMatch ? exactMatch[1] : null);

    if (stationId && !session.stationData) {
      // Fetch complete context from all 3 databases
      const fullContext = await fetchCompleteStationContext(stationId);
      
      if (fullContext) {
        session.stationData = {
          station_id: fullContext.station_id,
          village: fullContext.location.village,
          district: fullContext.location.district,
          state: fullContext.location.state,
          avg_level: fullContext.water_level.current_depth_m,
          water_level_status: fullContext.water_level.status
        };
        
        session.fullContext = fullContext;

        return NextResponse.json({
          reply: `✅ Station loaded: ${stationId}\n\nI now have complete data including water levels, aquifer properties, extraction infrastructure, water quality, and usage patterns. Ask me anything about this station!`,
          stationData: session.stationData,
          languageId: session.languageId
        });
      }
    }

    /* =========================
       LOCATION SEARCH
    ========================= */

    if (!session.stationData && looksLikeLocation(message)) {
      const results = await searchStations(message);

      if (results.length > 0) {
        session.pendingConfirmation = results[0].station_id;

        let reply = `🔍 Found stations:\n\n`;
        results.forEach((s, i) => {
          reply += `${i + 1}. ${s.station_id} – ${s.village}, ${s.state}\n`;
        });

        reply += `\nLoad **${results[0].station_id}**? (Yes / No)`;

        return NextResponse.json({
          reply,
          pendingConfirmation: results[0].station_id,
          stationData: null
        });
      } else {
        return NextResponse.json({
          reply: "No stations found for that location. Try another search term.",
          stationData: null
        });
      }
    }

    /* =========================
       ✅ STATION-AWARE CHAT WITH FULL CONTEXT
    ========================= */

    if (session.fullContext) {
      const systemPrompt = buildStationPrompt(session.fullContext, session.languageId);
      
      console.log("FULL CONTEXT LOADED:", session.fullContext.station_id);

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      return NextResponse.json({
        reply: completion.choices[0].message.content,
        stationData: session.stationData,
        languageId: session.languageId
      });
    }

    /* =========================
       FALLBACK
    ========================= */

    return NextResponse.json({
      reply: "Please provide a station ID or location to get started, or ask a general question about groundwater and irrigation.",
      stationData: null,
      languageId: session.languageId
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}