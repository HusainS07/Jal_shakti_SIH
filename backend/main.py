# backend/main.py

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import joblib
import numpy as np

app = FastAPI(
    title="Groundwater Prediction API",
    description="Predicts next year's seasonal groundwater levels using ML model.",
    version="1.0.0"
)

# ---------------------------
# Load ML Model & Metadata
# ---------------------------

print("🔄 Loading ML model...")

model_data = joblib.load("water_level_predictor.pkl")
MODELS = model_data["models"]
SCALER = model_data["scaler"]
FEATURE_COLS = model_data["feature_columns"]

print("✅ ML model loaded successfully!")


# ---------------------------
# INPUT SCHEMA
# ---------------------------

class PredictionInput(BaseModel):
    # Aquifer params
    weathered_zone_depth: float
    fractured_zone_depth: float
    storativity: float
    transmissivity: float
    infiltration_rate: float
    storage_capacity: float
    
    # Extraction infrastructure
    borewell_count: int
    avg_well_depth: float
    handpump_count: int
    open_well_count: int
    extraction_rate: float

    # Current year water levels
    current_jan: float
    current_apr_may: float
    current_aug: float
    current_nov: float


# ---------------------------
# PREDICTION ENDPOINT
# ---------------------------
@app.post("/predict_next_year")
async def predict_next_year(data: PredictionInput):

    input_features = [
        data.weathered_zone_depth,
        data.fractured_zone_depth,
        data.storativity,
        data.transmissivity,
        data.infiltration_rate,
        data.storage_capacity,
        data.borewell_count,
        data.avg_well_depth,
        data.handpump_count,
        data.open_well_count,
        data.extraction_rate,
        data.current_jan,
        data.current_apr_may,
        data.current_aug,
        data.current_nov
    ]

    input_scaled = SCALER.transform([input_features])

    predictions = {}
    for target, model in MODELS.items():
        pred = model.predict(input_scaled)[0]
        season = target.replace("target_", "")
        predictions[season] = round(float(pred), 2)

    recommendation = "Summer may require conservation measures."
    if predictions["apr_may"] > data.current_apr_may:
        recommendation = "Improvement expected next summer. Extraction safe."
    elif predictions["apr_may"] < data.current_apr_may:
        recommendation = "Decline expected. Implement recharge/harvesting."

    return {
        "predictions_2024": predictions,
        "recommendation": recommendation
    }

# ---------------------------
# HEALTH CHECK
# ---------------------------

@app.get("/")
def root():
    return {"status": "Groundwater ML API is running!"}
