# 🌍 JAL SHAKTI - Next.js Frontend

A **modern, responsive web application** for intelligent groundwater management and sustainable water resource decision-making. Built with Next.js 16, React 19, and powered by AI/ML backends.

---

## 📋 Table of Contents
- [Overview](#overview)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Installation & Setup](#installation--setup)
- [Running Development Server](#running-development-server)
- [Project Pages & Features](#project-pages--features)
- [API Integration](#api-integration)
- [Database Models](#database-models)
- [Styling & UI](#styling--ui)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

**JAL SHAKTI Frontend** provides an intuitive interface for:

✅ **Water Station Discovery** - Locate and view nearest groundwater stations  
✅ **AI-Powered Recommendations** - Get personalized guidance for farmers & planners  
✅ **Water Analytics Dashboard** - Visualize 2024 water data & trends  
✅ **Real-time Chat** - AI chatbot for water management queries  
✅ **User Authentication** - Secure login/signup for role-based access  
✅ **Interactive Maps** - View stations on Leaflet maps with geolocation  
✅ **Water Quality Monitoring** - Track pH, contamination, suitability  
✅ **Extraction Limits** - Calculate safe water usage per location  

---

## 📁 Project Structure

```
jal_shakti/
├── app/                              # 🚀 Next.js App Router (13+ structure)
│   ├── layout.js                     # Root layout wrapper
│   ├── page.js                       # Home page (/)
│   ├── globals.css                   # Global Tailwind styles
│   │
│   ├── login/
│   │   └── page.js                   # Login page with JWT auth
│   ├── signup/
│   │   └── page.js                   # User registration (farmer, citizen, etc.)
│   ├── profile/
│   │   └── page.js                   # User profile management
│   │
│   ├── stations/
│   │   └── page.js                   # Browse all water stations
│   ├── station_data/
│   │   └── page.js                   # Detailed station information
│   │
│   ├── chat/
│   │   └── page.js                   # AI chatbot interface
│   ├── ai/
│   │   └── page.js                   # AI recommendations page
│   ├── analytics/
│   │   └── page.js                   # 2024 water analytics dashboard
│   ├── function/
│   │   └── page.js                   # Test/utility functions
│   ├── debug/
│   │   └── page.js                   # Debug & development tools
│   │
│   └── api/                          # 🔌 API Routes (Backend integration)
│       ├── ai/[station_id]/
│       │   └── route.js              # AI recommendations endpoint
│       ├── analytics/
│       │   ├── station/[id]/
│       │   │   └── route.js          # Station analytics
│       │   └── stations/
│       │       └── route.js          # Multi-station analytics
│       ├── chat/
│       │   └── route.js              # Chat API (Groq/Google AI)
│       ├── extraction_limit/
│       │   └── route.js              # Safe extraction calculation
│       ├── future_condition/
│       │   └── route.js              # 3-4 month water forecast
│       ├── location/[id]/
│       │   └── route.js              # Location-based queries
│       ├── login/
│       │   └── route.js              # User authentication
│       ├── signup/
│       │   └── route.js              # User registration
│       ├── stations/
│       │   ├── by-id/[station_id]/
│       │   │   └── route.js          # Get station by ID
│       │   └── nearest/[longitude]/[latitude]/
│       │       └── route.js          # Find nearest stations
│       ├── stations_data/[...locations]/
│       │   └── route.js              # Bulk station data
│       ├── user/
│       │   └── route.js              # User profile API
│       ├── wells/
│       │   ├── nearby/
│       │   │   └── route.js          # Nearby wells search
│       │   └── route.js              # Wells data
│       ├── reports/
│       │   ├── generate/
│       │   │   └── route.js          # PDF report generation
│       │   └── route.js              # Reports API
│       └── extraction_limit/
│           └── route.js              # Extraction limit API
│
├── lib/
│   └── dbConnect.js                  # 🗄️ MongoDB connection utility
│
├── models/                           # 📊 MongoDB Schemas
│   ├── station.js                    # Station data model
│   ├── user.js                       # User profile model
│   ├── waterQuality.js               # Water quality metrics
│   ├── waterUsage.js                 # Usage tracking
│   └── well.js                       # Well/borewell data
│
├── utils/
│   └── waterLevelStatus.js           # 🎯 Water level status helper
│
├── public/                           # 📁 Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── node_modules/                     # 📦 Installed dependencies
│
├── package.json                      # 📋 Project dependencies & scripts
├── next.config.mjs                   # ⚙️ Next.js configuration
├── jsconfig.json                     # TypeScript path aliases (optional)
├── postcss.config.mjs                # CSS processing config
├── eslint.config.mjs                 # Linting rules
├── tailwind.config.js                # Tailwind CSS configuration
├── README.md                         # 📖 This file
└── requirements.txt                  # 📦 Python dependencies (optional)
```

### 📂 Key Directory Descriptions

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js 13+ App Router - all pages & API routes |
| `models/` | MongoDB schemas for stations, users, water data |
| `lib/` | Reusable utilities (DB connection, helpers) |
| `utils/` | Helper functions (water status calculations) |
| `public/` | Static files (images, fonts, icons) |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | Next.js 16 | Server-side rendering, API routes |
| **UI Library** | React 19 | Component-based UI |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **Database** | MongoDB + Mongoose | NoSQL database & ORM |
| **Authentication** | JWT + bcrypt | Secure user auth |
| **Maps** | Leaflet + React-Leaflet | Interactive geospatial maps |
| **AI/Chat** | Groq SDK + Google Generative AI | LLM-powered chatbot |
| **Icons** | Lucide React + React Icons | Icon libraries |
| **3D Graphics** | Three.js | 3D visualizations |
| **Deployment** | Vercel | Serverless hosting |

### Dependencies Overview

```json
{
  "framework": "next@16.0.7",
  "ui": "react@19.2.0, react-dom@19.2.0",
  "styling": "tailwindcss@4",
  "database": "mongoose@8.19.3",
  "auth": ["bcrypt@6.0.0", "jsonwebtoken@9.0.2"],
  "maps": ["leaflet@1.9.4", "react-leaflet@5.0.0"],
  "ai": ["groq-sdk@0.36.0", "@google/generative-ai@0.24.1"],
  "ui-components": ["lucide-react@0.553.0", "react-icons@5.5.0"],
  "3d": "three@0.181.2"
}
```

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js 18+** (LTS recommended)
- **npm** or **yarn** package manager
- **MongoDB** connection (local or Atlas)
- **.env.local** for environment variables

### Step 1️⃣: Navigate to Frontend Folder
```bash
cd jal_shakti
```

### Step 2️⃣: Install Dependencies
```bash
npm install
# or
yarn install
```

This installs ~50+ packages including:
- Next.js framework
- React UI library
- Mongoose (MongoDB ODM)
- Authentication tools
- Map libraries
- AI SDKs

**Installation takes 2-5 minutes** depending on internet speed.

### Step 3️⃣: Configure Environment Variables

Create a `.env.local` file in the `jal_shakti/` folder:

```bash
# 🗄️ MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jal_shakti?retryWrites=true&w=majority

# 🔐 Authentication
JWT_SECRET=your-secret-key-here-min-32-chars-long

# 🤖 AI Services
GROQ_API_KEY=your-groq-api-key
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-key

# 🔗 Backend API (ML Server)
NEXT_PUBLIC_BACKEND_API=http://localhost:8000
# or for production:
# NEXT_PUBLIC_BACKEND_API=https://jal-shakti-backend.herokuapp.com

# 🚀 Deployment
VERCEL_URL=https://jalshaktisih-git-main-husains07s-projects.vercel.app
```

### Step 4️⃣: Verify Installation
```bash
npm list
```

Should show all installed packages.

---

## 🎮 Running Development Server

### Start Development Server
```bash
npm run dev
# or
yarn dev
```

**Output:**
```
> jal_shakti@0.1.0 dev
> next dev

  ▲ Next.js 16.0.7
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 2.4s
```

✅ Frontend runs at: `http://localhost:3000`  
✅ API routes at: `http://localhost:3000/api/*`  
✅ Hot reload on file changes  

### Access Application
Open browser: `http://localhost:3000`

---

## 📄 Project Pages & Features

### 🏠 Home Page (`/`)
**File:** `app/page.js`  
**Features:**
- Welcome banner with project overview
- Quick stats (stations, users, water status)
- Featured stations map
- Call-to-action buttons (Login, Explore Stations)

### 🔐 Authentication

#### Login Page (`/login`)
**File:** `app/login/page.js`  
**API:** `app/api/login/route.js`  
**Features:**
- Email/password authentication
- JWT token generation
- Role selection (if signup)
- Error handling & validation

#### Signup Page (`/signup`)
**File:** `app/signup/page.js`  
**API:** `app/api/signup/route.js`  
**Features:**
- User registration
- Role selection:
  - 👨‍🌾 Farmer
  - 👥 Normal Citizen
  - 📊 Decision Maker
  - 🔬 Groundwater Researcher
- Farming profile (crops, livestock)
- Password hashing with bcrypt

#### Profile Page (`/profile`)
**File:** `app/profile/page.js`  
**API:** `app/api/user/route.js`  
**Features:**
- View/edit user information
- Update farming profile
- Change password
- View recommendation history

### 📍 Water Stations

#### Stations List (`/stations`)
**File:** `app/stations/page.js`  
**API:** `app/api/stations/by-id/[station_id]/route.js`  
**Features:**
- List all groundwater stations
- Filter by district/block
- Search by station ID
- Display current water level status
- Map view with markers

#### Station Details (`/station_data`)
**File:** `app/station_data/page.js`  
**APIs:**
- `/api/stations/by-id/[station_id]`
- `/api/location/[id]`
- `/api/stations_data/[...locations]`

**Features:**
- Detailed station information
- Historical water levels (Jan, Apr-May, Aug, Nov)
- Aquifer properties
- Extraction infrastructure
- Water quality metrics
- Seasonal trends graph
- Nearby wells

### 🤖 AI Features

#### AI Recommendations (`/ai`)
**File:** `app/ai/page.js`  
**API:** `app/api/ai/[station_id]/route.js`  
**Features:**
- Personalized recommendations
- Crop suggestions (drought-resistant)
- Livestock water needs
- Household conservation tips
- Town planner guidelines
- Industrial limits
- Recharge interventions

#### Chat Interface (`/chat`)
**File:** `app/chat/page.js`  
**API:** `app/api/chat/route.js`  
**Features:**
- Real-time AI chatbot
- Water management Q&A
- Agricultural advice
- Uses Groq LLM for fast responses
- Conversation history

### 📊 Analytics (`/analytics`)
**File:** `app/analytics/page.js`  
**APIs:**
- `/api/analytics/stations`
- `/api/analytics/station/[id]`

**Features:**
- 2024 water statistics
- Regional analysis
- Critical stations alert
- Water quality overview
- Extraction trends
- Interactive charts & graphs

### 🔧 Utility Pages

#### Debug Page (`/debug`)
**File:** `app/debug/page.js`  
**Features:**
- API testing tools
- Database status check
- Log viewer
- Environment variable display (safe)

#### Function Page (`/function`)
**File:** `app/function/page.js`  
**Features:**
- Utility functions testing
- Data transformation demos
- Status calculation examples

---

## 🔌 API Integration

### Internal API Routes (Next.js)

All endpoints follow REST conventions:

#### Station APIs
```
GET  /api/stations/by-id/[station_id]    → Station details
GET  /api/stations/nearest/[lng]/[lat]   → Nearby stations
GET  /api/wells/nearby                    → Nearby wells
GET  /api/stations_data/[...locations]   → Bulk data
```

#### User APIs
```
POST /api/login                           → User login
POST /api/signup                          → User registration
GET  /api/user                            → User profile
PUT  /api/user                            → Update profile
```

#### AI/Recommendation APIs
```
GET  /api/ai/[station_id]                → AI recommendations
POST /api/extraction_limit                → Calculate limits
GET  /api/future_condition?station_id=X  → 3-4 month forecast
POST /api/chat                            → Chat with AI
```

#### Analytics APIs
```
GET  /api/analytics/stations              → All stats
GET  /api/analytics/station/[id]          → Station stats
```

### External API Integration

#### ML Backend (FastAPI)
Located in `../backend/`
```javascript
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API;
const response = await fetch(`${BACKEND_URL}/predict_next_year`, {
  method: 'POST',
  body: JSON.stringify(inputData)
});
```

#### AI Services
**Groq LLM:**
```javascript
import Groq from 'groq-sdk';
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
```

**Google Generative AI:**
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
```

---

## 📊 Database Models

### 1️⃣ Station Model
**File:** `models/station.js`

```javascript
{
  serialNo: Number,
  station_id: String,
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  address: {
    state: String,
    district: String,
    block: String,
    village: String
  },
  aquifer: {
    type: String,
    weathered_zone_depth_m: Number,
    fractured_zone_depth_m: Number,
    storativity: Number,
    transmissivity_m2_day: Number,
    infiltration_rate_percent: Number,
    estimated_storage_capacity_m3: Number
  },
  extraction_infrastructure: {
    borewell_count: Number,
    average_depth_m: Number,
    handpump_count: Number,
    open_well_count: Number,
    average_extraction_rate_m3_day: Number
  },
  historical_water_levels: {
    "2024": {
      "jan": 12.8,
      "apr_may": 11.2,
      "aug": 13.5,
      "nov": 12.5
    }
  },
  water_quality: {
    ph: Number,
    suitability: "POTABLE|NON_POTABLE|AGRICULTURE_ONLY"
  }
}
```

### 2️⃣ User Model
**File:** `models/user.js`

```javascript
{
  email: String (unique),
  password: String (hashed with bcrypt),
  role: "farmer|normal citizen|decision maker|ground water researcher",
  farmingProfile: {
    crops: [String],          // e.g., ["Wheat", "Bajra"]
    livestock: [String],      // e.g., ["Cow", "Buffalo"]
    landAreaAcres: Number,
    irrigationMethod: "flood|drip|sprinkler|rainfed"
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 3️⃣ Water Quality Model
**File:** `models/waterQuality.js`

```javascript
{
  station_id: String,
  date: Date,
  parameters: {
    ph: Number,
    tds: Number,           // Total dissolved solids
    hardness: Number,
    iron: Number,
    fluoride: Number,
    nitrate: Number,
    suitability: String
  }
}
```

### 4️⃣ Water Usage Model
**File:** `models/waterUsage.js`

```javascript
{
  station_id: String,
  user_id: ObjectId,
  date: Date,
  usage_m3: Number,
  purpose: "agriculture|household|industrial",
  notes: String
}
```

### 5️⃣ Well Model
**File:** `models/well.js`

```javascript
{
  well_id: String,
  station_id: String,
  type: "borewell|handpump|open_well",
  depth_m: Number,
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  status: "active|inactive|abandoned",
  last_measured: Date
}
```

---

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Connect Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com
   - Click "New Project"
   - Select your GitHub repository
   - Configure environment variables

3. **Set Environment Variables**
   In Vercel Dashboard → Settings → Environment Variables:
   ```
   MONGODB_URI=your-mongodb-uri
   JWT_SECRET=your-secret
   GROQ_API_KEY=your-key
   GOOGLE_GENERATIVE_AI_API_KEY=your-key
   NEXT_PUBLIC_BACKEND_API=https://backend-url.com
   ```

4. **Deploy**
   - Vercel auto-deploys on push
   - Preview URLs for PRs
   - Production URL: Your custom domain

### Deploy Locally (Docker - Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build & Run:
```bash
docker build -t jal-shakti .
docker run -p 3000:3000 jal-shakti
```

---

## 🧪 Build & Production

### Production Build
```bash
npm run build
```

Creates optimized `.next/` folder for deployment.

### Start Production Server
```bash
npm start
```

Runs on: `http://localhost:3000`

### Build Analysis
```bash
npm run build -- --analyze
```

Shows bundle size information.

---

## 🐛 Troubleshooting

### ❌ Problem: "Cannot find module 'mongoose'"
**Solution:**
```bash
npm install mongoose
```

### ❌ Problem: "MONGODB_URI is not defined"
**Solution:**
- Check `.env.local` exists
- Verify `MONGODB_URI` is set
- Restart dev server: `npm run dev`

### ❌ Problem: "Port 3000 already in use"
**Solution:**
```bash
# Use different port
npm run dev -- -p 3001
```

### ❌ Problem: CORS errors with backend API
**Solution:**
- Ensure backend `/predict_next_year` endpoint has CORS enabled
- Check `NEXT_PUBLIC_BACKEND_API` environment variable
- For localhost: Backend at 8000, Frontend at 3000

### ❌ Problem: JWT token invalid
**Solution:**
- Verify `JWT_SECRET` matches between login & protected routes
- Check token expiration
- Clear browser cookies: DevTools → Application → Clear Cookies

### ❌ Problem: Maps not showing (Leaflet)
**Solution:**
```javascript
// Ensure leaflet CSS is imported
import 'leaflet/dist/leaflet.css';
```

### ✅ Enable Debug Logging
```javascript
// In any route handler
console.log('DEBUG:', variableName);
```

---

## 📚 Related Documentation

- **Backend Docs:** See `../backend/README.md`
- **API Documentation:** See `../api_documentation.txt`
- **Main Project:** See `../README.md`
- **Next.js Docs:** https://nextjs.org/docs
- **MongoDB Docs:** https://docs.mongodb.com/
- **Tailwind Docs:** https://tailwindcss.com/docs

---

## 📞 Support & Contribution

For issues, features, or questions:
1. Check troubleshooting section
2. Review API documentation
3. Check Next.js & React official docs
4. Create GitHub issue with error logs

---

**Last Updated:** December 2025  
**Version:** 0.1.0  
**Status:** 🟢 Active Development




