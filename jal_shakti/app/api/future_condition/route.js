import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const data = await req.json();

    const response = await fetch("http://127.0.0.1:8000/future_condition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error("Error calling future_condition ML API:", error);
    return NextResponse.json({ error: "Failed to call future_condition ML API" }, { status: 500 });
  }
}
