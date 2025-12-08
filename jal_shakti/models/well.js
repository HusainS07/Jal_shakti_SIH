
import mongoose from "mongoose";

const wellSchema = new mongoose.Schema({
  Well_ID: { type: String, required: true, unique: true },
  Village: String,
  Latitude: Number,
  Longitude: Number,
  Block: Number,
  WellNo: String,
  Aquifer_Type: String,
  Distance_to_Aquifer_km: Number,
  Sy: Number,
  Area_m2: Number,
  Num_Readings: Number,
  Dates: [String],
  Water_Levels: [Number],
  Delta_h_m: [Number],
  Delta_S_m3: [Number],
  Delta_S_MCM: [Number],
  Latest_Water_Level: Number,
  Latest_Delta_h_m: Number,
  Latest_Delta_S_m3: Number,
  First_Reading_Date: Date,
  Latest_Reading_Date: Date,
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  }
}, {
  timestamps: false,
  collection: 'wells'
});

// Create 2dsphere index for geospatial queries
wellSchema.index({ location: '2dsphere' });

const Well = mongoose.models.Well || mongoose.model("Well", wellSchema);

export default Well;
