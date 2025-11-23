// app/api/future_condition/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    const response = await fetch("http://127.0.0.1:8000/predict_next_year", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err || "ML API error");
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("ML API Error:", error);
    return NextResponse.json(
      { error: "Failed to predict 2024 levels", details: error.message },
      { status: 500 }
    );
  }
}