// app/api/chat/route.js

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";
import User from "@/models/user";
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

function createSession(sessionId, stationData, userProfile = null) {
  const session = {
    stationData,
    userProfile,
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
    station_id: station.station_id || station_id,
    station_name: station.station_name || station.name || "Unknown Station",
    district: station.district || station.location?.district || "Unknown District",
    state: station.state || station.location?.state || "Unknown State",
    location: station.location,
    avg_water_level: avg_level.toFixed(2),
    water_level_status,
    current_levels,
    historical_data: station.historical_water_levels,
    extraction_infrastructure: station.extraction_infrastructure,
    water_quality: quality,
    water_usage: usage,
    waterStatus,
  };
}

async function fetchUserProfile(userId) {
  console.log("\n👤 [Chat] ========== FETCHING USER PROFILE ==========");
  console.log("🆔 [Chat] User ID:", userId);
  
  await dbConnect();
  
  const user = await User.findById(userId).select('-password').lean();
  
  if (!user) {
    console.log("❌ [Chat] User NOT found in database");
    return null;
  }
  
  console.log("✅ [Chat] User found in database");
  console.log("📧 [Chat] Email:", user.email);
  console.log("👤 [Chat] Role:", user.role);
  console.log("📋 [Chat] Full user object:", JSON.stringify(user, null, 2));
  
  if (user.farmingProfile) {
    console.log("✅ [Chat] Farming profile EXISTS!");
    console.log("🌾 [Chat] Crops:", user.farmingProfile.crops);
    console.log("🐄 [Chat] Livestock:", user.farmingProfile.livestock);
    console.log("📏 [Chat] Land Area:", user.farmingProfile.landAreaAcres, "acres");
    console.log("💧 [Chat] Irrigation:", user.farmingProfile.irrigationMethod);
    console.log("🚜 [Chat] Complete farming profile:", JSON.stringify(user.farmingProfile, null, 2));
  } else {
    console.log("⚠️  [Chat] NO farming profile found");
    console.log("⚠️  [Chat] farmingProfile field:", user.farmingProfile);
  }
  
  console.log("========================================\n");
  
  return user;
}

