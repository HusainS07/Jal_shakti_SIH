// app/api/analytics/nearest/route.js
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";
import { analyzeWaterStatus } from "@/utils/waterLevelStatus";

export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const lon = parseFloat(searchParams.get("lon"));
    const lat = parseFloat(searchParams.get("lat"));

    if (isNaN(lon) || isNaN(lat)) {
      return NextResponse.json({ success: false, error: "Invalid coordinates" }, { status: 400 });
    }

    const nearest = await Station.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lon, lat] },
          distanceField: "distance_meters",
          spherical: true,
          maxDistance: 500000,
        }
      },
      { $limit: 1 }
    ]);

    if (nearest.length === 0) {
      return NextResponse.json({ success: false, message: "No station found" }, { status: 404 });
    }

    const station = nearest[0];
    const waterStatus = analyzeWaterStatus(station);

    // Get latest year data (or fallback to 2023)
    const latestYear = Object.keys(station.historical_water_levels || {})
      .map(Number)
      .sort((a, b) => b - a)[0] || 2023;

    const levels = station.historical_water_levels?.[latestYear] || {};

    const payload = {
      success: true,
      station: {
        station_id: station.station_id,
        village: station.address?.village || "Unknown",
        district: station.address?.district || "Unknown",
        state: station.address?.state || "Unknown",
        aquifer_type: station.aquifer?.type || "Unknown",
        distance_km: Math.round((station.distance_meters / 1000) * 100) / 100,
        waterStatus: waterStatus,

        // Aquifer Parameters
        weathered_zone_depth: station.aquifer?.weathered_zone_depth_m || null,
        fractured_zone_depth: station.aquifer?.fractured_zone_depth_m || null,
        storativity: station.aquifer?.storativity || null,
        transmissivity: station.aquifer?.transmissivity_m2_day || null,
        infiltration_rate: station.aquifer?.infiltration_rate_percent || null,
        storage_capacity: station.aquifer?.estimated_storage_capacity_m3 || null,

        // Extraction Infrastructure
        borewell_count: station.extraction_infrastructure?.borewell_count || null,
        avg_well_depth: station.extraction_infrastructure?.average_depth_m || null,
        handpump_count: station.extraction_infrastructure?.handpump_count || null,
        open_well_count: station.extraction_infrastructure?.open_well_count || null,
        extraction_rate: station.extraction_infrastructure?.average_extraction_rate_m3_day || null,

        // Current Seasonal Levels (latest available)
        current_jan: levels.jan || null,
        current_apr_may: levels.apr_may || null,
        current_aug: levels.aug || null,
        current_nov: levels.nov || null,
      }
    };

    return NextResponse.json(payload);

  } catch (error) {
    console.error("Analytics API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}