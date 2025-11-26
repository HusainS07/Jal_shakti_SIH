// app/api/future_condition/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    // Use environment variable for API URL
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

    const response = await fetch(`${API_URL}/predict_next_year`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err || "ML API error");
    }

    const result = await response.json();
    
    // Calculate recharge rates from predictions
    const predictions = result.predictions_2024;
    const recharge_rates = {};
    
    if (predictions) {
      const seasons = ["jan", "apr_may", "aug", "nov"];
      
      seasons.forEach((season, index) => {
        const current = predictions[season];
        let previous;
        
        if (season === "jan") {
          // Jan compares with previous year's Nov
          previous = predictions.nov;
        } else {
          // Compare with previous season
          previous = predictions[seasons[index - 1]];
        }
        
        // Check if values are valid
        if (previous && previous > 0 && current && current > 0) {
          const percentage = Math.round(Math.abs(current - previous) / previous * 100);
          const isRecovery = current < previous; // Lower depth = water rose = recovery
          
          recharge_rates[season] = {
            percentage,
            isRecovery
          };
        } else {
          recharge_rates[season] = null;
        }
      });
    }
    
    // Return original result + recharge rates
    return NextResponse.json({
      ...result,
      recharge_rates
    });
    
  } catch (error) {
    console.error("ML API Error:", error);
    return NextResponse.json(
      { error: "Failed to predict 2024 levels", details: error.message },
      { status: 500 }
    );
  }
}