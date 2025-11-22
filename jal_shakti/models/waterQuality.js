import mongoose from "mongoose";

const waterQualitySchema = new mongoose.Schema({

  station_id: {
    type: String,
    required: true,
    index: true
  },

  water_quality: {
    year: Number,
    ph: Number,
    ec_uScm: Number,
    co3_mgL: Number,
    hco3_mgL: Number,
    cl_mgL: Number,
    f_mgL: Number,
    so4_mgL: Number,
    no3_mgL: Number,
    po4_mgL: Number,
    total_hardness_mgL: Number,
    ca_mgL: Number,
    mg_mgL: Number,
    na_mgL: Number,
    k_mgL: Number,
    fe_ppm: Number
  }

}, { timestamps: true });

export default mongoose.model("WaterQuality", waterQualitySchema);
