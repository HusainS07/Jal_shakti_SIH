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

// Helper function to generate fallback reasoning (translated to user language)
function generateFallbackReasoning(role, userProfile, avgLevel, waterStatus, quality, dailyLimitLiters, borewellCount, station, languageId) {
  const lang = LANGUAGE_MAP[languageId] || "English";
  const isHindi = languageId === "hi";

  return {
    role_based_justification: isHindi 
      ? `ये सिफारिशें विशेष रूप से ${role} के लिए डिज़ाइन की गई हैं जो भूजल प्रबंधन पर सूचित निर्णय लेने की आवश्यकता है। ${role} के रूप में, आपके पास जल संसाधन योजना, नीति कार्यान्वयन और सतत उपयोग सुनिश्चित करने की अनोखी जिम्मेदारियां हैं। सामान्य उपयोगकर्ताओं के विपरीत, आपकी भूमिका तकनीकी पैरामीटर, दीर्घकालिक रुझानों और जल प्रबंधन निर्णयों के नीति प्रभावों को समझने की आवश्यकता है।`
      : `These recommendations are specifically designed for ${role}s who need to make informed decisions about groundwater management. As a ${role}, you have unique responsibilities in water resource planning, policy implementation, and ensuring sustainable use. Unlike general users, your role requires understanding technical parameters, long-term trends, and policy implications of water management decisions.`,
    
    profile_based_customization: userProfile && (userProfile.crops?.length > 0 || userProfile.livestock?.length > 0) 
      ? isHindi
        ? `आपका खेती प्रोफाइल जिसमें ${userProfile.crops?.join(", ") || "विभिन्न"} फसलें, ${userProfile.livestock?.join(", ") || "पशुधन"}, ${userProfile.landAreaAcres || "आपकी"} एकड़ भूमि, और ${userProfile.irrigationMethod} सिंचाई विधि शामिल है, ने इन सिफारिशों को सीधे आकार दिया है। ${userProfile.crops?.[0] || "आपकी फसलों"} के लिए पानी की आवश्यकताओं को विशेष रूप से ध्यान में रखा गया है, साथ ही पशुधन की पानी की जरूरतें और आपकी वर्तमान सिंचाई प्रणाली की दक्षता।`
        : `Your farming profile with ${userProfile.crops?.join(", ") || "various"} crops, ${userProfile.livestock?.join(", ") || "livestock"}, ${userProfile.landAreaAcres || "your"} acres of land, and ${userProfile.irrigationMethod} irrigation method has directly shaped these recommendations. The water requirements for ${userProfile.crops?.[0] || "your crops"} are specifically considered, along with livestock water needs and the efficiency of your current irrigation system.`
      : isHindi
        ? `चूंकि आपने अभी तक अपने प्रोफाइल में विस्तृत खेती जानकारी (फसलें, पशुधन) नहीं जोड़ी है, इसलिए हमने अधिकांश ${role} के लिए लागू सामान्य सिफारिशें प्रदान की हैं। यदि आप अपने प्रोफाइल सेटिंग्स में अपनी कृषि गतिविधियों के बारे में विवरण जोड़ते हैं, तो ये सिफारिशें बहुत अधिक विशिष्ट और मूल्यवान हो सकती हैं।`
        : `Since you haven't added detailed farming information (crops, livestock) to your profile yet, we've provided general recommendations applicable to most ${role}s. These recommendations can become much more specific and valuable if you add details about your agricultural activities in your profile settings.`,
    
    station_conditions_impact: isHindi
      ? `वर्तमान जल स्तर ${avgLevel} मीटर पर है जो ${waterStatus} स्थिति दर्शाता है, जो हमारी सिफारिशों की तात्कालिकता को सीधे प्रभावित करता है। जल गुणवत्ता पैरामीटर pH ${quality.ph}, TDS ${quality.tds} mg/L, और फ्लोराइड ${quality.fluoride} mg/L दिखाते हैं, इसलिए हमने विशिष्ट उपचार और निगरानी सुझाव दिए हैं। दैनिक निष्कर्षण क्षमता ${dailyLimitLiters.toLocaleString()} लीटर है जो संरक्षण उपायों के पैमाने को निर्धारित करती है। ये स्थानीय स्थितियां हमारी सिफारिशों को सामान्य सलाह से अधिक कार्रवाई योग्य बनाती हैं।`
      : `The current water level of ${avgLevel}m indicates a ${waterStatus} status, which directly influences the urgency of our recommendations. With water quality parameters showing pH ${quality.ph}, TDS ${quality.tds} mg/L, and Fluoride ${quality.fluoride} mg/L, we've tailored specific treatment and monitoring suggestions. The daily extraction capacity of ${dailyLimitLiters.toLocaleString()} liters determines the scale of conservation measures needed. These local conditions make our recommendations more actionable than generic advice.`,
    
    comparison_to_generic: isHindi
      ? `सामान्य जल प्रबंधन गाइड के विपरीत जो एक ही आकार की सलाह देते हैं, ये सिफारिशें आपके ${role} के रूप में विशिष्ट भूमिका, इस स्टेशन पर वास्तविक जल स्थितियों (${waterStatus} स्तर विशिष्ट गुणवत्ता पैरामीटर के साथ), और ${station.address?.district || "इस क्षेत्र"} में आपके स्थान के अनुसार तैयार की गई हैं। यह व्यक्तिगतकरण सलाह को आपके स्थिति के लिए सीधे लागू बनाता है न कि व्याख्या या अनुकूलन की आवश्यकता।`
      : `Unlike generic water management guides that provide one-size-fits-all solutions, these recommendations are calibrated to your specific role as ${role}, the actual water conditions at this station (${waterStatus} level with specific quality parameters), and your location in ${station.address?.district || "this region"}. This personalization means the advice is directly applicable to your situation rather than requiring interpretation or adaptation.`,
    
    key_personalization_factors: [
      isHindi ? `उपयोगकर्ता भूमिका: ${role} - तकनीकी गहराई और नीति दृष्टिकोण की आवश्यकता` : `User role: ${role} - requiring technical depth and policy perspective`,
      userProfile && (userProfile.crops?.length > 0 || userProfile.livestock?.length > 0) 
        ? isHindi ? `कृषि प्रोफाइल: ${userProfile.crops?.join(", ") || "फसलें"} ${userProfile.irrigationMethod} सिंचाई के साथ` : `Agricultural Profile: ${userProfile.crops?.join(", ") || "crops"} with ${userProfile.irrigationMethod} irrigation`
        : isHindi ? `सामान्य सिफारिशें (न्यूनतम कृषि प्रोफाइल प्रदान की गई)` : `General recommendations (minimal farming profile provided)`,
      isHindi ? `स्थानीय जल स्थिति: ${waterStatus} स्तर ${avgLevel}m पर ${waterStatus === 'critical' ? 'तत्काल' : waterStatus === 'low' ? 'तत्काल' : 'निवारक'} कार्रवाई की आवश्यकता` : `Local Water Status: ${waterStatus} level at ${avgLevel}m requiring ${waterStatus === 'critical' ? 'urgent' : waterStatus === 'low' ? 'immediate' : 'preventive'} action`,
      isHindi ? `क्षेत्रीय संदर्भ: ${station.address?.district || "इस"} जिले में विशिष्ट जलवायु और भूवैज्ञानिक विशेषताएं` : `Regional Context: ${station.address?.district || "This"} district with specific climatic and geological characteristics`,
      isHindi ? `बुनियादी ढांचा बाधाएं: ${dailyLimitLiters.toLocaleString()}L/दिन निष्कर्षण क्षमता ${borewellCount} बोरवेल्स में` : `Infrastructure Constraints: ${dailyLimitLiters.toLocaleString()}L/day extraction capacity across ${borewellCount} borewells`,
      isHindi ? `जल गुणवत्ता प्रोफाइल: pH ${quality.ph}, TDS ${quality.tds} mg/L, फ्लोराइड ${quality.fluoride} mg/L विशिष्ट उपचार की आवश्यकता` : `Water Quality Profile: pH ${quality.ph}, TDS ${quality.tds} mg/L, Fluoride ${quality.fluoride} mg/L requiring specific treatments`
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

    // ============ STEP 2: FETCH USER DATA ============
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

    // ============ STEP 6: CHECK CACHE ============
    const cacheKey = getCacheKey(station_id, role, userId, languageId);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      console.log("⚡ Returning cached response");
      
      // Translate cached reasoning to user language
      cached.data.personalization_reasoning = generateFallbackReasoning(
        role, userProfile, avgLevel, waterStatus, quality, dailyLimitLiters, borewellCount, station, languageId
      );
      
      return NextResponse.json(cached.data);
    }

    // ============ STEP 7: BUILD AI PROMPT ============
    const prompt = `You are a senior water management expert in India. Analyze this groundwater station and provide comprehensive, practical recommendations in ${languageName}.

⚠️ CRITICAL REQUIREMENT: You MUST include a "personalization_reasoning" section as the FIRST field in your JSON response. All content must be in ${languageName} language.

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

Return ONLY valid JSON with this structure (all content in ${languageName}):

{
  "personalization_reasoning": {
    "role_based_justification": "3-4 sentences explaining WHY these recommendations are specifically for a ${role}. How does their role differ from others? (in ${languageName})",
    "profile_based_customization": "${userProfile ? `Explain how the user's crops (${userProfile.crops?.join(", ")}), livestock, land size (${userProfile.landAreaAcres} acres), and irrigation (${userProfile.irrigationMethod}) shaped these recommendations. (in ${languageName})` : "Explain that general recommendations are provided due to no farming profile, but can be personalized if they add profile details. (in ${languageName})"}",
    "station_conditions_impact": "Explain how water level at ${avgLevel}m (${waterStatus}), quality parameters (pH: ${quality.ph}, TDS: ${quality.tds}, Fluoride: ${quality.fluoride}), and extraction capacity (${dailyLimitLiters}L/day) influenced these recommendations. (in ${languageName})",
    "comparison_to_generic": "2-3 sentences on what makes these recommendations MORE USEFUL than generic water management advice. Be specific. (in ${languageName})",
    "key_personalization_factors": [
      "User role (${role}) and specific needs (in ${languageName})",
      "${userProfile ? `Specific crops/livestock requiring tailored management (in ${languageName})` : `No farming profile - general recommendations (in ${languageName})`}",
      "Local water conditions (${waterStatus} level, quality) (in ${languageName})",
      "Regional context (${station.address?.district || "this"} district) (in ${languageName})",
      "Extraction capacity and infrastructure limits (in ${languageName})"
    ]
  },
  "overall_summary": {
    "water_quality_status": "Analyze if water is safe/moderate/poor based on pH: ${quality.ph}, TDS: ${quality.tds}, Fluoride: ${quality.fluoride}, Nitrate: ${quality.nitrate} (in ${languageName})",
    "water_availability_status": "Describe water level (${avgLevel}m = ${waterStatus}), sustainability, extraction capacity (${dailyLimitLiters}L/day) (in ${languageName})",
    "urgent_actions": ["3-4 critical actions based on ${waterStatus} level and quality (in ${languageName})"]
  },
  "water_quality": {
    "status": "safe/moderate/poor",
    "summary": "Brief assessment (in ${languageName})",
    "parameters_analysis": {
      "ph": "${quality.ph}",
      "tds": "${quality.tds}",
      "fluoride": "${quality.fluoride}",
      "nitrate": "${quality.nitrate}",
      "arsenic": "${quality.arsenic}"
    },
    "treatment_needed": ["4-5 treatments (in ${languageName})"],
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
    "crop_suggestions": ["5 water-efficient crops for ${station.address?.district} (in ${languageName})"],
    "irrigation_tips": ["5 optimization tips (in ${languageName})"],
    "immediate_actions": ["5 urgent steps (in ${languageName})"]
  },` : ""}
  ${role === "decision maker" || role === "ground water researcher" || role === "town planner" ? `"policy_recommendations": {
    "executive_summary": "2-3 sentence summary (in ${languageName})",
    "immediate_actions": ["5 urgent policy actions (in ${languageName})"],
    "infrastructure_needs": ["4 critical projects (in ${languageName})"]
  },` : ""}
  "general_recommendations": {
    "water_conservation": ["5 tips (in ${languageName})"],
    "community_initiatives": ["4 actions (in ${languageName})"]
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
            content: `You are a water management expert. Return ONLY valid JSON. The personalization_reasoning field MUST be the first field. All content inside JSON must be in ${languageName} language.`
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
      
      // FORCE ADD REASONING IF MISSING (translated)
      if (!data.personalization_reasoning) {
        console.log("⚠️ AI didn't provide reasoning - generating fallback");
        data.personalization_reasoning = generateFallbackReasoning(
          role, userProfile, avgLevel, waterStatus, quality, dailyLimitLiters, borewellCount, station, languageId
        );
      }
      
    } catch (error) {
      console.error("❌ AI Error:", error.message);
      
      // Fallback with reasoning (translated)
      data = {
        personalization_reasoning: generateFallbackReasoning(
          role, userProfile, avgLevel, waterStatus, quality, dailyLimitLiters, borewellCount, station, languageId
        ),
        overall_summary: {
          water_quality_status: languageId === "hi" ? `जल गुणवत्ता: pH ${quality.ph}, TDS ${quality.tds} mg/L` : `Water quality: pH ${quality.ph}, TDS ${quality.tds} mg/L`,
          water_availability_status: languageId === "hi" ? `जल स्तर: ${avgLevel}m (${waterStatus})` : `Water level: ${avgLevel}m (${waterStatus})`,
          urgent_actions: languageId === "hi" ? ["जल गुणवत्ता की निगरानी करें", "संरक्षण उपाय लागू करें"] : ["Monitor water quality", "Implement conservation measures"]
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