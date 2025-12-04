// app/ai/page.js  ← FINAL FIXED VERSION (Works with Turbopack)

"use client";

import { useState } from "react";
import {
  AlertCircle,
  Droplets,
  Shield,
  Users,
  FileText,
  CheckCircle,
  Loader2,
} from "lucide-react";

export default function Home() {
  const [stationId, setStationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const fetchRecommendations = async () => {
    if (!stationId.trim()) {
      setError("Please enter a Station ID");
      return;
    }

    setLoading(true);
    setError("");
    setData(null);

    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`/api/ai/${stationId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to fetch recommendations");
      }

      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-900 mb-3">
            Jal Shakti AI Advisor
          </h1>
          <p className="text-lg text-gray-700">
            Real-time water safety & conservation recommendations
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-10">
          <div className="flex flex-col md:flex-row gap-4 max-w-3xl mx-auto">
            <input
              type="text"
              placeholder="Enter Station ID (e.g. RJ_JAIPUR_CHOMU_001)"
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              className="flex-1 px-6 py-4 text-lg border-2 border-blue-200 rounded-xl focus:border-blue-600 focus:outline-none transition"
              onKeyDown={(e) => e.key === "Enter" && fetchRecommendations()}
            />
            <button
              onClick={fetchRecommendations}
              disabled={loading}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Get Recommendations
                  <Droplets className="w-6 h-6" />
                </>
              )}
            </button>
          </div>

          {error && (
            <p className="text-center text-red-600 font-semibold mt-5 text-lg">
              {error}
            </p>
          )}
        </div>

        {/* Results */}
        {data && (
          <div className="space-y-10">
            {/* Water Quality & Safety */}
            <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-3xl p-8 border-2 border-red-300">
              <div className="flex items-center gap-4 mb-6">
                <Shield className="w-12 h-12 text-red-600" />
                <h2 className="text-3xl font-bold text-red-800">Water Quality & Safety</h2>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <p className="text-xl text-gray-800 mb-6 leading-relaxed">
                    {data.water_quality.summary}
                  </p>
                  <div className="text-6xl font-extrabold">
                    {data.water_quality.status === "safe" && <span className="text-green-600">SAFE</span>}
                    {data.water_quality.status === "caution" && <span className="text-orange-600">CAUTION</span>}
                    {data.water_quality.status === "unsafe" && <span className="text-red-600">UNSAFE</span>}
                    {data.water_quality.status === "no_data" && <span className="text-gray-600">NO DATA</span>}
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-red-700 mb-5">
                    Immediate Safety Actions
                  </h3>
                  <div className="space-y-3">
                    {data.water_safety_recommendations.map((tip, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-4 bg-white rounded-xl p-5 shadow-md border border-red-100"
                      >
                        <AlertCircle className="w-7 h-7 text-red-600 flex-shrink-0" />
                        <p className="text-gray-800 font-medium">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.key_metrics.daily_extraction_limit_liters && (
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-8 text-center">
                  <p className="text-blue-700 font-semibold">Daily Safe Limit</p>
                  <p className="text-4xl font-bold text-blue-900 mt-3">
                    {Number(data.key_metrics.daily_extraction_limit_liters).toLocaleString()} L
                  </p>
                </div>
              )}
              {data.key_metrics.buckets_per_borewell && (
                <div className="bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-2xl p-8 text-center">
                  <p className="text-cyan-700 font-semibold">Buckets per Borewell</p>
                  <p className="text-4xl font-bold text-cyan-900 mt-3">
                    {data.key_metrics.buckets_per_borewell}
                  </p>
                </div>
              )}
              <div className={`rounded-2xl p-8 text-center ${
                data.key_metrics.risk_level === "CRITICAL"
                  ? "bg-gradient-to-br from-red-100 to-red-200"
                  : data.key_metrics.risk_level === "HIGH"
                  ? "bg-gradient-to-br from-orange-100 to-orange-200"
                  : "bg-gradient-to-br from-yellow-100 to-amber-200"
              }`}>
                <p className="font-semibold">Risk Level</p>
                <p className="text-5xl font-extrabold mt-3">{data.key_metrics.risk_level}</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-3xl shadow-2xl p-10">
              <h3 className="text-3xl font-bold mb-6 flex items-center gap-4">
                <FileText className="w-9 h-9 text-blue-600" />
                Overall Summary
              </h3>
              <p className="text-xl text-gray-700 leading-relaxed">{data.overall_summary}</p>
            </div>

            {/* Conservation Tips */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8">
                <h3 className="text-2xl font-bold text-green-800 mb-6">Household Water Saving Tips</h3>
                <ul className="space-y-4">
                  {data.water_conservation_tips.household.map((tip, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <CheckCircle className="w-7 h-7 text-green-600 flex-shrink-0" />
                      <span className="text-lg">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-8">
                <h3 className="text-2xl font-bold text-emerald-800 mb-6">Farm Water Management Tips</h3>
                <ul className="space-y-4">
                  {data.water_conservation_tips.farm.map((tip, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <CheckCircle className="w-7 h-7 text-emerald-600 flex-shrink-0" />
                      <span className="text-lg">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Role-based Recommendations */}
            {data.farmer_recommendations && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-100 rounded-3xl p-10 border-4 border-indigo-300">
                <h3 className="text-4xl font-bold text-indigo-900 text-center mb-10">
                  Recommendations for Farmers
                </h3>
                <div className="grid md:grid-cols-2 gap-10">
                  <div>
                    <h4 className="text-2xl font-bold mb-5">Best Crops to Grow</h4>
                    {data.farmer_recommendations.crop_suggestions.map((crop, i) => (
                      <div key={i} className="bg-white rounded-xl p-5 mb-4 shadow-lg text-lg">
                        {crop}
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold mb-5">Government Schemes</h4>
                    {data.farmer_recommendations.government_schemes.map((scheme, i) => (
                      <div key={i} className="bg-indigo-100 rounded-xl p-5 mb-4 shadow">
                        {scheme}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {data.policy_recommendations && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-100 rounded-3xl p-10 border-4 border-amber-400">
                <h3 className="text-4xl font-bold text-amber-900 text-center mb-8">
                  Policy & Planning Recommendations
                </h3>
                <div className="bg-red-600 text-white text-center py-6 rounded-2xl text-3xl font-bold mb-8">
                  {data.policy_recommendations.urgency}
                </div>
                <p className="text-xl text-center italic mb-10">
                  {data.policy_recommendations.executive_summary}
                </p>
                <h4 className="text-2xl font-bold mb-6">Immediate Actions Required</h4>
                <div className="space-y-5">
                  {data.policy_recommendations.immediate_actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-5 bg-white rounded-xl p-6 shadow-xl">
                      <span className="text-3xl font-bold text-amber-700">{i + 1}</span>
                      <p className="text-lg font-medium">{action}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Community Actions */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl p-10">
              <h3 className="text-3xl font-bold text-purple-800 text-center mb-8 flex items-center justify-center gap-5">
                <Users className="w-12 h-12" />
                Community Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.community_actions.map((action, i) => (
                  <div key={i} className="bg-white rounded-2xl p-7 text-center shadow-xl font-semibold text-lg">
                    {action}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-gray-600 py-10">
              <p className="text-lg">
                Generated on {new Date(data.metadata.generated_at).toLocaleString("en-IN")}
              </p>
              <p className="mt-3 font-medium">
                Powered by Groq Llama 3.3 • Station: {data.metadata.station_id}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}