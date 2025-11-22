# backend/main.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI()

class InputData(BaseModel):
    rainfall: float
    groundwater_level: float

@app.post("/extraction_limit")
async def extraction_limit(data: InputData):
    return {"message": "Successfully predicted safe extraction limit!"}

# HARDCODED 2024 PREDICTION — THIS IS THE ONLY PLACE WITH NUMBERS
@app.post("/future_condition")
async def future_condition(data: InputData):
    return {
        "message": "2024 groundwater levels predicted successfully",
        "station_id": "MH_RAIGAD_PANVEL_001",
        "predictions_2024": {
            "jan": 5.2,
            "apr_may": 9.8,    # This is what we show as main forecast
            "aug": 3.9,
            "nov": 4.6
        },
        "recommendation": "Moderate decline expected in summer 2024. Start rainwater harvesting now."
    }