"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Droplets,
  LogIn,
  UserPlus,
  TrendingDown,
  Calendar,
  Waves,
  Bot,
  User,
  Sparkles,
  MapPin,
  BarChart3,
  Database,
} from "lucide-react";

export default function HomePage() {
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState("");
  const resultRef = useRef(null);

  // Cache for memoized results with timestamp
  const cacheRef = useRef({});
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

  const callApi = async (endpoint) => {
    const now = Date.now();
    const cached = cacheRef.current[endpoint];

    // Check if we have a valid cached result
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      setResult(cached.data);

      // Scroll to result if needed
      setTimeout(() => {
        if (resultRef.current) {
          const resultPosition =
            resultRef.current.getBoundingClientRect().top + window.scrollY;
          const currentScroll = window.scrollY;
          if (resultPosition > currentScroll + window.innerHeight - 200) {
            resultRef.current.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        }
      }, 100);

      return;
    }

    // No valid cache, make API call
    setIsLoading(endpoint);
    setResult("");

    try {
      const res = await fetch(`/api/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rainfall: 120.5,
          groundwater_level: 28.7,
        }),
      });

      const data = await res.json();
      const message = data.message || "No message received";

      // Store in cache
      cacheRef.current[endpoint] = {
        data: message,
        timestamp: now,
      };

      setResult(message);
    } catch (error) {
      console.error("Error:", error);
      setResult("Failed to fetch prediction");
    } finally {
      setIsLoading("");
    }
  };

  useEffect(() => {
    if (result && resultRef.current) {
      const resultPosition =
        resultRef.current.getBoundingClientRect().top + window.scrollY;
      const currentScroll = window.scrollY;

      if (resultPosition > currentScroll + window.innerHeight - 200) {
        setTimeout(() => {
          resultRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 100);
      }
    }
  }, [result]);

  // Helper to check if result is from cache
  const isCached = (endpoint) => {
    const cached = cacheRef.current[endpoint];
    if (!cached) return false;
    const now = Date.now();
    return now - cached.timestamp < CACHE_DURATION;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 flex flex-col">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-20 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-700"></div>
        <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      {/* Main content */}
      <div className="relative flex-1 flex flex-col justify-center items-center max-w-7xl mx-auto w-full">
        {/* Hero section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-3xl mb-6 shadow-2xl">
            <Droplets className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            JalShakti
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Smart Water Management Platform
          </p>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Empowering communities with AI-driven insights for sustainable water
            resource management
          </p>
        </div>

        {/* Cards grid - Authentication */}
        <div className="w-full max-w-6xl mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Get Started</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4">
                <LogIn className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Sign In</h3>
              <p className="text-gray-600 mb-6">
                Access your dashboard and water analytics
              </p>
              <Link
                href="/login"
                className="block w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 rounded-xl text-center hover:from-blue-600 hover:to-cyan-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
              >
                Login
              </Link>
            </div>

            <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl mb-4">
                <UserPlus className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">New Here?</h3>
              <p className="text-gray-600 mb-6">
                Create an account and start monitoring
              </p>
              <Link
                href="/signup"
                className="block w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold py-3 rounded-xl text-center hover:from-emerald-600 hover:to-teal-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
              >
                Sign Up
              </Link>
            </div>
          </div>

          {/* AI & Chat Features */}
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">AI-Powered Tools</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl mb-4">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">AI Chatbot</h3>
              <p className="text-gray-600 mb-6 text-sm">
                Chat with AI assistant about water management and station data
              </p>
              <Link
                href="/chat"
                className="w-full block bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold py-3 rounded-xl text-center hover:from-pink-600 hover:to-rose-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
              >
                Start Chat
              </Link>
            </div>

            <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl mb-4">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">AI Insights</h3>
              <p className="text-gray-600 mb-6 text-sm">
                Get AI-powered recommendations and water management strategies
              </p>
              <Link
                href="/ai"
                className="w-full block bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold py-3 rounded-xl text-center hover:from-violet-600 hover:to-purple-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
              >
                View Insights
              </Link>
            </div>

            <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl mb-4">
                <User className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Profile</h3>
              <p className="text-gray-600 mb-6 text-sm">
                Manage your account settings and preferences
              </p>
              <Link
                href="/profile"
                className="w-full block bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold py-3 rounded-xl text-center hover:from-orange-600 hover:to-amber-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
              >
                My Profile
              </Link>
            </div>
          </div>

          {/* Stations & Data */}
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Monitoring & Analytics</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl mb-4">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Stations</h3>
              <p className="text-gray-600 mb-6 text-sm">
                View all groundwater monitoring stations and their status
              </p>
              <Link
                href="/stations"
                className="w-full block bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold py-3 rounded-xl text-center hover:from-emerald-600 hover:to-teal-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
              >
                View Stations
              </Link>
            </div>

            <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4">
                <Database className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Station Data</h3>
              <p className="text-gray-600 mb-6 text-sm">
                Access detailed data and metrics for each station
              </p>
              <Link
                href="/station_data"
                className="w-full block bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 rounded-xl text-center hover:from-blue-600 hover:to-cyan-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
              >
                View Data
              </Link>
            </div>

            <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl mb-4">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Analytics</h3>
              <p className="text-gray-600 mb-6 text-sm">
                View 2024 forecasts, trends and comprehensive analytics
              </p>
              <Link
                href="/analytics"
                className="w-full block bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold py-3 rounded-xl text-center hover:from-indigo-600 hover:to-blue-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
              >
                View Analytics
              </Link>
            </div>
          </div>

          {/* Predictions */}
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Quick Predictions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
                <TrendingDown className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Extraction Limit
              </h3>
              <p className="text-gray-600 mb-6 text-sm">
                Calculate safe water extraction limits based on current conditions
              </p>
              <button
                onClick={() => callApi("extraction_limit")}
                disabled={isLoading === "extraction_limit"}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading === "extraction_limit"
                  ? "Processing..."
                  : isCached("extraction_limit")
                  ? "Get Prediction (Cached)"
                  : "Get Prediction"}
              </button>
            </div>

            <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl mb-4">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Future Outlook
              </h3>
              <p className="text-gray-600 mb-6 text-sm">
                Forecast water conditions for the next 3-4 months
              </p>
              <button
                onClick={() => callApi("future_condition")}
                disabled={isLoading === "future_condition"}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-3 rounded-xl hover:from-cyan-600 hover:to-blue-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading === "future_condition"
                  ? "Processing..."
                  : isCached("future_condition")
                  ? "Get Forecast (Cached)"
                  : "Get Forecast"}
              </button>
            </div>
          </div>
        </div>

        {/* Result display */}
        {result && (
          <div
            ref={resultRef}
            className="w-full max-w-6xl bg-white/90 backdrop-blur-lg p-6 rounded-2xl shadow-xl border border-white/20 animate-in fade-in duration-500 mb-8"
          >
            <div className="flex items-start gap-3">
              <Waves className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">
                  Prediction Result
                </h4>
                <p className="text-gray-700">{result}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative text-center py-6 mt-12">
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