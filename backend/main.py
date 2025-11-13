from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class InputData(BaseModel):
    rainfall: float
    groundwater_level: float

@app.post("/extraction_limit")
async def extraction_limit(data: InputData):
    # Dummy prediction for now
    return {"message": "Successfully predicted safe extraction limit!"}

@app.post("/future_condition")
async def future_condition(data: InputData):
    # Dummy prediction for now
    return {"message": "Predicted groundwater condition after 3-4 months!"}
