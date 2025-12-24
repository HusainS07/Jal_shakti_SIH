# 🌊 JAL SHAKTI - Intelligent Groundwater Management Platform

> **Sustainable Water Resource Management Through AI & Machine Learning**

A comprehensive full-stack platform that uses advanced machine learning and data analytics to provide intelligent groundwater management solutions for farmers, town planners, decision-makers, and groundwater researchers across India.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-Active%20Development-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## 🎯 Project Vision

**JAL SHAKTI** addresses the critical challenge of groundwater depletion in India by providing:

✅ **AI-Powered Predictions** - Forecast groundwater levels 3-4 months ahead  
✅ **Sustainable Management** - Calculate safe extraction limits per region  
✅ **Personalized Guidance** - Role-specific recommendations for farmers & planners  
✅ **Real-time Analytics** - Monitor 150+ water stations across multiple states  
✅ **Intelligent Chat** - AI-powered assistant for water management queries  
✅ **Data Visualization** - Interactive maps and trend analysis  

---

## 📦 Project Structure

```
JAL_SHAKTI/
│
├── 📄 api_documentation.txt          # Complete API reference
├── 📄 README.md                      # This file - Main project documentation
│
├── backend/                          # 🚀 ML & Prediction Engine (Python/FastAPI)
│   ├── main.py                       # FastAPI application (prediction service)
│   ├── requirements.txt              # Python dependencies
│   ├── README.md                     # Backend setup & ML model docs
│   ├── water_level_predictor.pkl     # Trained ML model (joblib)
│   └── utils/
│       └── preprocess.py             # Data preprocessing utilities
│
└── jal_shakti/                       # 🌐 Full-Stack Web Application (Next.js)
    ├── app/                          # Next.js App Router (pages & API)
    ├── models/                       # MongoDB schemas
    ├── lib/                          # Database connection utilities
    ├── utils/                        # Helper functions
    ├── public/                       # Static assets
    ├── package.json                  # Node.js dependencies
    ├── next.config.mjs               # Next.js configuration
    ├── README.md                     # Frontend setup & features
    └── requirements.txt              # Python dependencies (optional)
```

### Directory Overview

