// app/api/analytics/nearest/route.js
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";
import { analyzeWaterStatus } from "@/utils/waterLevelStatus";

export async function GET(request) {
  const startTime = Date.now();
  console.log("Analytics /nearest API called");

  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const lon = parseFloat(searchParams.get("lon"));
    const lat = parseFloat(searchParams.get("lat"));

    console.log(`Request coordinates: lat=${lat}, lon=${lon}`);

    if (isNaN(lon) || isNaN(lat)) {
      console.warn("Invalid coordinates provided");
      return NextResponse.json({ success: false, error: "Invalid coordinates" }, { status: 400 });
    }

    console.log("Finding nearest groundwater station...");
    const nearest = await Station.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lon, lat] },
          distanceField: "distance_meters",
          spherical: true,
          maxDistance: 500000, // 500 km
        },
      },
      { $limit: 1 },
    ]);

    if (nearest.length === 0) {
      console.log("No station found within 500km");
      return NextResponse.json({ success: false, message: "No station found within 500km" }, { status: 404 });
    }

    const station = nearest[0];
    console.log(`Nearest station: ${station.station_id} | ${(station.distance_meters / 1000).toFixed(2)} km away`);

    const waterStatus = analyzeWaterStatus(station);

    const latestYear = Object.keys(station.historical_water_levels || {})
      .map(Number)
      .sort((a, b) => b - a)[0] || 2023;
    const levels = station.historical_water_levels?.[latestYear] || {};

    console.log(`Using groundwater levels from year: ${latestYear}`);

    // ————————————————
    // SMART RAINFALL FORECAST (3-tier fallback)
    // ————————————————
    let rainfall_forecast = [];

    const fetchWithLog = async (url, name) => {
      try {
        console.log(`Fetching rainfall from ${name}...`);
        const res = await fetch(url, { next: { revalidate: 3600 } });
        const json = await res.json();

        if (json.monthly?.time && json.monthly.precipitation_mean) {
          const data = json.monthly.time.map((month, i) => ({
            month,
            precipitation_mm: Math.round(json.monthly.precipitation_mean[i] || 0),
          }));
          console.log(`${name} → Success: ${data.length} months`);
          return data;
        } else if (json.reason || json.error) {
          console.warn(`${name} → Unavailable:`, json.reason || json.error);
          return null;
        }
      } catch (err) {
        console.warn(`${name} → Failed:`, err.message);
      }
      return null;
    };

    // 1. Try SEAS5 (best seasonal forecast)
    rainfall_forecast = await fetchWithLog(
      `https://api.open-meteo.com/v1/seasonal?latitude=${lat}&longitude=${lon}&monthly=precipitation_mean&models=seas5`,
      "SEAS5"
    );

    // 2. Fallback: ECMWF IFS (reliable 12-month forecast)
    if (!rainfall_forecast) {
      const dailyData = await fetchWithLog(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum&forecast_days=365&models=ecmwf_ifs04`,
        "ECMWF IFS (daily)"
      );

      if (dailyData?.daily) {
        const monthly = {};
        dailyData.daily.time.forEach((date, i) => {
          const month = date.slice(0, 7);
          monthly[month] = (monthly[month] || 0) + (dailyData.daily.precipitation_sum[i] || 0);
        });
        rainfall_forecast = Object.entries(monthly).map(([month, mm]) => ({
          month,
          precipitation_mm: Math.round(mm),
        }));
        console.log("Converted daily → monthly rainfall (ECMWF IFS)");
      }
    }

    // 3. Final fallback: Realistic Indian monsoon pattern
    if (!rainfall_forecast || rainfall_forecast.length === 0) {
      console.log("All external sources failed → Using realistic monsoon template");
      const year = new Date().getFullYear();
      const monsoon = [15, 12, 18, 25, 60, 120, 280, 320, 290, 180, 60, 25];
      rainfall_forecast = monsoon.map((mm, i) => ({
        month: `${i < 6 ? year : year + 1}-${String(i + 1).padStart(2, "0")}`,
        precipitation_mm: mm,
      }));
    }

    // ————————————————
    // Build final response
    // ————————————————
    const payload = {
      success: true,
      station: {
        station_id: station.station_id,
        village: station.address?.village || "Unknown",
        district: station.address?.district || "Unknown",
        state: station.address?.state || "Unknown",
        distance_km: Math.round((station.distance_meters / 1000) * 100) / 100,

        aquifer_type: station.aquifer?.type || "Unknown",
        waterStatus,

        weathered_zone_depth: station.aquifer?.weathered_zone_depth_m || null,
        fractured_zone_depth: station.aquifer?.fractured_zone_depth_m || null,
        storativity: station.aquifer?.storativity || null,
        transmissivity: station.aquifer?.transmissivity_m2_day || null,
        infiltration_rate: station.aquifer?.infiltration_rate_percent || null,
        storage_capacity: station.aquifer?.estimated_storage_capacity_m3 || null,

        borewell_count: station.extraction_infrastructure?.borewell_count || null,
        avg_well_depth: station.extraction_infrastructure?.average_depth_m || null,
        handpump_count: station.extraction_infrastructure?.handpump_count || null,
        open_well_count: station.extraction_infrastructure?.open_well_count || null,
        extraction_rate: station.extraction_infrastructure?.average_extraction_rate_m3_day || null,

        current_jan: levels.jan || null,
        current_apr_may: levels.apr_may || null,
        current_aug: levels.aug || null,
        current_nov: levels.nov || null,

        rainfall_forecast,
      },
    };

    const duration = Date.now() - startTime;
    console.log(`API SUCCESS in ${duration}ms | Station: ${station.station_id} | Rainfall: ${rainfall_forecast.length} months`);

    return NextResponse.json(payload);
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