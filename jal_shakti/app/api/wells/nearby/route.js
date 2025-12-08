
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Well from "@/models/well";

export async function GET(request) {
  try {
    console.log("📍 [GET /api/wells/nearby] Request received");
    
    const { searchParams } = new URL(request.url);
    const latitude = parseFloat(searchParams.get('latitude'));
    const longitude = parseFloat(searchParams.get('longitude'));
    const limit = parseInt(searchParams.get('limit') || '6');
    
    console.log(`📋 [GET /api/wells/nearby] Params: lat=${latitude}, lon=${longitude}, limit=${limit}`);
    
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      console.log("❌ [GET /api/wells/nearby] Invalid latitude or longitude");
      return NextResponse.json(
        { error: 'Valid latitude and longitude are required' },
        { status: 400 }
      );
    }

    await dbConnect();
    console.log("✅ [GET /api/wells/nearby] Database connected");

    // Query nearest wells using $geoNear aggregation
    const nearbyWells = await Well.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude]  // [Longitude, Latitude]
          },
          distanceField: "distance_m",
          spherical: true
        }
      },
      {
        $limit: limit
      },
      {
        $addFields: {
          distance_km: { $round: [{ $divide: ["$distance_m", 1000] }, 2] }
        }
      },
      {
        $project: {
          _id: 1,
          Well_ID: 1,
          Village: 1,
          Latitude: 1,
          Longitude: 1,
          Aquifer_Type: 1,
          Sy: 1,
          Area_m2: 1,
          Num_Readings: 1,
          Dates: 1,
          Water_Levels: 1,
          Delta_h_m: 1,
          Delta_S_m3: 1,
          Delta_S_MCM: 1,
          Latest_Water_Level: 1,
          Latest_Delta_h_m: 1,
          Latest_Delta_S_m3: 1,
          First_Reading_Date: 1,
          Latest_Reading_Date: 1,
          distance_m: 1,
          distance_km: 1
        }
      }
    ]);

    console.log(`✅ [GET /api/wells/nearby] Found ${nearbyWells.length} wells`);
    
    if (nearbyWells.length > 0) {
      console.log(`📊 [GET /api/wells/nearby] Closest well: ${nearbyWells[0].Well_ID} - ${nearbyWells[0].Village} (${nearbyWells[0].distance_km} km)`);
    }

    return NextResponse.json({
      success: true,
      count: nearbyWells.length,
      query: {
        latitude,
        longitude,
        limit
      },
      wells: nearbyWells
    });

  } catch (error) {
    console.error("❌ [GET /api/wells/nearby] Error:", error.message);
    return NextResponse.json(
      { error: 'Failed to fetch nearby wells', details: error.message },
      { status: 500 }
    );
  }
}

