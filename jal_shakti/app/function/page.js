"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Waves,
  Bot,
  User,
  Sparkles,
  MapPin,
  BarChart3,
  Database,
} from "lucide-react";

export default function DashboardPage() {
  // Removed prediction state and API logic (result, isLoading, callApi, cacheRef, etc.)
  // Keeping FeatureCard component simple for static links

  // Common Card component for better readability and reuse
  const FeatureCard = ({ icon: Icon, title, description, link }) => (
    <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-start mb-4">
        <div className={`flex items-center justify-center w-12 h-12 rounded-xl text-white shadow-lg ${
            title === "AI Chatbot" ? "bg-gradient-to-br from-pink-500 to-rose-500" :
            title === "AI Insights" ? "bg-gradient-to-br from-violet-500 to-purple-500" :
            title === "Profile" ? "bg-gradient-to-br from-orange-500 to-amber-500" :
            title === "Stations" ? "bg-gradient-to-br from-emerald-500 to-teal-500" :
            title === "Station Data" ? "bg-gradient-to-br from-blue-500 to-cyan-500" :
            title === "Analytics" ? "bg-gradient-to-br from-indigo-500 to-blue-500" : ""
        }`}>
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 ml-4">{title}</h3>
      </div>
      <p className="text-gray-600 mb-6 text-sm">{description}</p>
      
      {/* Button/Link rendering */}
      <Link
        href={link}
        className={`w-full block font-semibold py-3 rounded-xl text-center transform hover:scale-[1.02] transition-all duration-200 shadow-lg text-white ${
          title === "AI Chatbot" ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600" :
          title === "AI Insights" ? "bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600" :
          title === "Profile" ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600" :
          title === "Stations" ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600" :
          title === "Station Data" ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600" :
          title === "Analytics" ? "bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600" : ""
        }`}
      >
        {title.includes("View") || title.includes("Analytics") ? `View ${title}` : `Go to ${title}`}
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 flex flex-col items-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-20 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-700"></div>
        <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="relative text-center pt-8 mb-12 max-w-7xl w-full">
        <div className="inline-flex items-center mb-4">
            <h1 className="text-4xl font-extrabold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                JalShakti Dashboard
            </h1>
        </div>
        <p className="text-lg text-gray-600">Your central hub for AI-powered water resource management.</p>
      </div>

      {/* Main Feature Grid */}
      <div className="relative w-full max-w-6xl mx-auto">
        
        {/* AI & User Features */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center mt-8">AI-Powered Tools & Profile</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <FeatureCard
            icon={Bot}
            title="AI Chatbot"
            description="Chat with our AI assistant about water management and station data."
            link="/chat"
          />
          <FeatureCard
            icon={Sparkles}
            title="AI Insights"
            description="Get AI-powered recommendations and water management strategies."
            link="/ai"
          />
          <FeatureCard
            icon={User}
            title="Profile"
            description="Manage your account settings, preferences, and data."
            link="/profile"
          />
        </div>

        {/* Monitoring & Analytics */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center mt-8">Monitoring & Analytics</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <FeatureCard
            icon={MapPin}
            title="Stations"
            description="View all groundwater monitoring stations and their current status on a map."
            link="/stations"
          />
          <FeatureCard
            icon={Database}
            title="Station Data"
            description="Access detailed, real-time data and metrics for each monitoring station."
            link="/station_data"
          />
          <FeatureCard
            icon={BarChart3}
            title="Analytics"
            description="View 2024 forecasts, trends, and comprehensive analytical reports."
            link="/analytics"
          />
        </div>
        
        {/* NOTE: Quick Predictions section removed here */}

      </div>
      
      {/* NOTE: Result display block removed here */}

      {/* Footer */}
      <footer className="relative text-center py-6 mt-12 w-full">
        <p className="text-gray-500 text-sm">
          &copy; 2025 JalShakti. All rights reserved.
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Powered by AI for a sustainable future
        </p>
      </footer>
    </div>
  );
}