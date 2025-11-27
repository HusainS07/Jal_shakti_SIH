// app/api/user/route.js

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { dbConnect } from "@/lib/dbConnect";
import User from "@/models/user";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

export async function GET(req) {
  try {
    console.log("📋 [GET /api/user] Request received");
    await dbConnect();
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ [GET /api/user] No authorization header");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("✅ [GET /api/user] Token decoded. UserId:", decoded.userId);

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      console.log("❌ [GET /api/user] User not found:", decoded.userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("✅ [GET /api/user] User found:", user.email);
    console.log("👤 [GET /api/user] User Role:", user.role);
    console.log("🚜 [GET /api/user] Farming Profile:", JSON.stringify(user.farmingProfile, null, 2));

    return NextResponse.json({
      message: "Success",
      user: {
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
        farmingProfile: user.farmingProfile || null
      }
    });
  } catch (error) {
    console.error("❌ [GET /api/user] Error:", error.message);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

// NEW: Save farming profile
export async function PUT(req) {
  try {
    console.log("💾 [PUT /api/user] Save farming profile request");
    await dbConnect();
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ [PUT /api/user] No authorization header");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("✅ [PUT /api/user] Token decoded. UserId:", decoded.userId);

    const body = await req.json();
    const { crops, livestock, landAreaAcres, irrigationMethod } = body;
    
    console.log("📝 [PUT /api/user] Incoming data:");
    console.log("  - Crops:", crops);
    console.log("  - Livestock:", livestock);
    console.log("  - Land Area (acres):", landAreaAcres);
    console.log("  - Irrigation Method:", irrigationMethod);

    const updatedUser = await User.findByIdAndUpdate(
      decoded.userId,
      {
        farmingProfile: {
          crops: crops || [],
          livestock: livestock || [],
          landAreaAcres,
          irrigationMethod
        }
      },
      { new: true }
    );

    console.log("✅ [PUT /api/user] Profile updated for user:", decoded.userId);
    console.log("🚜 [PUT /api/user] Updated Farming Profile:", JSON.stringify(updatedUser.farmingProfile, null, 2));

    return NextResponse.json({
      message: "Farming profile saved successfully",
      farmingProfile: updatedUser.farmingProfile
    });

  } catch (error) {
    console.error("❌ [PUT /api/user] Error:", error.message);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}