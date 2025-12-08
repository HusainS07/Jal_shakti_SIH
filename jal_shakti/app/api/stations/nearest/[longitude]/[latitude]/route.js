// jal_shakti/app/api/stations/nearest/[longitude]/[latitude]/route.js
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";
import { analyzeWaterStatus } from "@/utils/waterLevelStatus";

const OPENTOPO_API = "https://api.opentopodata.org/v1/srtm90m";

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

    // 1. Find 6 nearest stations
    const nearestStations = await Station.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lon, lat] },
          distanceField: "distance_meters",
          spherical: true,
          maxDistance: 500000, // 500 km
          query: { station_id: { $exists: true } },
        },
      },
      { $limit: 6 },
    ]);

    if (!nearestStations || nearestStations.length === 0) {
      return NextResponse.json(
        { success: false, message: "No stations found within 500 km radius" },
        { status: 404 }
      );
    }

    // 2. Prepare location string for OpenTopoData (format: lat1,lng1|lat2,lng2|...)
    const locationsParam = nearestStations
      .map((s) => {
        const [lng, lat] = s.location.coordinates; // MongoDB stores [lng, lat]
        return `${lat},${lng}`;
      })
      .join("|");

    // 3. Fetch elevations in one batch request
    let elevationResults = [];
    try {
      const topoRes = await fetch(`${OPENTOPO_API}?locations=${locationsParam}`);
      if (topoRes.ok) {
        const data = await topoRes.json();
        elevationResults = data.results || [];
      } else {
        console.warn("OpenTopoData returned non-200:", topoRes.status);
      }
    } catch (err) {
      console.error("Error fetching elevation data:", err.message);
      // We continue without elevation if the external API fails
    }

    // Create a map: "lat,lng" → elevation
    const elevationMap = new Map();
    elevationResults.forEach((res) => {
      const key = `${res.location.lat},${res.location.lng}`;
      elevationMap.set(key, res.elevation ?? null);
    });

    // 4. Build final response with elevation
    const stationsWithStatus = nearestStations.map((station) => {
      const [lng, lat] = station.location.coordinates;
      const coordKey = `${lat},${lng}`;
      const elevation = elevationMap.get(coordKey) ?? null;

      const waterStatus = analyzeWaterStatus(station);

      return {
        _id: station._id,
        station_id: station.station_id,
        village: station.address?.village,
        district: station.address?.district,
        state: station.address?.state,
        aquifer_type: station.aquifer?.type,
        distance_km: Math.round((station.distance_meters / 1000) * 100) / 100,
                      // ← NEW FIELD
        waterStatus,
        location: {
          longitude: lng,
          latitude: lat,
        },
         elevation_meters: elevation,
      };
    });

    return NextResponse.json({
      success: true,
      count: stationsWithStatus.length,
      searchLocation: { longitude: lon, latitude: lat },
      stations: stationsWithStatus,
    });
  } catch (error) {
    console.error("Fetch nearest stations error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}