function buildContextPrompt(stationData, userRole, userProfile = null) {
  const isUser = ["farmer", "normal citizen"].includes(userRole);
  const isPlanner = ["decision maker", "ground water researcher"].includes(userRole);

  let context = `You are a water management assistant for groundwater station monitoring in India. 

STATION INFORMATION:
- Station ID: ${stationData.station_id}
- Station Name: ${stationData.station_name}
- District: ${stationData.district}, ${stationData.state}
- Location: ${stationData.location?.coordinates ? `${stationData.location.coordinates[1]}, ${stationData.location.coordinates[0]}` : 'N/A'}
- Current Average Water Level: ${stationData.avg_water_level} meters
- Water Status: ${stationData.water_level_status}

WATER LEVEL DATA:
${JSON.stringify(stationData.current_levels, null, 2)}

EXTRACTION INFRASTRUCTURE:
${JSON.stringify(stationData.extraction_infrastructure, null, 2)}

WATER QUALITY:
${JSON.stringify(stationData.water_quality, null, 2)}

WATER USAGE:
${JSON.stringify(stationData.water_usage, null, 2)}

`;

  // Add user profile context if available
  if (userProfile && userProfile.farmingProfile) {
    const fp = userProfile.farmingProfile;
    context += `
USER'S FARMING PROFILE:
- Current Crops: ${fp.crops && fp.crops.length > 0 ? fp.crops.join(", ") : "None specified"}
- Livestock: ${fp.livestock && fp.livestock.length > 0 ? fp.livestock.join(", ") : "None specified"}
- Land Area: ${fp.landAreaAcres ? `${fp.landAreaAcres} acres` : "Not specified"}
- Irrigation Method: ${fp.irrigationMethod || "Not specified"}

IMPORTANT: Use this farming profile to provide PERSONALIZED advice:
- Recommend water conservation techniques suitable for their specific crops and livestock
- Suggest irrigation scheduling based on their current irrigation method
- Provide crop-specific water requirements for their crops: ${fp.crops?.join(", ") || "various crops"}
- Calculate water needs for their specific livestock: ${fp.livestock?.join(", ") || "various animals"}
- Tailor all recommendations to their ${fp.landAreaAcres || "farm"} size and ${fp.irrigationMethod || "current"} irrigation system
`;
  }

  if (isUser) {
    context += `
USER ROLE: ${userRole}
You should provide practical advice for:
- Water conservation techniques ${userProfile?.farmingProfile?.crops ? `specifically for ${userProfile.farmingProfile.crops.join(", ")}` : ""}
- Crop selection based on water availability ${userProfile?.farmingProfile?.landAreaAcres ? `for ${userProfile.farmingProfile.landAreaAcres} acres` : ""}
- Household water management
- Livestock water requirements ${userProfile?.farmingProfile?.livestock ? `for ${userProfile.farmingProfile.livestock.join(", ")}` : ""}
- Water quality concerns and solutions
- Irrigation optimization ${userProfile?.farmingProfile?.irrigationMethod ? `for ${userProfile.farmingProfile.irrigationMethod} irrigation` : ""}
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
Answer questions concisely and accurately. Keep responses brief (2-4 sentences max) unless the user asks for detailed information.
Use bullet points only when listing multiple items.
Be direct and to the point - no lengthy explanations unless asked.
Use Indian context (liters, meters, etc.) and local terminology when relevant.
${userProfile?.farmingProfile ? "Always reference the user's specific crops, livestock, and farming practices when giving advice." : ""}`;

  return context;
}

async function handleChatRequest(req) {
  try {
    console.log("\n💬 [Chat] ========== NEW CHAT REQUEST ==========");
    
    const body = await req.json();
    const { message, sessionId, station_id } = body;

    console.log("📨 [Chat] Message:", message);
    console.log("🔑 [Chat] Session ID:", sessionId);
    console.log("🏢 [Chat] Station ID:", station_id);

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Get user info from JWT token
    let userRole = null;
    let userId = null;
    let userProfile = null;
    
    const auth = req.headers.get("authorization");
    console.log("\n🔐 [Chat] Authorization header present:", !!auth);
    
    if (auth?.startsWith("Bearer ")) {
      try {
        const token = auth.slice(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // FIXED: Use the correct field from decoded token
        userId = decoded.userId || decoded.id;
        userRole = decoded.role?.toLowerCase();
        
        console.log("✅ [Chat] Token decoded successfully");
        console.log("🆔 [Chat] Decoded userId:", userId);
        console.log("👤 [Chat] Decoded role:", userRole);
        console.log("📋 [Chat] Full decoded token:", JSON.stringify(decoded, null, 2));
        
        // Fetch full user profile including farming data
        if (userId) {
          console.log("\n🚜 [Chat] Fetching user profile...");
          userProfile = await fetchUserProfile(userId);
          
          if (userProfile) {
            console.log("✅ [Chat] User profile fetched successfully");
          } else {
            console.log("⚠️  [Chat] User profile not found");
          }
        } else {
          console.log("⚠️  [Chat] No userId in decoded token");
        }
      } catch (e) {
        console.log("❌ [Chat] Token verification failed:", e.message);
        console.log("Invalid/expired token → public mode");
      }
    } else {
      console.log("ℹ️  [Chat] No authorization header - anonymous user");
    }

    // Check if session exists
    let session = getSession(sessionId);

    // If no session or station_id provided, check if user is providing station_id
    if (!session) {
      if (!station_id) {
        // First message - ask for station ID
        const greeting = userProfile?.farmingProfile 
          ? `👋 Hi! I'm your **personalized water management assistant**.\n\nI see you grow ${userProfile.farmingProfile.crops?.join(", ") || "crops"}${userProfile.farmingProfile.livestock?.length > 0 ? ` and raise ${userProfile.farmingProfile.livestock.join(", ")}` : ""}. I'll provide advice tailored to your farm!\n\nPlease provide a **station ID** to get started.`
          : "👋 Hi! I'm your **water management assistant**.\n\nPlease provide a **station ID** to get started.";
        
        console.log("📤 [Chat] Sending greeting (no station ID yet)");
        
        return NextResponse.json({
          reply: greeting,
          needsStationId: true,
        });
      }

      // Fetch station data
      console.log("\n🏢 [Chat] Fetching station data for:", station_id);
      const stationData = await fetchStationData(station_id);
      
      if (!stationData) {
        console.log("❌ [Chat] Station not found:", station_id);
        return NextResponse.json({
          error: `Station with ID '${station_id}' not found. Please check the station ID and try again.`,
          needsStationId: true,
        }, { status: 404 });
      }

      console.log("✅ [Chat] Station data fetched successfully");

      // Create new session with station data and user profile
      console.log("\n💾 [Chat] Creating new session...");
      console.log("🏢 [Chat] Session station:", stationData.station_id);
      console.log("👤 [Chat] Session user profile:", userProfile ? "YES" : "NO");
      
      if (userProfile?.farmingProfile) {
        console.log("🌾 [Chat] Session will include farming profile:");
        console.log("   - Crops:", userProfile.farmingProfile.crops);
        console.log("   - Livestock:", userProfile.farmingProfile.livestock);
        console.log("   - Land:", userProfile.farmingProfile.landAreaAcres, "acres");
        console.log("   - Irrigation:", userProfile.farmingProfile.irrigationMethod);
      }
      
      session = createSession(sessionId, stationData, userProfile);

      // Welcome message - personalized if profile exists
      const stationName = stationData.station_name !== "Unknown Station" 
        ? stationData.station_name 
        : `Station ${stationData.station_id}`;
      
      const locationText = stationData.district !== "Unknown District" 
        ? ` in ${stationData.district}, ${stationData.state}` 
        : "";
      
      let welcomeMsg = `✅ **Loaded: ${stationName}**${locationText}\n\n**Status:** ${stationData.water_level_status.toUpperCase()} ✓\n**Water Level:** ${stationData.avg_water_level}m\n\n`;
      
      if (userProfile?.farmingProfile) {
        const fp = userProfile.farmingProfile;
        if (fp.crops?.length > 0 || fp.livestock?.length > 0) {
          welcomeMsg += `🌾 **Your Profile:** ${fp.crops?.join(", ") || ""}${fp.crops?.length > 0 && fp.livestock?.length > 0 ? " + " : ""}${fp.livestock?.join(", ") || ""}\n\n`;
        }
      }
      
      welcomeMsg += "Ask me anything about this station!";
      
      console.log("📤 [Chat] Sending welcome message");
      
      return NextResponse.json({
        reply: welcomeMsg,
        stationData: {
          station_id: stationData.station_id,
          station_name: stationData.station_name,
          district: stationData.district,
          state: stationData.state,
          water_level_status: stationData.water_level_status,
        },
        userProfile: userProfile?.farmingProfile ? {
          crops: userProfile.farmingProfile.crops || [],
          livestock: userProfile.farmingProfile.livestock || [],
          landAreaAcres: userProfile.farmingProfile.landAreaAcres,
          irrigationMethod: userProfile.farmingProfile.irrigationMethod,
        } : null,
      });
    }

    // Session exists - process the chat message
    console.log("\n🤖 [Chat] Processing message with existing session...");
    console.log("📚 [Chat] Conversation history length:", session.conversationHistory.length);
    
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Build context for AI with user profile
    const systemContext = buildContextPrompt(
      session.stationData, 
      userRole, 
      session.userProfile
    );

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

    console.log("🚀 [Chat] Calling Groq API...");
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const reply = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";

    console.log("✅ [Chat] Response generated, length:", reply.length, "chars");

    // Add assistant reply to conversation history
    session.conversationHistory.push({
      role: "assistant",
      content: reply,
    });

    console.log("📤 [Chat] Sending response\n");

    return NextResponse.json({
      reply,
      stationData: {
        station_id: session.stationData.station_id,
        station_name: session.stationData.station_name,
        district: session.stationData.district,
        state: session.stationData.state,
      },
    });

  } catch (error) {
    console.error("❌ [Chat] Error:", error);
    console.error(error.stack);
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
      station_name: session.stationData.station_name,
      district: session.stationData.district,
      state: session.stationData.state,
    },
    userProfile: session.userProfile?.farmingProfile || null,
    messageCount: session.conversationHistory.length,
  });
}