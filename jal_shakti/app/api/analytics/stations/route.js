// app/api/analytics/stations/route.js
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";

export async function GET(request) {
  const startTime = Date.now();
  console.log("Analytics /stations API called");

  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit")) || 5;

    console.log(`Search query: "${search}" | Limit: ${limit}`);

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { station_id: { $regex: search, $options: "i" } },
        { "address.village": { $regex: search, $options: "i" } },
        { "address.district": { $regex: search, $options: "i" } },
      ];
    }

    // Get stations with basic info only
    const stations = await Station.find(query, {
      station_id: 1,
      "address.village": 1,
      "address.district": 1,
      "address.state": 1,
      "location.coordinates": 1,
      _id: 0,
    })
      .limit(limit)
      .lean();

    console.log(`Found ${stations.length} stations`);

    // Format response
    const formatted = stations.map(s => ({
      station_id: s.station_id,
      village: s.address?.village || "Unknown",
      district: s.address?.district || "Unknown",
      state: s.address?.state || "Unknown",
      label: `${s.station_id} - ${s.address?.village || "Unknown"}, ${s.address?.district || "Unknown"}`,
      latitude: s.location?.coordinates?.[1],
      longitude: s.location?.coordinates?.[0],
    }));

    const duration = Date.now() - startTime;
    console.log(`API SUCCESS in ${duration}ms`);

    return NextResponse.json({
      success: true,
      count: formatted.length,
      stations: formatted,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`API FAILED after ${duration}ms:`, error.message);
    console.error("Stack:", error.stack);

    return NextResponse.json(
      { success: false, error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}