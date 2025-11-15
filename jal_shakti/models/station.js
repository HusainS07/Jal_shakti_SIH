import mongoose from "mongoose";

const StationSchema = new mongoose.Schema({
  serialNo: { type: Number, unique: true, required: true },
  district: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
});

// Create 2dsphere index for geospatial queries
StationSchema.index({ location: "2dsphere" });

export default mongoose.models.Station || mongoose.model("station", StationSchema);
