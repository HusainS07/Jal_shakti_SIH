import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";
import { analyzeWaterStatus } from "@/utils/waterLevelStatus";

export async function GET(request, { params }) {
  try {
    await dbConnect();

    const { longitude, latitude } = await params;

    if (!longitude || !latitude) {
      return NextResponse.json(
        { success: false, error: "Please provide longitude and latitude in URL" },
        { status: 400 }
      );
    }

    const lon = parseFloat(longitude);
    const lat = parseFloat(latitude);

    if (isNaN(lon) || isNaN(lat)) {
      return NextResponse.json(
        { success: false, error: "Invalid coordinates provided" },
        { status: 400 }
      );
    }

    const nearestStations = await Station.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lon, lat] },
          distanceField: "distance_meters",
          spherical: true,
          maxDistance: 500000,
          query: { station_id: { $exists: true } }
        }
      },
      { $limit: 5 }
    ]);

    if (!nearestStations || nearestStations.length === 0) {
      return NextResponse.json(
        { success: false, message: "No stations found within 500 km radius" },
        { status: 404 }
      );
    }

    // Add water status analysis to each station
    const stationsWithStatus = nearestStations.map(station => {
      const waterStatus = analyzeWaterStatus(station);
      
      return {
        _id: station._id,
        station_id: station.station_id,
        village: station.address?.village,
        district: station.address?.district,
        state: station.address?.state,
        aquifer_type: station.aquifer?.type,
        distance_km: Math.round((station.distance_meters / 1000) * 100) / 100,
        waterStatus: waterStatus
      };
    });

    return NextResponse.json({ 
      success: true, 
      count: stationsWithStatus.length,
      searchLocation: { longitude: lon, latitude: lat },
      stations: stationsWithStatus
    });

  } catch (error) {
    console.error("Fetch nearest stations error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}