import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Station from "@/models/station";
import mongoose from "mongoose";

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    console.log("🔍 Searching for ID:", id);
    console.log("🔍 ID type:", typeof id);
    console.log("🔍 Is valid ObjectId:", mongoose.Types.ObjectId.isValid(id));

    // Try multiple search strategies
    
    // Strategy 1: Search by _id
    let stationData = await Station.findById(id);
    console.log("📄 Strategy 1 (findById):", stationData ? "FOUND" : "NOT FOUND");

    // Strategy 2: Search by _id as ObjectId
    if (!stationData) {
      stationData = await Station.findOne({ _id: new mongoose.Types.ObjectId(id) });
      console.log("📄 Strategy 2 (ObjectId):", stationData ? "FOUND" : "NOT FOUND");
    }

    // Strategy 3: Search by station_id field
    if (!stationData) {
      stationData = await Station.findOne({ station_id: id });
      console.log("📄 Strategy 3 (station_id):", stationData ? "FOUND" : "NOT FOUND");
    }

    // If still not found, show what we have
    if (!stationData) {
      const allStations = await Station.find().limit(5).select('_id station_id');
      console.log("📊 Sample IDs from database:");
      allStations.forEach(s => {
        console.log(`   - _id: ${s._id} (type: ${typeof s._id})`);
        console.log(`     station_id: ${s.station_id}`);
      });

      return NextResponse.json(
        { 
          success: false, 
          error: "No station found",
          debug: {
            requestedId: id,
            sampleIds: allStations.map(s => ({
              _id: s._id.toString(),
              station_id: s.station_id
            }))
          }
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: stationData },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}