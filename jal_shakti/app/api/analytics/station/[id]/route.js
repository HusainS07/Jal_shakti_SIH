// app/api/analytics/station/[id]/route.js
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";
import { analyzeWaterStatus } from "@/utils/waterLevelStatus";

export async function GET(request, { params }) {
  const startTime = Date.now();
  console.log("Analytics /station/[id] API called");

  try {
    await dbConnect();

    // Await params in Next.js 15+
    const { id } = await params;
    
    if (!id) {
      console.warn("No station ID provided");
      return NextResponse.json(
        { success: false, error: "Station ID is required" },
        { status: 400 }
      );
    }

    console.log(`Looking for station: ${id}`);

    // Find station by station_id
    const station = await Station.findOne({ station_id: id }).lean();

    if (!station) {
      console.log(`Station not found: ${id}`);
      return NextResponse.json(
        { success: false, error: "Station not found" },
        { status: 404 }
      );
    }

    console.log(`Found station: ${station.station_id}`);

    const waterStatus = analyzeWaterStatus(station);

    const latestYear = Object.keys(station.historical_water_levels || {})
      .map(Number)
      .sort((a, b) => b - a)[0] || 2023;
    const levels = station.historical_water_levels?.[latestYear] || {};

    console.log(`Using groundwater levels from year: ${latestYear}`);

    // ————————————————
    // SMART RAINFALL FORECAST (Mapresso primary + fallback)
    // ————————————————
    let rainfall_forecast = [];
    
    // Get coordinates for rainfall API
    const lat = station.location?.coordinates?.[1] || station.latitude;
    const lon = station.location?.coordinates?.[0] || station.longitude;

    if (lat && lon) {
      // 1. Primary: Mapresso Climate API (monthly historical/avg precipitation)
      const fetchMapresso = async () => {
        try {
          const url = `https://climate.mapresso.com/api/data/?lat=${lat}&lon=${lon}`;
          console.log(`Fetching rainfall from Mapresso...`);
          const res = await fetch(url, { next: { revalidate: 3600 } });
          const json = await res.json();

          if (json.status === "OK" && json.data && Array.isArray(json.data) && json.data.length >= 12) {
            const data = json.data.map(item => ({
              month: item.month,
              precipitation_mm: Math.round(item.prec || 0),
            })).slice(0, 12); // Ensure exactly 12 months
            console.log(`Mapresso → Success: ${data.length} months`);
            return data;
          } else {
            console.warn(`Mapresso → Unavailable: Invalid response (status: ${json.status})`);
            return null;
          }
        } catch (err) {
          console.warn(`Mapresso → Failed:`, err.message);
          return null;
        }
      };

      rainfall_forecast = await fetchMapresso();

      // 2. Fallback to previous 3-tier if Mapresso fails
      if (!rainfall_forecast || rainfall_forecast.length === 0) {
        console.log("Mapresso failed → Falling back to previous sources");
        
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

        // Fallback 1: SEAS5 (best seasonal forecast)
        rainfall_forecast = await fetchWithLog(
          `https://api.open-meteo.com/v1/seasonal?latitude=${lat}&longitude=${lon}&monthly=precipitation_mean&models=seas5`,
          "SEAS5"
        );

        // Fallback 2: ECMWF IFS (reliable 12-month forecast)
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

        // Fallback 3: Final fallback: Realistic Indian monsoon pattern
        if (!rainfall_forecast || rainfall_forecast.length === 0) {
          console.log("All external sources failed → Using realistic monsoon template");
          const year = new Date().getFullYear();
          const monsoon = [15, 12, 18, 25, 60, 120, 280, 320, 290, 180, 60, 25];
          rainfall_forecast = monsoon.map((mm, i) => ({
            month: i + 1, // Use numeric month (1-12) to match Mapresso format
            precipitation_mm: mm,
          }));
        }
      }
    } else {
      console.warn("No coordinates available for rainfall forecast → Using monsoon template");
      // Direct fallback if no coords
      const monsoon = [15, 12, 18, 25, 60, 120, 280, 320, 290, 180, 60, 25];
      rainfall_forecast = monsoon.map((mm, i) => ({
        month: i + 1,
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
        latitude: lat,
        longitude: lon,

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