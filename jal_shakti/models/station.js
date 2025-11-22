import mongoose from "mongoose";

const StationSchema = new mongoose.Schema({
  serialNo: { type: Number, unique: true, required: true },
  station_id: { type: String, required: true },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },

  address: {
    state: { type: String, required: true },
    district: { type: String, required: true },
    block: { type: String, required: true },
    village: { type: String, required: true },
  },

  aquifer: {
    type: {
      type: String, required: true, // e.g. ALLUVIAL_AQUIFER
    },
    weathered_zone_depth_m: Number,
    fractured_zone_depth_m: Number,
    storativity: Number,
    transmissivity_m2_day: Number,
    infiltration_rate_percent: Number,
    estimated_storage_capacity_m3: Number,
    data_source: String,
    confidence: String,
  },

  extraction_infrastructure: {
    borewell_count: Number,
    average_depth_m: Number,
    handpump_count: Number,
    open_well_count: Number,
    average_extraction_rate_m3_day: Number,
    data_source: String,
    confidence: String,
  },

  historical_water_levels: {
    type: Map,
    of: {
      jan: Number,
      apr_may: Number,
      aug: Number,
      nov: Number,
    },
  },
});


StationSchema.index({ location: "2dsphere" });

export default mongoose.models.Station ||
  mongoose.model("Station", StationSchema);
