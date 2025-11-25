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
    enum: ["user", "town_planner"],
    required: true,
    default: "user",
  },
});

export default mongoose.models.User || mongoose.model("User", userSchema);