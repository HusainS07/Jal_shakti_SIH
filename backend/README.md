# 🌊 JAL SHAKTI - ML Backend API

A **FastAPI-based machine learning backend** for groundwater level prediction and water management recommendations. This service provides intelligent predictions and actionable insights for sustainable water resource management across India.

---

## 📋 Table of Contents
- [Overview](#overview)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Installation & Setup](#installation--setup)
- [Running the Server](#running-the-server)
- [ML Models](#ml-models)
- [API Endpoints](#api-endpoints)
- [Key Features](#key-features)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

**JAL SHAKTI Backend** is the intelligence layer of the water management platform. It:

✅ **Predicts future groundwater levels** using machine learning (next 3-4 months forecast)  
✅ **Calculates safe extraction limits** based on aquifer parameters  
✅ **Provides personalized recommendations** for farmers, town planners, and decision-makers  
✅ **Analyzes water quality** and extracts actionable insights  
✅ **Monitors groundwater depletion** and alerts on critical thresholds  

---

## 📁 Project Structure

```
backend/
├── main.py                           # 🚀 FastAPI application entry point
├── requirements.txt                  # 📦 Python dependencies
├── README.md                         # 📖 This file
├── water_level_predictor.pkl         # 🧠 Trained ML model (joblib)
├── models/                           # (Future) Additional trained models
│   ├── extraction_model.pkl          # Model for extraction limit prediction
│   └── future_model.pkl              # Model for 3-4 month forecasting
├── utils/                            # 🛠️ Helper utilities
│   └── preprocess.py                 # Data preprocessing pipeline
├── venv/                             # 🐍 Virtual environment (created locally)
└── __pycache__/                      # Python bytecode cache
```

### File Descriptions

| File | Purpose |
|------|---------|
| `main.py` | Core FastAPI application with ML prediction endpoints |
| `requirements.txt` | Python package dependencies (FastAPI, scikit-learn, joblib, etc.) |
| `water_level_predictor.pkl` | Pre-trained ML model serialized with joblib |
| `utils/preprocess.py` | Data scaling, normalization, and feature engineering |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | FastAPI (Python web framework) |
| **Server** | Uvicorn (ASGI server) |
| **ML/ML Ops** | scikit-learn, joblib, numpy |
| **API Schema** | Pydantic (type validation) |
| **CORS** | Middleware for cross-origin requests |
| **Deployment** | Vercel/Railway (serverless compatible) |

### Dependencies Overview

```
fastapi          → Modern async web framework
uvicorn          → Lightning-fast ASGI server
pydantic         → Data validation & serialization
scikit-learn     → ML algorithms & preprocessing
joblib           → Model persistence
numpy            → Numerical computing
```

---

## 🚀 Installation & Setup

### Prerequisites
- **Python 3.9+** installed
- **pip** package manager
- **Virtual environment** (recommended)

### Step 1️⃣: Clone/Navigate to Backend Folder
```bash
cd backend
```

### Step 2️⃣: Create Virtual Environment
A virtual environment isolates your Python packages from system Python.

```bash
# Windows
python -m venv venv

# macOS/Linux
python3 -m venv venv
```

### Step 3️⃣: Activate Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

After activation, your terminal should show `(venv)` prefix.

### Step 4️⃣: Install Dependencies
```bash
pip install -r requirements.txt
```

This installs all required Python packages:
- FastAPI
- Uvicorn
- scikit-learn
- joblib
- numpy
- pydantic

### Step 5️⃣: Verify Installation
```bash
pip list
```

Should show all installed packages.

---

## 🎮 Running the Server

### Development Mode (with auto-reload)
```bash
uvicorn main:app --reload
```

**Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

✅ Server runs at: `http://localhost:8000`  
✅ Auto-reload on file changes  
✅ Interactive API docs at: `http://localhost:8000/docs`

### Production Mode
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Verify Server is Running
Visit in browser: `http://localhost:8000/docs`

You should see the **Swagger UI** with all available endpoints.

---

## 🧠 ML Models

### Model: `water_level_predictor.pkl`

**Purpose:** Predicts next year's seasonal groundwater levels

**What it contains:**
```python
{
    "models": {
        "target_jan": <RandomForestRegressor>,
        "target_apr_may": <RandomForestRegressor>,
        "target_aug": <RandomForestRegressor>,
        "target_nov": <RandomForestRegressor>
    },
    "scaler": <StandardScaler>,
    "feature_columns": [
        "weathered_zone_depth",
        "fractured_zone_depth",
        "storativity",
        "transmissivity",
        "infiltration_rate",
        "storage_capacity",
        "borewell_count",
        "avg_well_depth",
        "handpump_count",
        "open_well_count",
        "extraction_rate",
        "current_jan",
        "current_apr_may",
        "current_aug",
        "current_nov"
    ]
}
```

**Input Features (15 parameters):**

| Feature | Type | Unit | Example |
|---------|------|------|---------|
| `weathered_zone_depth` | float | meters | 10.5 |
| `fractured_zone_depth` | float | meters | 45.0 |
| `storativity` | float | ratio | 0.001 |
| `transmissivity` | float | m²/day | 500.0 |
| `infiltration_rate` | float | % | 25.5 |
| `storage_capacity` | float | m³ | 50000 |
| `borewell_count` | int | count | 58 |
| `avg_well_depth` | float | meters | 35.0 |
| `handpump_count` | int | count | 12 |
| `open_well_count` | int | count | 3 |
| `extraction_rate` | float | m³/day | 22.0 |
| `current_jan` | float | meters | 12.8 |
| `current_apr_may` | float | meters | 11.2 |
| `current_aug` | float | meters | 13.5 |
| `current_nov` | float | meters | 12.5 |

**Output:** Predictions for 4 seasons (next year)
```json
{
    "jan": 12.3,
    "apr_may": 10.8,
    "aug": 13.2,
    "nov": 12.1
}
```

---

## 🔌 API Endpoints

### 1️⃣ POST `/predict_next_year`

**Purpose:** Predict groundwater levels for next 4 seasons

**Request:**
```bash
curl -X POST "http://localhost:8000/predict_next_year" \
  -H "Content-Type: application/json" \
  -d '{
    "weathered_zone_depth": 10.5,
    "fractured_zone_depth": 45.0,
    "storativity": 0.001,
    "transmissivity": 500.0,
    "infiltration_rate": 25.5,
    "storage_capacity": 50000,
    "borewell_count": 58,
    "avg_well_depth": 35.0,
    "handpump_count": 12,
    "open_well_count": 3,
    "extraction_rate": 22.0,
    "current_jan": 12.8,
    "current_apr_may": 11.2,
    "current_aug": 13.5,
    "current_nov": 12.5
  }'
```

**Response (200 OK):**
```json
{
    "success": true,
    "predictions": {
        "jan": 12.3,
        "apr_may": 10.8,
        "aug": 13.2,
        "nov": 12.1
    },
    "confidence": 0.87,
    "trend": "stable"
}
```

**Error Responses:**
- `400` - Invalid input fields
- `422` - Validation error (missing required fields)
- `500` - Model prediction error

---

## ✨ Key Features

### 🔄 CORS Configuration
Configured to work with Vercel deployment:
```python
CORS_ORIGINS = [
    "https://jalshaktisih-git-main-husains07s-projects.vercel.app",
    "https://*.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001"
]
```

### 📊 Data Preprocessing
- **StandardScaler**: Normalizes input features to mean=0, std=1
- **Feature validation**: Pydantic ensures all required fields present
- **Type checking**: All inputs validated before ML processing

### 🚀 Asynchronous API
- Built with async/await for high concurrency
- Non-blocking I/O operations
- Optimized for serverless deployment

### 📝 API Documentation
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

---

## ⚙️ Configuration

### Environment Variables (Optional)
Create a `.env` file in the backend folder:
```
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
MODEL_PATH=./water_level_predictor.pkl
LOG_LEVEL=INFO
```

### CORS Settings
Located in `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://jalshaktisih-git-main-husains07s-projects.vercel.app",
        "https://*.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🐛 Troubleshooting

### ❌ Problem: "ModuleNotFoundError: No module named 'fastapi'"
**Solution:**
```bash
# Ensure venv is activated
pip install -r requirements.txt
```

### ❌ Problem: "Port 8000 already in use"
**Solution:**
```bash
# Use different port
uvicorn main:app --reload --port 8001
```

### ❌ Problem: Model loading fails
**Solution:**
- Verify `water_level_predictor.pkl` exists in backend folder
- Check file permissions: `ls -la water_level_predictor.pkl`
- Ensure joblib version matches training environment

### ❌ Problem: CORS errors in browser console
**Solution:**
- Add frontend URL to `CORS_ORIGINS` in `main.py`
- Clear browser cache
- Ensure requests include `Content-Type: application/json` header

### ✅ Enable Debug Logging
Add to `main.py`:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

## 📚 Related Documentation

- **Frontend Docs:** See `../jal_shakti/README.md`
- **API Documentation:** See `../api_documentation.txt`
- **Main Project:** See `../README.md`
- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **scikit-learn Docs:** https://scikit-learn.org/

---

## 📞 Support & Contribution

For issues, questions, or improvements:
1. Check troubleshooting section above
2. Review API documentation
3. Check FastAPI & scikit-learn official docs
4. Create an issue with detailed error logs

---

**Last Updated:** December 2025  
**Version:** 1.0.0  
**Status:** 🟢 Active Development
