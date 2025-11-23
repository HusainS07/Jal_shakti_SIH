import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";

export async function GET(request, { params }) {
  try {
    await dbConnect();

    const { longitude, latitude } = params;

    if (!longitude || !latitude) {
      return NextResponse.json(
        { error: "Please provide longitude and latitude in URL" },
        { status: 400 }
      );
    }

    const lon = parseFloat(longitude);
    const lat = parseFloat(latitude);

    if (isNaN(lon) || isNaN(lat)) {
      return NextResponse.json(
        { error: "Invalid coordinates provided" },
        { status: 400 }
      );
    }

    const stations = await Station.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lon, lat] },
          $maxDistance: 20000, // 🚀 20km radius (adjustable)
        },
      },
    }).limit(10);

    return NextResponse.json({ success: true, stations });
  } catch (error) {
    console.error("Fetch stations error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
