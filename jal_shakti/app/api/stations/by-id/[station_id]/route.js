// app/api/stations/by-id/[station_id]/route.js

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";
import { analyzeWaterStatus } from "@/utils/waterLevelStatus";

export async function GET(request, { params }) {
  try {
    await dbConnect();

    const { station_id } = await params;

    if (!station_id) {
      return NextResponse.json(
        { success: false, error: "station_id is required" },
        { status: 400 }
      );
    }

    // First: Get the raw station document
    const station = await Station.findOne({ station_id }).lean();

    if (!station) {
      return NextResponse.json(
        { success: false, message: "Station not found" },
        { status: 404 }
      );
    }

    // Manually run analyzeWaterStatus (no $function!)
    const waterStatus = analyzeWaterStatus(station);

    // Get latest year levels
    const years = Object.keys(station.historical_water_levels || {})
      .map(Number)
      .sort((a, b) => b - a);
    const latestYear = years[0];
    const current_levels = station.historical_water_levels?.[latestYear] || {};

    // Join water quality & usage (simple find)
    const quality = await mongoose.connection
      .collection("water-quality")
      .findOne({ station_id });

    const usage = await mongoose.connection
      .collection("water-usage")
      .findOne({ station_id });

    // Build clean response
    const response = {
      success: true,
      data: {
        station_id: station.station_id,
        location: {
          village: station.address?.village || "Unknown",
          block: station.address?.block || "Unknown",
          district: station.address?.district || "Unknown",
          state: station.address?.state || "Unknown"
        },
        current_water_level: {
          depth_m: waterStatus.currentDepth,
          period: waterStatus.referencePeriod,
          status: waterStatus.status,
          status_color: waterStatus.statusColor,
          short: waterStatus.statusShort
        },
        seasonal_levels_latest: {
          jan: current_levels.jan || null,
          apr_may: current_levels.apr_may || null,
          aug: current_levels.aug || null,
          nov: current_levels.nov || null
        },
        aquifer: {
          type: station.aquifer?.type || "Unknown",
          weathered_zone_m: station.aquifer?.weathered_zone_depth_m,
          fractured_zone_m: station.aquifer?.fractured_zone_depth_m,
          storativity: station.aquifer?.storativity,
          transmissivity_m2_day: station.aquifer?.transmissivity_m2_day,
          infiltration_rate_percent: station.aquifer?.infiltration_rate_percent,
          storage_capacity_m3: station.aquifer?.estimated_storage_capacity_m3
        },
        extraction: {
          borewells: station.extraction_infrastructure?.borewell_count,
          handpumps: station.extraction_infrastructure?.handpump_count,
          open_wells: station.extraction_infrastructure?.open_well_count,
          avg_depth_m: station.extraction_infrastructure?.average_depth_m,
          daily_extraction_m3: station.extraction_infrastructure?.average_extraction_rate_m3_day
        },
        water_quality: quality?.water_quality
          ? {
              year: quality.water_quality.year,
              ph: quality.water_quality.ph,
              ec_uScm: quality.water_quality.ec_uScm,
              total_hardness_mgL: quality.water_quality.total_hardness_mgL,
              no3_mgL: quality.water_quality.no3_mgL,
              f_mgL: quality.water_quality.f_mgL,
              suitability:
                quality.water_quality.ph >= 6.5 &&
                quality.water_quality.ph <= 8.5 &&
                quality.water_quality.ec_uScm <= 3000 &&
                quality.water_quality.no3_mgL <= 45 &&
                quality.water_quality.f_mgL <= 1.5
                  ? "POTABLE"
                  : "REQUIRES TREATMENT"
            }
          : null,
        water_usage: usage || null
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}