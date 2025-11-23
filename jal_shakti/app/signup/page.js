"use client";
import { useState } from "react";
import { Lock, Mail, Droplets, UserPlus, Users, Building2 } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("Signup successful! Please log in.");
      // router.push("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl mb-4 shadow-lg">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h1>
          <p className="text-gray-600">Join JalShakti for smarter water management</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Must be at least 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("user")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    role === "user"
                      ? "border-emerald-500 bg-emerald-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <Users className={`w-8 h-8 mb-2 ${role === "user" ? "text-emerald-600" : "text-gray-400"}`} />
                  <span className={`text-sm font-medium ${role === "user" ? "text-emerald-700" : "text-gray-600"}`}>
                    User
                  </span>
                  <span className="text-xs text-gray-500 mt-1">General access</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("town_planner")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    role === "town_planner"
                      ? "border-emerald-500 bg-emerald-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <Building2 className={`w-8 h-8 mb-2 ${role === "town_planner" ? "text-emerald-600" : "text-gray-400"}`} />
                  <span className={`text-sm font-medium ${role === "town_planner" ? "text-emerald-700" : "text-gray-600"}`}>
                    Town Planner
                  </span>
                  <span className="text-xs text-gray-500 mt-1">Admin access</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSignup}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold py-3 rounded-xl hover:from-emerald-600 hover:to-teal-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <a href="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline">
                Sign in
              </a>
            </p>
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <a
            href="/"
            className="text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors flex items-center gap-2"
          >
            <Droplets className="w-4 h-4" />
            Back to Home
          </a>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          By signing up, you agree to JalShakti's Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}