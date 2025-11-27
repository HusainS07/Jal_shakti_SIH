import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["farmer", "normal citizen", "decision maker", "ground water researcher"],
    required: true,
  },
  // NEW: Personal farming info
  farmingProfile: {
    crops: [String],                    // e.g., ["Wheat", "Mustard", "Bajra"]
    livestock: [String],                // e.g., ["Cow", "Buffalo", "Goat"]
    landAreaAcres: { type: Number },    // optional
    irrigationMethod: {                 // optional but helpful
      type: String,
      enum: ["flood", "drip", "sprinkler", "rainfed"],
      default: "flood"
    }
  }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model("User", userSchema);