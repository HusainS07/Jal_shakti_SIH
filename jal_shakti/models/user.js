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
    enum: ["farmer",
      "normal citizen",
      "decision maker",
      "ground water researcher"],
    required: true,
    default: "user",
  },
});

export default mongoose.models.User || mongoose.model("User", userSchema);