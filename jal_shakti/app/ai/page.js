"use client";

import { useState } from "react";
import {
  Search, Droplets, Users, Building2, TrendingUp,
  AlertCircle, CheckCircle, Loader2, Sprout, Home, Factory, CloudRain, Wrench
} from "lucide-react";

export default function AIRecommendationsPage() {
  const [stationId, setStationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchRecommendations = async () => {
    if (!stationId.trim()) {
      setError("Station ID daal bhai");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`/api/ai/${stationId.trim()}`, { headers });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Failed to fetch");

      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const f = (n) => (n != null ? Number(n).toLocaleString() : "—");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 flex items-center justify-center gap-4">
            <Droplets className="w-14 h-14 text-blue-600" />
            Water AI Assistant
          </h1>
          <p className="text-xl text-gray-600 mt-3">Groundwater Management • Rajasthan</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-10 max-w-3xl mx-auto">
          <div className="flex gap-4">
            <input
              type="text"
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchRecommendations()}
              placeholder="e.g. RJ_JAIPUR_CHOMU_001"
              className="flex-1 px-8 py-5 text-lg border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={fetchRecommendations}
              disabled={loading}
              className="px-10 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-2xl hover:shadow-xl transform hover:scale-105 transition-all flex items-center gap-3"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-3xl mx-auto bg-red-50 border-2 border-red-300 text-red-700 p-6 rounded-2xl flex items-center gap-4 mb-8">
            <AlertCircle className="w-10 h-10" />
            <div>
              <h3 className="font-bold text-xl">Error</h3>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {data && (
          <div className="space-y-10">

            {/* Summary */}
            {data.summary && (
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-10 rounded-3xl shadow-xl">
                <div className="flex items-start gap-5">
                  <CheckCircle className="w-12 h-12 flex-shrink-0" />
                  <div>
                    <h2 className="text-3xl font-bold mb-4">Executive Summary</h2>
                    <p className="text-xl leading-relaxed opacity-95">{data.summary}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center transform hover:scale-105 transition">
                <Droplets className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Water Level Status</p>
                <p className="text-4xl font-bold text-blue-700 mt-2 capitalize">
                  {data.water_level_status || "—"}
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-8 text-center transform hover:scale-105 transition">
                <TrendingUp className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Daily Extraction Limit</p>
                <p className="text-4xl font-bold text-green-700 mt-2">{f(data.daily_extraction_limit_liters)} L</p>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-8 text-center transform hover:scale-105 transition">
                <Users className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Buckets per Borewell</p>
                <p className="text-4xl font-bold text-purple-700 mt-2">{data.buckets_per_borewell}</p>
              </div>
            </div>

            {/* User Recommendations */}
            {data.user_recommendations && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-10 shadow-xl">
                <h2 className="text-3xl font-bold text-green-800 flex items-center gap-4 mb-8">
                  <Users className="w-10 h-10" /> Farmer & Household Recommendations
                </h2>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-2xl p-6 shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <Sprout className="w-8 h-8 text-green-600" />
                      <h3 className="text-xl font-bold">Drought-Resistant Crops</h3>
                    </div>
                    <ul className="space-y-3">
                      {data.user_recommendations.crops?.map((crop, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-gray-700">{crop}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <Droplets className="w-8 h-8 text-blue-600" />
                      <h3 className="text-xl font-bold">Livestock Water Needs</h3>
                    </div>
                    <div className="space-y-3 text-lg">
                      <div className="flex justify-between"><span>Adult Cattle</span><strong>{data.user_recommendations.livestock_water?.cattle_adult_liters_per_day} L/day</strong></div>
                      <div className="flex justify-between"><span>Calf</span><strong>{data.user_recommendations.livestock_water?.cattle_calf_liters_per_day} L/day</strong></div>
                      <div className="flex justify-between"><span>Poultry</span><strong>{data.user_recommendations.livestock_water?.poultry_liters_per_day} L/day</strong></div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-2xl p-6 shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <Home className="w-8 h-8 text-cyan-600" />
                      <h3 className="text-xl font-bold">Household Conservation Tips</h3>
                    </div>
                    <ul className="space-y-2">
                      {data.user_recommendations.household_conservation?.map((tip, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-8 h-8 text-amber-600" />
                      <div>
                        <h3 className="text-xl font-bold text-amber-900">Water Quality Alert</h3>
                        <p className="mt-2 text-gray-800">{data.user_recommendations.water_quality_notes || "No major issues"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Town Planner Recommendations */}
            {data.town_planner_recommendations && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-3xl p-10 shadow-xl">
                <h2 className="text-3xl font-bold text-purple-800 flex items-center gap-4 mb-10">
                  <Building2 className="w-12 h-12" /> Town Planner & Municipal Actions
                </h2>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <Factory className="w-10 h-10 text-red-600 mb-4" />
                    <h4 className="font-bold text-lg mb-3">Industrial Limits</h4>
                    <p className="text-gray-700">{data.town_planner_recommendations.industrial_limits}</p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <CloudRain className="w-10 h-10 text-blue-600 mb-4" />
                    <h4 className="font-bold text-lg mb-3">Recharge Projects</h4>
                    <ul className="space-y-2">
                      {data.town_planner_recommendations.recharge_interventions?.map((item, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <Wrench className="w-10 h-10 text-green-600 mb-4" />
                    <h4 className="font-bold text-lg mb-3">Irrigation Efficiency</h4>
                    <ul className="space-y-2">
                      {data.town_planner_recommendations.irrigation_improvements?.map((item, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 grid md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h4 className="font-bold text-lg mb-3">Major Infrastructure</h4>
                    <ul className="space-y-2">
                      {data.town_planner_recommendations.infrastructure_projects?.map((item, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-purple-600" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-indigo-50 border-2 border-indigo-300 rounded-2xl p-6">
                    <h4 className="font-bold text-xl text-indigo-900 mb-3">Future Planning (2030–2040)</h4>
                    <p className="text-indigo-800 leading-relaxed">
                      {data.town_planner_recommendations.future_planning}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Water Stats */}
            <div className="bg-white rounded-3xl shadow-2xl p-10">
              <h3 className="text-2xl font-bold text-gray-800 mb-8 text-center">Annual Water Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div>
                  <p className="text-gray-600 text-lg">Household Daily Need</p>
                  <p className="text-4xl font-bold text-blue-600 mt-2">{f(data.household_water_liters)} L</p>
                </div>
                <div>
                  <p className="text-gray-600 text-lg">Agriculture (Yearly)</p>
                  <p className="text-4xl font-bold text-green-600 mt-2">{f(data.agriculture_water_m3_year)} m³</p>
                </div>
                <div>
                  <p className="text-gray-600 text-lg">Industrial Limit</p>
                  <p className="text-4xl font-bold text-red-600 mt-2">{f(data.industrial_extraction_limit_m3_year)} m³</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Empty State */}
        {!data && !loading && !error && (
          <div className="text-center py-20">
            <Droplets className="w-32 h-32 text-gray-300 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-600">Enter Station ID to Begin</h2>
            <p className="text-gray-500 mt-3">AI recommendations will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}