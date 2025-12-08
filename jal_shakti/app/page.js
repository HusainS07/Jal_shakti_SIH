"use client";

import Link from "next/link";
import { Droplets, LogIn, UserPlus } from "lucide-react";

export default function HomePage() {
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
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            JalShakti
          </h1>
          <p className="text-xl text-gray-700 mb-2 font-medium">
            Smart Water Management Platform
          </p>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Empowering communities with AI-driven insights for sustainable water
            resource management.
          </p>
        </div>

        {/* Cards grid - Authentication */}
        <div className="w-full max-w-xl">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Get Started</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Sign In Card - Centered UI */}
            <div className="bg-white/90 backdrop-blur-md p-8 rounded-[2rem] shadow-2xl border-2 border-white/70 hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-[1.03] text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl mb-5 shadow-lg mx-auto">
                <LogIn className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h3>
              <p className="text-gray-600 mb-8 text-sm">
                Access your personalized dashboard and water analytics.
              </p>
              <Link
                href="/login"
                className="block w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 rounded-xl text-center hover:from-blue-600 hover:to-cyan-600 transform hover:scale-[1.01] transition-all duration-200 shadow-xl"
              >
                Login to Dashboard
              </Link>
            </div>

            {/* Sign Up Card - Centered UI */}
            <div className="bg-white/90 backdrop-blur-md p-8 rounded-[2rem] shadow-2xl border-2 border-white/70 hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-[1.03] text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl mb-5 shadow-lg mx-auto">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">New Here?</h3>
              <p className="text-gray-600 mb-8 text-sm">
                Create an account and start monitoring your resources today.
              </p>
              <Link
                href="/signup"
                className="block w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold py-3 rounded-xl text-center hover:from-emerald-600 hover:to-teal-600 transform hover:scale-[1.01] transition-all duration-200 shadow-xl"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative text-center py-6 mt-16">
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