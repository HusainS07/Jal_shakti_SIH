"use client";
import { useState, useRef, useEffect } from "react";
import { Droplets, LogIn, UserPlus, TrendingDown, Calendar, Waves } from "lucide-react";

export default function HomePage() {
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState("");
  const resultRef = useRef(null);

  const callApi = async (endpoint) => {
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
      setResult(data.message || "No message received");
    } catch (error) {
      console.error("Error:", error);
      setResult("Failed to fetch prediction");
    } finally {
      setIsLoading("");
    }
  };

  useEffect(() => {
    if (result && resultRef.current) {
      const resultPosition = resultRef.current.getBoundingClientRect().top + window.scrollY;
      const currentScroll = window.scrollY;
      
      // Only scroll if the result is below the current view
      if (resultPosition > currentScroll + window.innerHeight - 200) {
        setTimeout(() => {
          resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [result]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 flex flex-col">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-20 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-700"></div>
        <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      {/* Main content */}
      <div className="relative flex-1 flex flex-col justify-center items-center max-w-6xl mx-auto w-full">
        {/* Hero section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-3xl mb-6 shadow-2xl">
            <Droplets className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            JalShakti
          </h1>
          <p className="text-xl text-gray-600 mb-2">Smart Water Management Platform</p>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Empowering communities with AI-driven insights for sustainable water resource management
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl mb-8">
          {/* Auth cards */}
          <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4">
              <LogIn className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Sign In</h3>
            <p className="text-gray-600 mb-6">Access your dashboard and water analytics</p>
            <a
              href="/login"
              className="block w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 rounded-xl text-center hover:from-blue-600 hover:to-cyan-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
            >
              Login
            </a>
          </div>

          <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl mb-4">
              <UserPlus className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">New Here?</h3>
            <p className="text-gray-600 mb-6">Create an account and start monitoring</p>
            <a
              href="/signup"
              className="block w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold py-3 rounded-xl text-center hover:from-emerald-600 hover:to-teal-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
            >
              Sign Up
            </a>
          </div>

          {/* Prediction cards */}
          <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
              <TrendingDown className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Extraction Limit</h3>
            <p className="text-gray-600 mb-6 text-sm">Calculate safe water extraction limits based on current conditions</p>
            <button
              onClick={() => callApi("extraction_limit")}
              disabled={isLoading === "extraction_limit"}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading === "extraction_limit" ? "Processing..." : "Get Prediction"}
            </button>
          </div>

          <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl mb-4">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Future Outlook</h3>
            <p className="text-gray-600 mb-6 text-sm">Forecast water conditions for the next 3-4 months</p>
            <button
              onClick={() => callApi("future_condition")}
              disabled={isLoading === "future_condition"}
              className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold py-3 rounded-xl hover:from-indigo-600 hover:to-blue-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading === "future_condition" ? "Processing..." : "Get Forecast"}
            </button>
          </div>
        </div>

        {/* Result display */}
        {result && (
          <div ref={resultRef} className="w-full max-w-4xl bg-white/90 backdrop-blur-lg p-6 rounded-2xl shadow-xl border border-white/20 animate-in fade-in duration-500">
            <div className="flex items-start gap-3">
              <Waves className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Prediction Result</h4>
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