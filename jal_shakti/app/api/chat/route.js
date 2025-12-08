// app/api/chat/route.js

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";
import { analyzeWaterStatus } from "@/utils/waterLevelStatus";
import Groq from "groq-sdk";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// Session store to maintain conversation context
const sessions = new Map();
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session && Date.now() - session.lastAccess < SESSION_TTL) {
    session.lastAccess = Date.now();
    return session;
  }
  sessions.delete(sessionId);
  return null;
}

function createSession(sessionId, stationData) {
  const session = {
    stationData,
    conversationHistory: [],
    lastAccess: Date.now(),
  };
  sessions.set(sessionId, session);
  return session;
}

async function fetchStationData(station_id) {
  await dbConnect();

  const station = await Station.findOne({ station_id }).lean();
  if (!station) return null;

  const waterStatus = analyzeWaterStatus(station);

  const latestYear = Object.keys(station.historical_water_levels || {})
    .map(Number)
    .sort((a, b) => b - a)[0];
  const current_levels = station.historical_water_levels?.[latestYear] || {};

  const quality = await mongoose.connection.collection("water-quality").findOne({ station_id });
  const usage = await mongoose.connection.collection("water-usage").findOne({ station_id });

  const levels = Object.values(current_levels).filter(Boolean);
  const avg_level = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;

  let water_level_status = "safe";
  if (avg_level < 3.5) water_level_status = "critical";
  else if (avg_level < 4) water_level_status = "low";

  return {
    station_id: station.station_id,
    district: station.address?.district || "Unknown District",
    state: station.address?.state || "Unknown State",
    block: station.address?.block || "Unknown Block",
    village: station.address?.village || "Unknown Village",
    location: station.location,
    avg_water_level: avg_level.toFixed(2),
    water_level_status,
    current_levels,
    historical_data: station.historical_water_levels,
    extraction_infrastructure: station.extraction_infrastructure,
    aquifer: station.aquifer,
    water_quality: quality,
    water_usage: usage,
    waterStatus,
  };
}

function buildContextPrompt(stationData, userRole) {
  const isUser = ["farmer", "normal citizen"].includes(userRole);
  const isPlanner = ["decision maker", "ground water researcher"].includes(userRole);

  let context = `You are a water management assistant for groundwater station monitoring in India. 

STATION INFORMATION:
- Station ID: ${stationData.station_id}
- Location: ${stationData.village}, ${stationData.block}, ${stationData.district}, ${stationData.state}
- Coordinates: ${stationData.location?.coordinates ? `${stationData.location.coordinates[1]}, ${stationData.location.coordinates[0]}` : 'N/A'}
- Current Average Water Level: ${stationData.avg_water_level} meters
- Water Status: ${stationData.water_level_status}

WATER LEVEL DATA:
${JSON.stringify(stationData.current_levels, null, 2)}

AQUIFER INFORMATION:
${JSON.stringify(stationData.aquifer, null, 2)}

EXTRACTION INFRASTRUCTURE:
${JSON.stringify(stationData.extraction_infrastructure, null, 2)}

WATER QUALITY:
${JSON.stringify(stationData.water_quality, null, 2)}

WATER USAGE:
${JSON.stringify(stationData.water_usage, null, 2)}

`;

  if (isUser) {
    context += `
USER ROLE: ${userRole}
You should provide practical advice for:
- Water conservation techniques
- Crop selection based on water availability
- Household water management
- Livestock water requirements
- Water quality concerns and solutions
`;
  }

  if (isPlanner) {
    context += `
USER ROLE: ${userRole}
You should provide strategic insights for:
- Policy recommendations
- Infrastructure projects
- Recharge interventions
- Industrial regulation
- Long-term water planning
- Budget allocation suggestions
`;
  }

  if (!isUser && !isPlanner) {
    context += `
USER ROLE: General Public
Provide balanced information suitable for general public without technical jargon.
`;
  }

  context += `
Answer questions concisely and accurately. Keep responses brief (2-4 sentences max).
Use bullet points + paragrapg format keep balace little para then points  only when listing multiple items.

Be direct and to the point - no lengthy explanations unless asked.
Use Indian context (liters, meters, etc.) and local terminology when relevant.`;

  return context;
}

async function handleChatRequest(req) {
  try {
    const body = await req.json();
    const { message, sessionId, station_id } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Get user role from JWT token
    let userRole = null;
    const auth = req.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      try {
        const token = auth.slice(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        userRole = decoded.role?.toLowerCase();
      } catch (e) {
        console.log("Invalid/expired token → public mode");
      }
    }

    // Check if session exists
    let session = getSession(sessionId);

    // If no session or station_id provided, check if user is providing station_id
    if (!session) {
      if (!station_id) {
        // First message - ask for station ID
        return NextResponse.json({
          reply: "👋 Hi! I'm your **water management assistant**.\n\nPlease provide a **station ID** to get started.",
          needsStationId: true,
        });
      }

      // Fetch station data
      const stationData = await fetchStationData(station_id);
      if (!stationData) {
        return NextResponse.json({
          error: `Station with ID '${station_id}' not found. Please check the station ID and try again.`,
          needsStationId: true,
        }, { status: 404 });
      }

      // Create new session with station data
      session = createSession(sessionId, stationData);

      // Welcome message - keep it positive and concise
      const locationText = stationData.district !== "Unknown District" 
        ? ` in ${stationData.village}, ${stationData.district}, ${stationData.state}` 
        : "";
      
      return NextResponse.json({
        reply: `✅ **Loaded: Station ${stationData.station_id}**${locationText}\n\n**Status:** ${stationData.water_level_status.toUpperCase()} ✓\n**Water Level:** ${stationData.avg_water_level}m\n\nAsk me anything about this station!`,
        stationData: {
          station_id: stationData.station_id,
          district: stationData.district,
          state: stationData.state,
          village: stationData.village,
          water_level_status: stationData.water_level_status,
        },
      });
    }

    // Session exists - process the chat message
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Build context for AI
    const systemContext = buildContextPrompt(session.stationData, userRole);

    // Add user message to conversation history
    session.conversationHistory.push({
      role: "user",
      content: message,
    });

    // Keep only last 10 messages to avoid token limits
    if (session.conversationHistory.length > 10) {
      session.conversationHistory = session.conversationHistory.slice(-10);
    }

    // Create messages array for Groq
    const messages = [
      { role: "system", content: systemContext },
      ...session.conversationHistory,
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.7,
      max_tokens: 800,
    });

    const reply = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";

    // Add assistant reply to conversation history
    session.conversationHistory.push({
      role: "assistant",
      content: reply,
    });

    return NextResponse.json({
      reply,
      stationData: {
        station_id: session.stationData.station_id,
        district: session.stationData.district,
        state: session.stationData.state,
        village: session.stationData.village,
      },
    });

  } catch (error) {
    console.error("Chat Error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message", details: error.message },
      { status: 500 }
    );
  }
}

// Export POST handler
export async function POST(req) {
  return handleChatRequest(req);
}

// Optional: GET endpoint to check session status
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ active: false, message: "No active session" });
  }

  return NextResponse.json({
    active: true,
    stationData: {
      station_id: session.stationData.station_id,
      district: session.stationData.district,
      state: session.stationData.state,
      village: session.stationData.village,
    },
    messageCount: session.conversationHistory.length,
  });
}