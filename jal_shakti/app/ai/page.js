// app/ai/page.js
"use client";

import { useState } from 'react';
import { Search, Droplets, Users, Building2, TrendingUp, AlertCircle, CheckCircle, Loader2, Sprout, Home, Factory } from 'lucide-react';

export default function AIRecommendationsPage() {
  const [stationId, setStationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchRecommendations = async () => {
    if (!stationId.trim()) {
      setError('Please enter a station ID');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(`/api/ai/${stationId.trim()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch recommendations');
      }

      if (result.error) {
        throw new Error(result.error);
      }

      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      fetchRecommendations();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Droplets className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">
              Water Station AI Assistant
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Get AI-powered recommendations for groundwater management
          </p>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter Station ID (e.g., RJ_JAIPUR_CHOMU_001)"
                className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg"
              />
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
            </div>
            <button
              onClick={fetchRecommendations}
              disabled={loading}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Analyze
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-8 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-red-800 text-lg mb-1">Error</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {data && (
          <div className="space-y-6">
            {/* Summary Card */}
            {data.summary && (
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl shadow-lg p-8">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-8 h-8 flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="text-2xl font-bold mb-3">Executive Summary</h2>
                    <p className="text-blue-50 text-lg leading-relaxed">{data.summary}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex items-center gap-3 mb-2">
                  <Droplets className="w-6 h-6 text-blue-600" />
                  <h3 className="font-semibold text-gray-700">Water Level Status</h3>
                </div>
                <p className="text-3xl font-bold text-gray-800 capitalize">{data.water_level_status}</p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <h3 className="font-semibold text-gray-700">Daily Extraction Limit</h3>
                </div>
                <p className="text-3xl font-bold text-gray-800">{data.daily_extraction_limit_liters.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Liters/day</p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-6 h-6 text-purple-600" />
                  <h3 className="font-semibold text-gray-700">Buckets per Borewell</h3>
                </div>
                <p className="text-3xl font-bold text-gray-800">{data.buckets_per_borewell}</p>
                <p className="text-sm text-gray-500">Per day</p>
              </div>
            </div>

            {/* User Recommendations */}
            {data.user_recommendations && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-8 h-8 text-green-600" />
                  <h2 className="text-2xl font-bold text-gray-800">User Recommendations</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Crops */}
                  {data.user_recommendations.crops && (
                    <div className="bg-green-50 rounded-xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Sprout className="w-6 h-6 text-green-700" />
                        <h3 className="text-xl font-semibold text-green-900">Recommended Crops</h3>
                      </div>
                      <ul className="space-y-3">
                        {data.user_recommendations.crops.map((crop, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">{crop}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Livestock Water */}
                  {data.user_recommendations.livestock_water && (
                    <div className="bg-blue-50 rounded-xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Droplets className="w-6 h-6 text-blue-700" />
                        <h3 className="text-xl font-semibold text-blue-900">Livestock Water Needs</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">Adult Cattle</span>
                          <span className="text-blue-700 font-bold">{data.user_recommendations.livestock_water.cattle_adult_liters_per_day} L/day</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">Calf</span>
                          <span className="text-blue-700 font-bold">{data.user_recommendations.livestock_water.cattle_calf_liters_per_day} L/day</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">Poultry</span>
                          <span className="text-blue-700 font-bold">{data.user_recommendations.livestock_water.poultry_liters_per_day} L/day</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Household Conservation */}
                  {data.user_recommendations.household_conservation && (
                    <div className="bg-cyan-50 rounded-xl p-6 lg:col-span-2">
                      <div className="flex items-center gap-2 mb-4">
                        <Home className="w-6 h-6 text-cyan-700" />
                        <h3 className="text-xl font-semibold text-cyan-900">Household Conservation Tips</h3>
                      </div>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {data.user_recommendations.household_conservation.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Water Quality Notes */}
                  {data.user_recommendations.water_quality_notes && (
                    <div className="bg-amber-50 rounded-xl p-6 lg:col-span-2 border-l-4 border-amber-500">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-amber-700 flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="text-xl font-semibold text-amber-900 mb-2">Water Quality Notes</h3>
                          <p className="text-gray-700">{data.user_recommendations.water_quality_notes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Town Planner Recommendations */}
            {data.town_planner_recommendations && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Building2 className="w-8 h-8 text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-800">Town Planner Recommendations</h2>
                </div>

                <div className="space-y-6">
                  {/* Industrial Limits */}
                  {data.town_planner_recommendations.industrial_limits && (
                    <div className="bg-purple-50 rounded-xl p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Factory className="w-6 h-6 text-purple-700" />
                        <h3 className="text-xl font-semibold text-purple-900">Industrial Extraction Limits</h3>
                      </div>
                      <p className="text-gray-700">{data.town_planner_recommendations.industrial_limits}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recharge Interventions */}
                    {data.town_planner_recommendations.recharge_interventions && (
                      <div className="bg-blue-50 rounded-xl p-6">
                        <h3 className="text-xl font-semibold text-blue-900 mb-4">Groundwater Recharge</h3>
                        <ul className="space-y-2">
                          {data.town_planner_recommendations.recharge_interventions.map((intervention, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-700">{intervention}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Irrigation Improvements */}
                    {data.town_planner_recommendations.irrigation_improvements && (
                      <div className="bg-green-50 rounded-xl p-6">
                        <h3 className="text-xl font-semibold text-green-900 mb-4">Irrigation Efficiency</h3>
                        <ul className="space-y-2">
                          {data.town_planner_recommendations.irrigation_improvements.map((improvement, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-700">{improvement}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Infrastructure Projects */}
                    {data.town_planner_recommendations.infrastructure_projects && (
                      <div className="bg-cyan-50 rounded-xl p-6">
                        <h3 className="text-xl font-semibold text-cyan-900 mb-4">Infrastructure Projects</h3>
                        <ul className="space-y-2">
                          {data.town_planner_recommendations.infrastructure_projects.map((project, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-700">{project}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Future Planning */}
                    {data.town_planner_recommendations.future_planning && (
                      <div className="bg-indigo-50 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-6 h-6 text-indigo-700" />
                          <h3 className="text-xl font-semibold text-indigo-900">Future Planning</h3>
                        </div>
                        <p className="text-gray-700">{data.town_planner_recommendations.future_planning}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Water Usage Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="text-gray-600">Household Water</span>
                    <span className="font-bold text-gray-800">{data.household_water_liters} L/day</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="text-gray-600">Agriculture (Annual)</span>
                    <span className="font-bold text-gray-800">{data.agriculture_water_m3_year.toLocaleString()} m³</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Industrial Limit (Annual)</span>
                    <span className="font-bold text-gray-800">{data.industrial_extraction_limit_m3_year.toLocaleString()} m³</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg px-4 py-3 text-left transition-colors">
                    Download Report (PDF)
                  </button>
                  <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg px-4 py-3 text-left transition-colors">
                    Share with Team
                  </button>
                  <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg px-4 py-3 text-left transition-colors">
                    Schedule Follow-up
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!data && !loading && !error && (
          <div className="text-center py-16">
            <Droplets className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-600 mb-2">
              Enter a Station ID to Get Started
            </h3>
            <p className="text-gray-500">
              AI-powered insights and recommendations will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}