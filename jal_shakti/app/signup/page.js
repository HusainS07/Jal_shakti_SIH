"use client";
import { useState } from "react";
import { Lock, Mail, Droplets, UserPlus, Users, Building2, Brain, ScrollText } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("farmer"); // default
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const roles = [
    { value: "farmer", label: "Farmer", icon: Users, desc: "Kisan bhai" },
    { value: "normal citizen", label: "Citizen", icon: Users, desc: "General public" },
    { value: "decision maker", label: "Decision Maker", icon: ScrollText, desc: "Policy & Planning" },
    { value: "ground water researcher", label: "Researcher", icon: Brain, desc: "Scientist / Expert" },
  ];

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
      if (!res.ok) throw new Error(data.error || "Signup failed");

      alert("Account created! Please Login now.");
      window.location.href = "/login";
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-cyan-50 to-teal-50 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply blur-3xl opacity-40 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-cyan-200 rounded-full mix-blend-multiply blur-3xl opacity-40 animate-pulse"></div>
      </div>

      <div className="relative w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl mb-6 shadow-2xl">
            <Droplets className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-3">Create Your Account</h1>
          <p className="text-lg text-gray-600">Choose your role and join JalShakti mission</p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/30">
          <form onSubmit={handleSignup} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:outline-none transition"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:outline-none transition"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* 4 ROLES — BEAUTIFUL GRID */}
            <div>
              <label className="block text-lg font-bold text-gray-800 mb-6 text-center">Select Your Role</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {roles.map((r) => {
                  const Icon = r.icon;
                  const selected = role === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`p-6 rounded-2xl border-3 transition-all transform hover:scale-105 ${
                        selected
                          ? "border-emerald-500 bg-emerald-50 shadow-xl"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <Icon className={`w-12 h-12 mx-auto mb-3 ${selected ? "text-emerald-600" : "text-gray-400"}`} />
                      <div className={`font-bold ${selected ? "text-emerald-700" : "text-gray-700"}`}>
                        {r.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{r.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-300 text-red-700 p-4 rounded-xl text-center font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xl font-bold py-5 rounded-2xl hover:from-emerald-600 hover:to-teal-700 transform hover:scale-[1.02] transition-all shadow-xl disabled:opacity-60"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <a href="/login" className="text-emerald-600 font-bold hover:underline">
                Sign In
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}