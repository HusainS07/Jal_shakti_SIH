import { NextResponse } from "next/server";
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
      !session.stationData &&          // ✅ KEY FIX
      !confirmStationId &&
      !providedStationId &&
      !isExactStationId(message) &&
      !looksLikeLocation(message) &&
      isGeneralQuery(message);

    if (generalMode) {
      const lang = session.languageId === "en" ? "English" : "Hindi";

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are Jal Shakti AI Assistant for India. Respond in ${lang}.
Give practical advice. Do not mention stations.`
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

      if (["yes", "y", "हां", "हाँ"].includes(confirmed)) {
        const station = await Station.findOne({ station_id: confirmStationId }).lean();
        if (!station) {
          return NextResponse.json({ reply: "Station not found." });
        }

        const waterStatus = analyzeWaterStatus(station);

        session.stationData = {
          station_id: station.station_id,
          village: station.address?.village,
          district: station.address?.district,
          state: station.address?.state,
          avg_level: waterStatus.currentDepth?.toFixed(2),
          water_level_status: waterStatus.status
        };

        return NextResponse.json({
          reply: `✅ Station loaded: ${station.station_id}`,
          stationData: session.stationData,
          languageId: session.languageId
        });
      }

      session.stationData = null;
      return NextResponse.json({ reply: "Okay, search another place." });
    }

    /* =========================
       DIRECT STATION LOAD
    ========================= */

    const exactMatch = message.match(/\b([A-Z]{2}_[A-Z]+_\w+\d+)\b/i);
    const stationId = providedStationId || (exactMatch ? exactMatch[1] : null);

    if (stationId && !session.stationData) {
      const station = await Station.findOne({ station_id: stationId }).lean();
      if (station) {
        const waterStatus = analyzeWaterStatus(station);
        session.stationData = {
          station_id: station.station_id,
          village: station.address?.village,
          district: station.address?.district,
          state: station.address?.state,
          avg_level: waterStatus.currentDepth?.toFixed(2),
          water_level_status: waterStatus.status
        };

        return NextResponse.json({
          reply: `✅ Station loaded: ${stationId}`,
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
      }
    }

    /* =========================
       ✅ STATION-AWARE CHAT
    ========================= */

    const lang = session.languageId === "en" ? "English" : "Hindi";
    const s = session.stationData;
    console.log("STATION DATA IN PROMPT:", session.stationData);


    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a groundwater expert in India. Respond in ${lang}.

Station: ${s.station_id}
Location: ${s.village}, ${s.district}, ${s.state}
Water Level: ${s.avg_level} m
Status: ${s.water_level_status}

Use this data while answering.`
        },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 600
    });

    return NextResponse.json({
      reply: completion.choices[0].message.content,
      stationData: session.stationData,
      languageId: session.languageId
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
