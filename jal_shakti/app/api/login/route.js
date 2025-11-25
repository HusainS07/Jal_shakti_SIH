import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { dbConnect } from "@/lib/dbConnect";
import User from "@/models/user";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey"; // store securely in env

export async function POST(req) {
  try {
    await dbConnect();

    const body = await req.json();
    let { email, password } = body;

    if (!email || !password)
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );

    // Decode if frontend sends encoded values
    email = decodeURIComponent(email);
    password = decodeURIComponent(password);

    const user = await User.findOne({ email });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    // Generate JWT token with role included
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" } // valid for 7 days
    );

    // Return token with role (Flutter will store it)
    return NextResponse.json({
      message: "Login successful",
      token,
      user: { 
        email: user.email,
        role: user.role  // ← Role is returned here
      },
      status:200,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({
      error: "Internal Server Error",
      status: 500, 
    });
  }
}
