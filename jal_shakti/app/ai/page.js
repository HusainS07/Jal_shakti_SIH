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
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-cyan-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 flex items-center justify-center gap-4">
            <Droplets className="w-14 h-14 text-blue-600" />
            Water AI Assistant
          </h1>
          <p className="text-xl text-gray-600 mt-3">Groundwater Management • INDIA</p>
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
              className="px-10 py-5 bg-linear-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-2xl hover:shadow-xl transform hover:scale-105 transition-all flex items-center gap-3"
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
              <div className="bg-linear-to-r from-blue-600 to-cyan-600 text-white p-10 rounded-3xl shadow-xl">
                <div className="flex items-start gap-5">
                  <CheckCircle className="w-12 h-12 shrink-0" />
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

            {/* Personal Advice for Farmers/Citizens */}
            {data.personal_advice && (
              <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-3xl p-10 shadow-xl">
                <h2 className="text-3xl font-bold text-green-800 flex items-center gap-4 mb-8">
                  <Sprout className="w-10 h-10" /> Personal Farmer Advice
                </h2>

                {/* Greeting */}
                {data.personal_advice.message_to_farmer && (
                  <div className="bg-white rounded-2xl p-6 mb-8 border-l-4 border-green-600 shadow">
                    <p className="text-lg text-gray-800 italic">{data.personal_advice.message_to_farmer}</p>
                  </div>
                )}

                {/* Your Profile */}
                {data.personal_advice.your_profile && (
                  <div className="bg-white rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold text-green-700 mb-4">Your Farm Profile</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-gray-600 font-semibold mb-2">Crops</p>
                        <p className="text-gray-800">{data.personal_advice.your_profile.crops || "—"}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-semibold mb-2">Livestock</p>
                        <p className="text-gray-800">{data.personal_advice.your_profile.livestock || "—"}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-semibold mb-2">Land Size</p>
                        <p className="text-gray-800">{data.personal_advice.your_profile.land_size || "—"}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-semibold mb-2">Irrigation Method</p>
                        <p className="text-gray-800">{data.personal_advice.your_profile.irrigation_method || "—"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Immediate Actions */}
                {data.personal_advice.immediate_actions && (
                  <div className="bg-white rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold text-amber-700 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-6 h-6" /> Immediate Actions
                    </h3>
                    <ol className="space-y-3">
                      {(Array.isArray(data.personal_advice.immediate_actions) 
                        ? data.personal_advice.immediate_actions 
                        : [data.personal_advice.immediate_actions]
                      ).map((action, i) => (
                        <li key={i} className="flex gap-4">
                          <span className="shrink-0 w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold">{i + 1}</span>
                          <span className="text-gray-800 pt-1">{action}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Crop Recommendations */}
                {data.personal_advice.crop_recommendations && (
                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    {/* Current Crops */}
                    {typeof data.personal_advice.crop_recommendations === 'object' && data.personal_advice.crop_recommendations.your_current_crops && (
                      <div className="bg-blue-50 rounded-2xl p-6 shadow border-l-4 border-blue-600">
                        <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                          <Sprout className="w-6 h-6" /> Your Current Crops
                        </h3>
                        <p className="text-lg font-semibold text-blue-900">{data.personal_advice.crop_recommendations.your_current_crops}</p>
                        {data.personal_advice.crop_recommendations.personalized_advice && (
                          <p className="text-sm text-blue-700 mt-3 italic">{data.personal_advice.crop_recommendations.personalized_advice}</p>
                        )}
                      </div>
                    )}

                    {/* Recommended Additions */}
                    {typeof data.personal_advice.crop_recommendations === 'object' && data.personal_advice.crop_recommendations.recommended_additions && (
                      <div className="bg-green-50 rounded-2xl p-6 shadow border-l-4 border-green-600">
                        <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
                          <CheckCircle className="w-6 h-6" /> Recommended to Add
                        </h3>
                        <ul className="space-y-2">
                          {(Array.isArray(data.personal_advice.crop_recommendations.recommended_additions) 
                            ? data.personal_advice.crop_recommendations.recommended_additions 
                            : [data.personal_advice.crop_recommendations.recommended_additions]
                          ).map((crop, i) => (
                            <li key={i} className="flex items-center gap-2 text-gray-800">
                              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                              {crop}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Avoid in Dry Season */}
                    {typeof data.personal_advice.crop_recommendations === 'object' && data.personal_advice.crop_recommendations.avoid_in_dry_season && (
                      <div className="bg-red-50 rounded-2xl p-6 shadow border-l-4 border-red-500">
                        <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
                          <AlertCircle className="w-6 h-6" /> Avoid in Dry Season
                        </h3>
                        <ul className="space-y-2">
                          {(Array.isArray(data.personal_advice.crop_recommendations.avoid_in_dry_season) 
                            ? data.personal_advice.crop_recommendations.avoid_in_dry_season 
                            : [data.personal_advice.crop_recommendations.avoid_in_dry_season]
                          ).map((crop, i) => (
                            <li key={i} className="flex items-center gap-2 text-red-800">
                              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                              {crop}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Water Efficient Varieties */}
                    {typeof data.personal_advice.crop_recommendations === 'object' && data.personal_advice.crop_recommendations.water_efficient_varieties && (
                      <div className="bg-cyan-50 rounded-2xl p-6 shadow border-l-4 border-cyan-600">
                        <h3 className="text-xl font-bold text-cyan-800 mb-4">💧 Water-Efficient Tips</h3>
                        <p className="text-gray-800">{data.personal_advice.crop_recommendations.water_efficient_varieties}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Irrigation Tips */}
                {data.personal_advice.irrigation_tips && (
                  <div className="bg-white rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
                      <Droplets className="w-6 h-6" /> Irrigation Methods & Tips
                    </h3>
                    {typeof data.personal_advice.irrigation_tips === 'object' && data.personal_advice.irrigation_tips.method && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                        <p className="font-semibold text-blue-900 mb-3">Your Method: <span className="capitalize">{data.personal_advice.irrigation_tips.method}</span></p>
                        <ul className="space-y-2">
                          {(Array.isArray(data.personal_advice.irrigation_tips.tips) 
                            ? data.personal_advice.irrigation_tips.tips 
                            : [data.personal_advice.irrigation_tips.tips]
                          ).map((tip, i) => (
                            <li key={i} className="flex gap-2 text-gray-800">
                              <span className="shrink-0 text-blue-600 mt-1">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Livestock Care */}
                {data.personal_advice.livestock_care && (
                  <div className="bg-white rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold text-amber-700 mb-4">Livestock Water Care</h3>
                    {typeof data.personal_advice.livestock_care === 'object' && data.personal_advice.livestock_care.animals && (
                      <div className="mb-4 p-4 bg-amber-50 rounded-lg border-l-4 border-amber-600">
                        <p className="font-semibold text-amber-900 mb-3">Your Animals: {data.personal_advice.livestock_care.animals}</p>
                        <ul className="space-y-2">
                          {(Array.isArray(data.personal_advice.livestock_care.tips) 
                            ? data.personal_advice.livestock_care.tips 
                            : [data.personal_advice.livestock_care.tips]
                          ).map((tip, i) => (
                            <li key={i} className="flex gap-2 text-gray-800">
                              <span className="shrink-0 text-amber-600 mt-1">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Rainwater Harvesting */}
                {data.personal_advice.rainwater_harvesting && (
                  <div className="bg-blue-50 rounded-2xl p-6 mb-8 shadow border-l-4 border-blue-600">
                    <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                      <CloudRain className="w-6 h-6" /> Rainwater Harvesting
                    </h3>
                    {typeof data.personal_advice.rainwater_harvesting === 'object' && data.personal_advice.rainwater_harvesting.farm_size && (
                      <div className="mb-4 p-4 bg-white rounded-lg border-l-4 border-blue-600">
                        <p className="font-semibold text-blue-900 mb-3">For Your Farm: {data.personal_advice.rainwater_harvesting.farm_size}</p>
                        <ul className="space-y-2">
                          {(Array.isArray(data.personal_advice.rainwater_harvesting.solutions) 
                            ? data.personal_advice.rainwater_harvesting.solutions 
                            : [data.personal_advice.rainwater_harvesting.solutions]
                          ).map((solution, i) => (
                            <li key={i} className="flex gap-2 text-gray-800">
                              <span className="shrink-0 text-blue-600 mt-1">•</span>
                              <span>{solution}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Government Schemes */}
                {data.personal_advice.government_schemes && (
                  <div className="bg-purple-50 rounded-2xl p-6 mb-8 shadow border-l-4 border-purple-600">
                    <h3 className="text-xl font-bold text-purple-800 mb-4">Government Schemes</h3>
                    <ul className="space-y-2">
                      {(Array.isArray(data.personal_advice.government_schemes) 
                        ? data.personal_advice.government_schemes 
                        : [data.personal_advice.government_schemes]
                      ).map((scheme, i) => (
                        <li key={i} className="flex gap-2 text-gray-800">
                          <span className="shrink-0 text-purple-600 mt-1">•</span>
                          <span>{scheme}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Critical Warning */}
                {data.personal_advice.critical_warning && (
                  <div className="bg-red-100 border-2 border-red-500 rounded-2xl p-6 mb-8 shadow">
                    <div className="flex items-start gap-4">
                      <AlertCircle className="w-8 h-8 text-red-700 shrink-0 mt-1" />
                      <div>
                        <h3 className="text-xl font-bold text-red-900">Critical Water Alert</h3>
                        <p className="mt-2 text-red-800">{data.personal_advice.critical_warning}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* General Conservation Tips */}
                {data.general_conservation_tips && (
                  <div className="bg-white rounded-2xl p-6 shadow">
                    <h3 className="text-xl font-bold text-teal-700 mb-6">General Conservation Tips</h3>
                    <div className="grid md:grid-cols-3 gap-6">
                      {data.general_conservation_tips.household && (
                        <div className="bg-cyan-50 rounded-lg p-4 border-l-4 border-cyan-600">
                          <h4 className="font-bold text-cyan-900 mb-3 flex items-center gap-2">
                            <Home className="w-5 h-5" /> Household
                          </h4>
                          <ul className="space-y-2">
                            {(Array.isArray(data.general_conservation_tips.household) 
                              ? data.general_conservation_tips.household 
                              : [data.general_conservation_tips.household]
                            ).map((tip, i) => (
                              <li key={i} className="flex gap-2 text-sm text-gray-800">
                                <span className="shrink-0 text-cyan-600 mt-1">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {data.general_conservation_tips.agriculture && (
                        <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-600">
                          <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                            <Sprout className="w-5 h-5" /> Agriculture
                          </h4>
                          <ul className="space-y-2">
                            {(Array.isArray(data.general_conservation_tips.agriculture) 
                              ? data.general_conservation_tips.agriculture 
                              : [data.general_conservation_tips.agriculture]
                            ).map((tip, i) => (
                              <li key={i} className="flex gap-2 text-sm text-gray-800">
                                <span className="shrink-0 text-green-600 mt-1">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {data.general_conservation_tips.livestock && (
                        <div className="bg-amber-50 rounded-lg p-4 border-l-4 border-amber-600">
                          <h4 className="font-bold text-amber-900 mb-3">Livestock</h4>
                          <ul className="space-y-2">
                            {(Array.isArray(data.general_conservation_tips.livestock) 
                              ? data.general_conservation_tips.livestock 
                              : [data.general_conservation_tips.livestock]
                            ).map((tip, i) => (
                              <li key={i} className="flex gap-2 text-sm text-gray-800">
                                <span className="shrink-0 text-amber-600 mt-1">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Recommendations (keep existing) */}
            {data.user_recommendations && (
              <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-3xl p-10 shadow-xl">
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
                          <CheckCircle className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
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

            {/* Planner Recommendations - NEW COMPREHENSIVE */}
            {data.planner_recommendations && (
              <div className="bg-linear-to-br from-purple-50 to-indigo-50 rounded-3xl p-10 shadow-xl">
                <h2 className="text-3xl font-bold text-purple-800 flex items-center gap-4 mb-10">
                  <Building2 className="w-12 h-12" /> Government & Planning Actions
                </h2>

                {/* Immediate Actions */}
                {data.planner_recommendations.immediate_actions && (
                  <div className="bg-red-50 border-l-4 border-red-600 rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold text-red-800 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-6 h-6" /> Immediate Actions (Priority)
                    </h3>
                    <ol className="space-y-3">
                      {data.planner_recommendations.immediate_actions.map((action, i) => (
                        <li key={i} className="flex gap-4">
                          <span className="shrink-0 w-8 h-8 bg-red-200 text-red-700 rounded-full flex items-center justify-center font-bold text-sm">{i + 1}</span>
                          <span className="text-gray-800 pt-1">{action}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Policy Interventions */}
                {data.planner_recommendations.policy_interventions && (
                  <div className="bg-white rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Policy Interventions</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      {Object.entries(data.planner_recommendations.policy_interventions).map(([key, value], i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-4 border-l-4 border-purple-500">
                          <h4 className="font-bold text-gray-800 capitalize mb-2">{key.replace(/_/g, " ")}</h4>
                          <p className="text-sm text-gray-700">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recharge Infrastructure */}
                {data.planner_recommendations.recharge_infrastructure && (
                  <div className="bg-blue-50 rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                      <CloudRain className="w-6 h-6" /> Recharge Infrastructure
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {Object.entries(data.planner_recommendations.recharge_infrastructure).map(([type, desc], i) => (
                        <div key={i} className="bg-white rounded-lg p-4 border border-blue-200">
                          <p className="font-bold text-blue-900 capitalize mb-2">{type.replace(/_/g, " ")}</p>
                          <p className="text-sm text-gray-800">{desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Irrigation Modernization */}
                {data.planner_recommendations.irrigation_modernization && (
                  <div className="bg-green-50 rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
                      <Sprout className="w-6 h-6" /> Irrigation Modernization
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {Object.entries(data.planner_recommendations.irrigation_modernization).map(([initiative, detail], i) => (
                        <div key={i} className="bg-white rounded-lg p-4 border border-green-200">
                          <p className="font-bold text-green-900 capitalize mb-2">{initiative.replace(/_/g, " ")}</p>
                          <p className="text-sm text-gray-800">{detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Water Quality Management */}
                {data.planner_recommendations.water_quality_management && (
                  <div className="bg-amber-50 rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold text-amber-800 mb-4">Water Quality Management</h3>
                    <div className="space-y-3">
                      {Object.entries(data.planner_recommendations.water_quality_management).map(([measure, detail], i) => (
                        <div key={i} className="bg-white rounded-lg p-4 border-l-4 border-amber-500">
                          <p className="font-bold text-amber-900 capitalize">{measure.replace(/_/g, " ")}</p>
                          <p className="text-sm text-gray-800 mt-1">{detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Future Projections */}
                {data.planner_recommendations.future_projections && (
                  <div className="bg-indigo-100 border-2 border-indigo-500 rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-6 h-6" /> Future Projections (2030-2040)
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(data.planner_recommendations.future_projections).map(([metric, value], i) => (
                        <div key={i} className="bg-white rounded-lg p-3">
                          <p className="font-bold text-indigo-900 capitalize mb-1">{metric.replace(/_/g, " ")}</p>
                          <p className="text-sm text-gray-800">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Financing */}
                {data.planner_recommendations.financing && (
                  <div className="bg-white rounded-2xl p-6 shadow">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Financing & Funding</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-bold text-gray-800 mb-3">Government Schemes</h4>
                        <ul className="space-y-2">
                          {data.planner_recommendations.financing.government_schemes?.map((scheme, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-gray-800">
                              <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                              {scheme}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                          <p className="text-sm font-bold text-blue-900 mb-1">Estimated Cost</p>
                          <p className="text-lg font-bold text-blue-700">{data.planner_recommendations.financing.estimated_cost}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                          <p className="text-sm font-bold text-green-900 mb-1">Community Contribution</p>
                          <p className="text-gray-800">{data.planner_recommendations.financing.community_funding}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Town Planner Recommendations (keep existing for backward compatibility) */}
            {data.town_planner_recommendations && (
              <div className="bg-linear-to-br from-purple-50 to-indigo-50 rounded-3xl p-10 shadow-xl">
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