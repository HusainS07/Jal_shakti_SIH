// jal_shakti/models/waterUsage.js

import mongoose from "mongoose";

const waterUsageSchema = new mongoose.Schema({

  station_id: {
    type: String,
    required: true,
    index: true
  },

  agriculture: {
    total_farm_area_ha: Number,

    prominent_crops: {
      first_crop: {
        name: String,
        area_ha: Number,
        water_requirement_m3_ha: Number
      },
      second_crop: {
        name: String,
        area_ha: Number,
        water_requirement_m3_ha: Number
      },
      third_crop: {
        name: String,
        area_ha: Number,
        water_requirement_m3_ha: Number
      }
    },

    total_water_requirement_m3_year: Number,

    animal_husbandry: {
      is_required: Boolean,
      cattle_count: Number,
      poultry_count: Number,
      estimated_water_need_m3_year: Number
    }
  },

  industries: {
    count: Number,
    details: [
      {
        id: String,
        type: String,
        name: String,
        distance_km: Number,
        estimated_usage_m3_day: Number,
        annual_usage_m3: Number,
        data_source: String,
        verification_status: String
      }
    ],
    total_usage_m3_year: Number,
    last_updated: String
  }

}, { timestamps: true });

export default mongoose.model("WaterUsage", waterUsageSchema);
