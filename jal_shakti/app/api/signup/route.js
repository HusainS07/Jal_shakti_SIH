// app/api/signup/route.js

import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { dbConnect } from "@/lib/dbConnect";
import User from "@/models/user";

// Allowed roles — exactly the 4 you asked for
const ALLOWED_ROLES = [
  "farmer",
  "normal citizen",
  "decision maker",
  "ground water researcher"
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^.{6,}$/; // at least 6 characters

export async function POST(req) {
  try {
    await dbConnect();

    const { email, password, role } = await req.json();

    // Required fields check
    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "Email, password, and role are required" },
        { status: 400 }
      );
    }

    // Email validation
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Password validation
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Role validation — only the 4 allowed roles
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        {
          error: "Invalid role selected",
          allowedRoles: ALLOWED_ROLES
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 409 }
      );
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      role, // saved exactly as selected: farmer, normal citizen, etc.
    });

    return NextResponse.json(
      {
        message: "Account created successfully!",
        user: {
          email: newUser.email,
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}