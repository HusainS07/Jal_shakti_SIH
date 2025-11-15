import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";

// IMPORTANT: This is the correct syntax for Next.js 15+
export async function GET(request, { params }) {
  try {
    await dbConnect();

    // Await params - this is the key change
    const resolvedParams = await params;
    const { locations } = resolvedParams;

    if (!locations || locations.length < 2) {
      return NextResponse.json(
        { error: "Please provide longitude and latitude" },
        { status: 400 }
      );
    }

    const longitude = parseFloat(locations[0]);
    const latitude = parseFloat(locations[1]);

    if (isNaN(longitude) || isNaN(latitude)) {
      return NextResponse.json(
        { error: "Invalid coordinates provided" },
        { status: 400 }
      );
    }

    // Fetch stations sorted by nearest first
    const stations = await Station.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [longitude, latitude] },
        },
      },
    }).limit(10);

    return NextResponse.json({ stations });
  } catch (error) {
    console.error("Fetch stations error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}