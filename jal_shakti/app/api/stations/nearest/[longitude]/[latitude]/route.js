import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";

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

    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      return NextResponse.json(
        { success: false, error: "Coordinates out of valid range" },
        { status: 400 }
      );
    }

    console.log("=== SEARCH INFO ===");
    console.log(`Searching near: [${lon}, ${lat}]`);
    console.log(`Max distance: 500 km`);

    // First, check if we can find ANY stations at all
    const totalCount = await Station.countDocuments({ station_id: { $exists: true } });
    console.log(`Total groundwater stations in DB: ${totalCount}`);

    // Try WITHOUT distance limit first
    const anyStations = await Station.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lon, lat] },
          distanceField: "distance_meters",
          spherical: true,
          query: { station_id: { $exists: true } }
          // NO maxDistance - find ANY station
        }
      },
      { $limit: 1 },
      {
        $project: {
          station_id: 1,
          distance_meters: 1,
          distance_km: { $round: [{ $divide: ["$distance_meters", 1000] }, 2] }
        }
      }
    ]);

    console.log("Nearest station (no distance limit):", anyStations[0]);

    // Now try with 500km limit
    const nearestStations = await Station.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lon, lat] },
          distanceField: "distance_meters",
          spherical: true,
          maxDistance: 500000,  // 500 km
          query: { station_id: { $exists: true } }
        }
      },
      { $limit: 5 },
      {
        $project: {
          _id: 1,
          station_id: 1,
          village: "$address.village",
          district: "$address.district",
          state: "$address.state",
          aquifer_type: "$aquifer.type",
          distance_meters: 1,
          distance_km: { $round: [{ $divide: ["$distance_meters", 1000] }, 2] }
        }
      }
    ]);

    console.log(`Found ${nearestStations.length} stations within 500km`);
    console.log("==================");

    if (!nearestStations || nearestStations.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          message: "No groundwater monitoring stations found within 500 km radius",
          searchLocation: { longitude: lon, latitude: lat },
          totalStationsInDB: totalCount,
          nearestStation: anyStations[0] || null,
          suggestion: anyStations[0] 
            ? `Nearest station is ${anyStations[0].distance_km} km away. Try increasing search radius.`
            : "No stations found in database"
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      count: nearestStations.length,
      searchLocation: { longitude: lon, latitude: lat },
      stations: nearestStations
    });

  } catch (error) {
    console.error("Fetch nearest stations error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}