| Folder | Technology | Purpose |
|--------|-----------|---------|
| **backend/** | Python + FastAPI | ML models, water level predictions, data processing |
| **jal_shakti/** | Next.js + React + MongoDB | Web UI, user auth, API routes, analytics dashboard |

---

## 🛠️ Tech Stack

### Backend (ML Engine)
```
Language:     Python 3.9+
Framework:    FastAPI (modern async web framework)
Server:       Uvicorn (ASGI server)
ML/Data:      scikit-learn, joblib, numpy
API:          RESTful with Pydantic validation
```

### Frontend (Full-Stack)
```
Framework:    Next.js 16 (React 19)
UI/CSS:       Tailwind CSS 4
Database:     MongoDB + Mongoose ODM
Auth:         JWT + bcrypt
Maps:         Leaflet + React-Leaflet
AI/Chat:      Groq SDK, Google Generative AI
Icons:        Lucide React, React Icons
3D:           Three.js
Deployment:   Vercel (serverless)
```

### Core Technologies at a Glance

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Next.js 16, Tailwind CSS 4 |
| **Backend** | FastAPI, scikit-learn, joblib |
| **Database** | MongoDB (NoSQL) + Mongoose |
| **Authentication** | JWT, bcrypt |
| **AI/ML** | scikit-learn models, Groq LLM, Google Generative AI |
| **Maps** | Leaflet, React-Leaflet |
| **Deployment** | Vercel (Frontend), Render/Railway (Backend) |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (for frontend)
- **Python 3.9+** (for backend)
- **MongoDB** (local or Atlas cloud)
- **Git** for version control

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/jal-shakti.git
cd JAL_SHAKTI
```

### 2️⃣ Setup Backend (ML Server)
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run ML server
uvicorn main:app --reload
```

**Backend runs at:** `http://localhost:8000`  
**API Docs:** `http://localhost:8000/docs`

### 3️⃣ Setup Frontend (Web Application)
```bash
cd jal_shakti

# Install dependencies
npm install

# Create .env.local file with configuration
# See "Configuration" section below

# Run development server
npm run dev
```

**Frontend runs at:** `http://localhost:3000`

### 4️⃣ Access the Application
Open in browser: **`http://localhost:3000`**

---

## ⚙️ Configuration

### Environment Variables

**Frontend (.env.local in jal_shakti/):**
```bash
# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/jal_shakti

# Authentication
JWT_SECRET=your-32-character-secret-key-here

# AI Services
GROQ_API_KEY=gsk_your_groq_key_here
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key_here

# Backend API
NEXT_PUBLIC_BACKEND_API=http://localhost:8000
# Or production: https://backend-url.com

# Vercel
VERCEL_URL=your-vercel-domain.vercel.app
```

**Backend (.env in backend/ - optional):**
```bash
LOG_LEVEL=INFO
MODEL_PATH=./water_level_predictor.pkl
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

---

## 📚 Documentation

### Detailed Component Documentation

1. **[Backend README](backend/README.md)**
   - ML model details
   - API endpoints
   - Model training & accuracy
   - Deployment instructions

2. **[Frontend README](jal_shakti/README.md)**
   - Page structure & features
   - API integration
   - Database schemas
   - UI components & styling

3. **[API Documentation](api_documentation.txt)**
   - All REST endpoints
   - Request/response formats
   - Error handling
   - Usage examples

---

## 🔌 API Endpoints Overview

### Station Management
```bash
GET    /api/stations/by-id/[station_id]       # Get station details
GET    /api/stations/nearest/[lng]/[lat]      # Find nearest stations
GET    /api/stations_data/[...locations]      # Bulk station data
```

### User Management
```bash
POST   /api/signup                             # User registration
POST   /api/login                              # User authentication
GET    /api/user                               # Get user profile
PUT    /api/user                               # Update user profile
```

### AI & Recommendations
```bash
GET    /api/ai/[station_id]                   # AI recommendations
POST   /api/extraction_limit                   # Calculate safe limits
GET    /api/future_condition?station_id=X     # 3-4 month forecast
POST   /api/chat                               # Chat with AI
```

### Analytics & Reports
```bash
GET    /api/analytics/stations                 # All analytics
GET    /api/analytics/station/[id]             # Station analytics
POST   /api/reports/generate                   # Generate PDF report
```

---

## 🧠 ML Models

### Water Level Predictor Model

**File:** `backend/water_level_predictor.pkl`  
**Type:** Random Forest Regressor (ensemble model)  
**Accuracy:** ~85-87% (seasonal predictions)  

**Predicts:** Groundwater levels for 4 seasons (Jan, Apr-May, Aug, Nov)

**Input Parameters (15 features):**
- Aquifer characteristics (depth, storativity, transmissivity)
- Infiltration rate & storage capacity
- Extraction infrastructure (borewells, handpumps, open wells)
- Historical water levels from current year

**Output:** Predicted depths for next year's 4 seasons

---

## 📊 Database Schema Overview

### Collections in MongoDB

#### 1. Stations Collection
```javascript
{
  station_id: String,
  location: GeoPoint,
  address: { state, district, block, village },
  aquifer: { type, depth, storativity, transmissivity },
  extraction_infrastructure: { borewell_count, avg_depth },
  historical_water_levels: { year: { jan, apr_may, aug, nov } },
  water_quality: { ph, suitability }
}
```

#### 2. Users Collection
```javascript
{
  email: String (unique),
  password: String (hashed),
  role: "farmer|citizen|decision_maker|researcher",
  farmingProfile: { crops, livestock, irrigationMethod },
  createdAt: Date,
  updatedAt: Date
}
```

#### 3. Water Quality Collection
```javascript
{
  station_id: String,
  date: Date,
  parameters: { ph, tds, hardness, fluoride, nitrate, suitability }
}
```

#### 4. Water Usage Collection
```javascript
{
  station_id: String,
  user_id: ObjectId,
  date: Date,
  usage_m3: Number,
  purpose: "agriculture|household|industrial"
}
```

#### 5. Wells Collection
```javascript
{
  well_id: String,
  station_id: String,
  type: "borewell|handpump|open_well",
  depth_m: Number,
  location: GeoPoint,
  status: "active|inactive|abandoned"
}
```

---

## 🎮 Key Features

### 🏠 Home Dashboard
- Quick statistics (stations, users, water status)
- Featured stations map
- Latest water alerts
- Navigation to key features

### 📍 Station Discovery
- Browse 150+ groundwater stations
- Filter by state/district/block
- View real-time water levels
- Historical trend analysis
- Aquifer information
- Water quality metrics

### 🤖 AI Recommendations
- Personalized crop suggestions
- Livestock water requirements
- Conservation tips for households
- Town planner guidelines
- Industrial water limits
- Recharge interventions

### 💬 AI Chatbot
- Real-time water management Q&A
- Agricultural advice
- Powered by Groq LLM
- Conversation history
- Multi-language support (future)

### 📊 Analytics Dashboard
- 2024 water statistics
- Regional trends & comparisons
- Critical station alerts
- Quality overview
- Extraction patterns
- Interactive charts & visualizations

### 🔐 User Authentication
- Secure email/password login
- Role-based access control
- JWT tokens
- Password hashing (bcrypt)
- Profile management

### 🗺️ Interactive Maps
- Station locations on Leaflet maps
- Geolocation support
- Nearby stations finder
- Cluster view for dense areas
- Click for detailed info

---

## 🚀 Deployment

### Backend Deployment (Render/Railway/Heroku)

1. **Prepare Backend**
   ```bash
   cd backend
   pip freeze > requirements.txt
   ```

2. **Deploy to Render**
   - Connect GitHub repository
   - Set Python 3.9+ runtime
   - Configure environment variables
   - Deploy! 🚀

3. **Update Frontend**
   - Change `NEXT_PUBLIC_BACKEND_API` to deployed URL
   - Redeploy frontend

### Frontend Deployment (Vercel - Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to https://vercel.com
   - Import GitHub repository
   - Set environment variables
   - Deploy automatically! 🚀

**Production URL:** `https://jalshaktisih-git-main-husains07s-projects.vercel.app`

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### Backend Issues

**Problem:** `ModuleNotFoundError: No module named 'fastapi'`
```bash
# Solution:
pip install -r requirements.txt
```

**Problem:** Port 8000 already in use
```bash
# Solution: Use different port
uvicorn main:app --reload --port 8001
```

**Problem:** Model file not found
```bash
# Solution: Ensure water_level_predictor.pkl exists in backend folder
ls -la water_level_predictor.pkl
```

#### Frontend Issues

**Problem:** `Cannot find module 'mongoose'`
```bash
npm install mongoose
```

**Problem:** MONGODB_URI undefined
```bash
# Check .env.local exists and has correct URI
# Restart: npm run dev
```

**Problem:** CORS errors
```bash
# Add frontend URL to backend CORS_ORIGINS
# For local: both should allow http://localhost:*
```

#### Database Issues

**Problem:** Cannot connect to MongoDB
- Verify MongoDB service is running
- Check connection string in .env.local
- Ensure IP whitelist in MongoDB Atlas (if using cloud)

---

## 📈 Project Statistics

| Metric | Value |
|--------|-------|
| **Backend Endpoints** | 25+ REST APIs |
| **Frontend Pages** | 10+ interactive pages |
| **Database Collections** | 5 major collections |
| **Water Stations** | 150+ monitoring stations |
| **States Covered** | 5+ Indian states |
| **ML Model Accuracy** | 85-87% |
| **Dependencies** | 60+ npm + 10+ python packages |

---

## 🤝 Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Standards
- Follow project structure conventions
- Write meaningful commit messages
- Update documentation for new features
- Test thoroughly before submitting PR
- Ensure no breaking changes

---

## 📞 Support & Contact

### For Issues & Questions
- Check relevant README files first
- Review [API Documentation](api_documentation.txt)
- Check troubleshooting sections
- Create GitHub issue with detailed information

### Team
- **Backend ML:** ML model development & API
- **Frontend:** UI/UX & web application
- **Database:** MongoDB schema & optimization
- **DevOps:** Deployment & infrastructure

---

## 📜 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 🔮 Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Advanced ML models (LSTM, GRU)
- [ ] Real-time sensors integration
- [ ] Blockchain for data verification
- [ ] Enhanced 3D visualizations
- [ ] Offline-first capabilities
- [ ] IoT device integration

---

## 📊 Quick Links

- **Live Demo:** [JAL SHAKTI Platform](https://jalshaktisih-git-main-husains07s-projects.vercel.app)
- **Backend API Docs:** `http://localhost:8000/docs` (local)
- **GitHub Repository:** [jal-shakti-repo](https://github.com/yourusername/jal-shakti)
- **MongoDB Atlas:** [Cloud Database](https://www.mongodb.com/cloud/atlas)
- **Vercel Dashboard:** [Deployment](https://vercel.com/dashboard)

---

## 📝 Documentation Structure

```
📦 JAL_SHAKTI
├── 📄 README.md                    ← You are here (Main overview)
├── 📄 api_documentation.txt        ← REST API reference
│
├── 📁 backend/
│   └── 📄 README.md                ← ML models & FastAPI setup
│
└── 📁 jal_shakti/
    └── 📄 README.md                ← Next.js frontend setup
```

**Read in this order:**
1. This file (overall architecture)
2. Backend README (ML & predictions)
3. Frontend README (web app & features)
4. API Documentation (all endpoints)

---

## 🎓 Learning Resources

### Frontend Development
- [Next.js Documentation](https://nextjs.org/docs)
- [React 19 Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [MongoDB with Mongoose](https://mongoosejs.com)

### Backend Development
- [FastAPI Guide](https://fastapi.tiangolo.com)
- [scikit-learn Models](https://scikit-learn.org)
- [Python Best Practices](https://pep8.org)

### DevOps & Deployment
- [Vercel Deployment](https://vercel.com/docs)
- [Render Platform](https://render.com/docs)
- [MongoDB Atlas](https://docs.atlas.mongodb.com)

---

**Last Updated:** December 24, 2025  
**Version:** 1.0.0  
**Maintainer:** JAL SHAKTI Team  
**Status:** 🟢 Active Development

---

## Summary

**JAL SHAKTI** is a comprehensive, production-ready platform combining:
- **Advanced ML** for groundwater prediction
- **Modern Full-Stack Web App** with React & Next.js
- **Secure Database** with MongoDB
- **AI-Powered Intelligence** for personalized recommendations
- **Cloud Deployment** on Vercel & Render

Start with the Quick Start section above, and refer to subfolder READMEs for detailed information! 🚀
