import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { dbConnect } from "@/lib/dbConnect";
import User from "@/models/user";

// Email: simple and reliable
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password: at least 6 characters (any type)
const passwordRegex = /^.{6,}$/;

export async function POST(req) {
  try {
    await dbConnect();

    const { email, password } = await req.json();

    if (!email || !password)
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );

    if (!emailRegex.test(email))
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });

    if (!passwordRegex.test(password))
      return NextResponse.json(
        {
          error:
            "Password must be ≥10 chars, include lowercase, number, and special char",
        },
        { status: 400 }
      );

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return NextResponse.json({ error: "User already exists" }, { status: 409 });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({ email, password: hashedPassword });

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: { email: newUser.email },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
