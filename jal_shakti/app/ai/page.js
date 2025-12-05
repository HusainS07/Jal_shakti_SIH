"use client";

import React, { useState } from 'react';
import { Droplets, AlertCircle, TrendingUp, Beaker, Sprout, Users, Building2, Calendar, CheckCircle, XCircle, AlertTriangle, Loader2, Search, Shield, Zap, Home, Factory, Leaf } from 'lucide-react';

export default function WaterQualityDashboard() {
  const [stationId, setStationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const fetchRecommendations = async () => {
    if (!stationId.trim()) {
      setError('Please enter a Station ID');
      return;
    }

    setLoading(true);
    setError('');
    setData(null);

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/ai/${stationId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch recommendations');
      }

      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'safe') return 'bg-green-500';
    if (status === 'moderate') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusIcon = (status) => {
    if (status === 'safe') return <CheckCircle className="w-6 h-6" />;
    if (status === 'moderate') return <AlertTriangle className="w-6 h-6" />;
    return <XCircle className="w-6 h-6" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Droplets className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Water Quality Advisor</h1>
              <p className="text-gray-600">Comprehensive water analysis & recommendations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Enter Station ID (e.g., RJ_JAIPUR_CHOMU_001)"
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchRecommendations()}
                className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition text-gray-900 placeholder-gray-400"
              />
            </div>
            <button
              onClick={fetchRecommendations}
              disabled={loading}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-xl flex items-center justify-center gap-3 transition shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Analyze Water Quality
                  <Zap className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Results */}
        {data && (
          <div className="space-y-6">
            {/* Overall Summary Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Water Quality Status */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-blue-600" />
                    Water Quality Status
                  </h3>
                  <div className={`${getStatusColor(data.water_quality?.status)} text-white px-4 py-2 rounded-full font-semibold flex items-center gap-2 text-sm`}>
                    {getStatusIcon(data.water_quality?.status)}
                    {data.water_quality?.status?.toUpperCase()}
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {data.overall_summary?.water_quality_status || data.water_quality?.summary}
                </p>
              </div>

              {/* Water Availability */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-cyan-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-cyan-600" />
                  Water Availability
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {data.overall_summary?.water_availability_status}
                </p>
              </div>
            </div>

            {/* Urgent Actions */}
            {data.overall_summary?.urgent_actions && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl shadow-lg p-6 border-2 border-red-200">
                <h3 className="text-2xl font-bold text-red-800 mb-6 flex items-center gap-3">
                  <AlertCircle className="w-7 h-7" />
                  Urgent Actions Required
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {data.overall_summary.urgent_actions.map((action, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 shadow-md flex items-start gap-3">
                      <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-gray-800">{action}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                <p className="text-blue-100 text-sm mb-2">Daily Limit</p>
                <p className="text-3xl font-bold">{Number(data.key_metrics?.daily_extraction_limit_liters || 0).toLocaleString()}</p>
                <p className="text-blue-100 text-sm mt-1">Liters</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-6 text-white shadow-lg">
                <p className="text-cyan-100 text-sm mb-2">Water Level</p>
                <p className="text-3xl font-bold">{data.key_metrics?.average_water_level_m || 0}</p>
                <p className="text-cyan-100 text-sm mt-1">Meters ({data.key_metrics?.water_level_status})</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                <p className="text-green-100 text-sm mb-2">Buckets/Borewell</p>
                <p className="text-3xl font-bold">{data.key_metrics?.buckets_per_borewell || 0}</p>
                <p className="text-green-100 text-sm mt-1">Per day (20L)</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <p className="text-purple-100 text-sm mb-2">Household Need</p>
                <p className="text-3xl font-bold">{data.key_metrics?.household_daily_requirement_liters || 150}</p>
                <p className="text-purple-100 text-sm mt-1">Liters/day</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
                <p className="text-emerald-100 text-sm mb-2">Agriculture</p>
                <p className="text-3xl font-bold">{Number(data.key_metrics?.agriculture_yearly_m3 || 0).toLocaleString()}</p>
                <p className="text-emerald-100 text-sm mt-1">m³/year</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                <p className="text-orange-100 text-sm mb-2">Industrial</p>
                <p className="text-3xl font-bold">{Number(data.key_metrics?.industrial_yearly_m3 || 0).toLocaleString()}</p>
                <p className="text-orange-100 text-sm mt-1">m³/year</p>
              </div>
            </div>

            {/* Water Quality Parameters */}
            {data.water_quality?.parameters_analysis && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <Beaker className="w-7 h-7 text-indigo-600" />
                  Water Quality Parameters
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(data.water_quality.parameters_analysis).map(([key, value]) => (
                    <div key={key} className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 text-center border border-indigo-200">
                      <p className="text-indigo-600 font-semibold text-sm uppercase mb-2">{key}</p>
                      <p className="text-3xl font-bold text-indigo-900">{value}</p>
                      <p className="text-indigo-600 text-xs mt-1">
                        {key === 'ph' ? 'pH' : key === 'tds' ? 'mg/L' : key === 'fluoride' ? 'mg/L' : key === 'nitrate' ? 'mg/L' : 'mg/L'}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Treatment Needed */}
                {data.water_quality?.treatment_needed && (
                  <div className="mt-6">
                    <h4 className="text-lg font-bold text-gray-800 mb-3">Treatment Recommendations</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      {data.water_quality.treatment_needed.map((treatment, i) => (
                        <div key={i} className="flex items-start gap-3 bg-indigo-50 rounded-lg p-3">
                          <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                          <p className="text-gray-700 text-sm">{treatment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Safe For */}
                {data.water_quality?.safe_for && (
                  <div className="mt-6">
                    <h4 className="text-lg font-bold text-gray-800 mb-4 text-center">Water Safety Assessment</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className={`rounded-xl p-6 text-center shadow-lg transition-all ${data.water_quality.safe_for.drinking ? 'bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-400' : 'bg-gradient-to-br from-red-100 to-red-200 border-2 border-red-400'}`}>
                        <div className="flex justify-center mb-3">
                          {data.water_quality.safe_for.drinking ? (
                            <div className="bg-green-500 rounded-full p-3">
                              <CheckCircle className="w-8 h-8 text-white" strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="bg-red-500 rounded-full p-3">
                              <XCircle className="w-8 h-8 text-white" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <p className="font-bold text-lg text-gray-800">Drinking</p>
                        <p className={`text-sm mt-1 font-semibold ${data.water_quality.safe_for.drinking ? 'text-green-700' : 'text-red-700'}`}>
                          {data.water_quality.safe_for.drinking ? 'Safe' : 'Not Safe'}
                        </p>
                      </div>
                      <div className={`rounded-xl p-6 text-center shadow-lg transition-all ${data.water_quality.safe_for.irrigation ? 'bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-400' : 'bg-gradient-to-br from-red-100 to-red-200 border-2 border-red-400'}`}>
                        <div className="flex justify-center mb-3">
                          {data.water_quality.safe_for.irrigation ? (
                            <div className="bg-green-500 rounded-full p-3">
                              <CheckCircle className="w-8 h-8 text-white" strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="bg-red-500 rounded-full p-3">
                              <XCircle className="w-8 h-8 text-white" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <p className="font-bold text-lg text-gray-800">Irrigation</p>
                        <p className={`text-sm mt-1 font-semibold ${data.water_quality.safe_for.irrigation ? 'text-green-700' : 'text-red-700'}`}>
                          {data.water_quality.safe_for.irrigation ? 'Safe' : 'Not Safe'}
                        </p>
                      </div>
                      <div className={`rounded-xl p-6 text-center shadow-lg transition-all ${data.water_quality.safe_for.industrial ? 'bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-400' : 'bg-gradient-to-br from-red-100 to-red-200 border-2 border-red-400'}`}>
                        <div className="flex justify-center mb-3">
                          {data.water_quality.safe_for.industrial ? (
                            <div className="bg-green-500 rounded-full p-3">
                              <CheckCircle className="w-8 h-8 text-white" strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="bg-red-500 rounded-full p-3">
                              <XCircle className="w-8 h-8 text-white" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <p className="font-bold text-lg text-gray-800">Industrial</p>
                        <p className={`text-sm mt-1 font-semibold ${data.water_quality.safe_for.industrial ? 'text-green-700' : 'text-red-700'}`}>
                          {data.water_quality.safe_for.industrial ? 'Safe' : 'Not Safe'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Household Water Usage */}
            {data.household_water_usage?.daily_breakdown && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <Home className="w-7 h-7 text-blue-600" />
                  Household Water Usage Breakdown
                </h3>
                <div className="grid md:grid-cols-5 gap-4 mb-6">
                  {Object.entries(data.household_water_usage.daily_breakdown).map(([category, info]) => (
                    <div key={category} className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
                      <p className="text-blue-700 font-semibold capitalize mb-2">{category}</p>
                      <p className="text-2xl font-bold text-blue-900">{info.liters}L</p>
                      <p className="text-blue-600 text-sm">{info.percentage}%</p>
                    </div>
                  ))}
                </div>

                {/* General Conservation Tips */}
                {data.household_water_usage?.conservation_tips && Array.isArray(data.household_water_usage.conservation_tips) && (
                  <div className="bg-green-50 rounded-xl p-5">
                    <h4 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                      <Leaf className="w-5 h-5" />
                      Water Conservation Tips
                    </h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      {data.household_water_usage.conservation_tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <p className="text-gray-700">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Legacy support for object-based conservation tips */}
                {data.household_water_usage?.conservation_tips && !Array.isArray(data.household_water_usage.conservation_tips) && (
                  <div className="space-y-4">
                    {Object.entries(data.household_water_usage.conservation_tips).map(([category, tips]) => (
                      <div key={category} className="bg-green-50 rounded-xl p-4">
                        <h4 className="font-bold text-green-800 capitalize mb-3 flex items-center gap-2">
                          <Leaf className="w-5 h-5" />
                          {category} Conservation Tips
                        </h4>
                        <div className="grid md:grid-cols-2 gap-2">
                          {tips.map((tip, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-green-600">•</span>
                              <p className="text-gray-700">{tip}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Farmer Recommendations */}
            {data.farmer_recommendations && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border-2 border-green-200">
                <h3 className="text-2xl font-bold text-green-800 mb-6 flex items-center gap-3">
                  <Sprout className="w-7 h-7" />
                  Farmer Recommendations
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Crop Suggestions */}
                  <div className="bg-white rounded-xl p-5 shadow-md">
                    <h4 className="font-bold text-green-700 mb-4">Recommended Crops</h4>
                    <div className="space-y-2">
                      {data.farmer_recommendations.crop_suggestions?.map((crop, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <p>{crop}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Government Schemes */}
                  <div className="bg-white rounded-xl p-5 shadow-md">
                    <h4 className="font-bold text-green-700 mb-4">Government Schemes</h4>
                    <div className="space-y-2">
                      {data.farmer_recommendations.government_schemes?.map((scheme, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <p>{scheme}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Irrigation Tips */}
                {data.farmer_recommendations.irrigation_tips && (
                  <div className="mt-6 bg-white rounded-xl p-5 shadow-md">
                    <h4 className="font-bold text-green-700 mb-4">Irrigation Optimization</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      {data.farmer_recommendations.irrigation_tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-green-600">•</span>
                          <p>{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Policy Recommendations */}
            {data.policy_recommendations && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg p-6 border-2 border-amber-200">
                <h3 className="text-2xl font-bold text-amber-800 mb-6 flex items-center gap-3">
                  <Building2 className="w-7 h-7" />
                  Policy & Planning Recommendations
                </h3>
                <div className="bg-white rounded-xl p-5 mb-6 shadow-md">
                  <p className="text-gray-700 italic">{data.policy_recommendations.executive_summary}</p>
                </div>
                <div className="space-y-4">
                  {data.policy_recommendations.immediate_actions?.map((action, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 shadow-md flex items-start gap-4">
                      <div className="bg-amber-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-gray-800">{action}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General Recommendations */}
            {data.general_recommendations && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <Users className="w-7 h-7 text-purple-600" />
                  General Recommendations
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {Object.entries(data.general_recommendations).map(([category, items]) => (
                    <div key={category} className="bg-purple-50 rounded-xl p-5">
                      <h4 className="font-bold text-purple-700 capitalize mb-3">
                        {category.replace(/_/g, ' ')}
                      </h4>
                      <div className="space-y-2">
                        {items.map((item, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-purple-600">•</span>
                            <p>{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seasonal Advice */}
            {data.seasonal_advice && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <Calendar className="w-7 h-7 text-teal-600" />
                  Seasonal Water Management
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {Object.entries(data.seasonal_advice).map(([season, tips]) => (
                    <div key={season} className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-5 border border-teal-200">
                      <h4 className="font-bold text-teal-700 capitalize mb-3">{season}</h4>
                      <div className="space-y-2">
                        {tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-teal-600">•</span>
                            <p>{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata Footer */}
            {data.metadata && (
              <div className="bg-gray-100 rounded-xl p-4 text-center text-sm text-gray-600">
                <p>Generated: {new Date(data.metadata.generated_at).toLocaleString('en-IN')}</p>
                <p className="mt-1">Station: {data.metadata.station_id} • Role: {data.metadata.user_role}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}