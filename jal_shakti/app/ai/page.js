"use client";

import { useState, useEffect } from "react";
import {
  Search, Droplets, Users, Building2, TrendingUp,
  AlertCircle, CheckCircle, Loader2, Sprout, Home, CloudRain, Wrench,
  LogIn, LogOut, User, Calendar, Target, DollarSign, BarChart
} from "lucide-react";

export default function AIRecommendationsPage() {
  const [stationId, setStationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchUserData(token);
    }
  }, []);

  const fetchUserData = async (token) => {
    try {
      const res = await fetch("/api/user", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setUser(result.user);
      } else {
        localStorage.removeItem("token");
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to fetch user data:", err);
    }
  };

  const handleLogin = () => {
    window.location.href = "/login";
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setData(null);
    setError("Logged out successfully");
    setTimeout(() => setError(null), 3000);
  };

  const fetchRecommendations = async () => {
    if (!stationId.trim()) {
      setError("Please enter a Station ID");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        throw new Error("Please log in to access AI recommendations");
      }

      const res = await fetch(`/api/ai/${stationId.trim()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("token");
          setUser(null);
          throw new Error("Session expired. Please log in again.");
        }
        throw new Error(result.message || "Failed to fetch recommendations");
      }

      console.log("API Response:", result); // For debugging
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const f = (n) => (n != null ? Number(n).toLocaleString() : "—");

  // Helper function to safely render array data
  const renderArrayData = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') return [data];
    return [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header with Auth Status */}
        <div className="flex justify-between items-center mb-12">
          <div className="text-center flex-1">
            <h1 className="text-5xl font-bold text-gray-800 flex items-center justify-center gap-4">
              <Droplets className="w-14 h-14 text-blue-600" />
              Water AI Assistant
            </h1>
            <p className="text-xl text-gray-600 mt-3">Groundwater Management • INDIA</p>
          </div>
          
          {/* Auth Status */}
          <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center gap-4">
            {user ? (
              <>
                <div className="text-right">
                  <p className="font-bold text-gray-800">{user.email}</p>
                  <p className="text-sm text-gray-600 capitalize">{user.role}</p>
                  {user.farmingProfile && (
                    <p className="text-xs text-green-600">✓ Farming Profile</p>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <div className="text-right">
                  <p className="text-gray-600">Not logged in</p>
                  <p className="text-sm text-gray-500">Login for personalized recommendations</p>
                </div>
                <button
                  onClick={handleLogin}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-10 max-w-3xl mx-auto">
          <div className="flex gap-4">
            <input
              type="text"
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchRecommendations()}
              placeholder="e.g. KA_BENGALURU_YELAHANKA_001"
              className="flex-1 px-8 py-5 text-lg border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={fetchRecommendations}
              disabled={loading}
              className="px-10 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-2xl hover:shadow-xl transform hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
          {!user && (
            <div className="mt-4 text-center">
              <p className="text-amber-600 flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Login required for AI recommendations
              </p>
            </div>
          )}
        </div>

        {/* Error Messages */}
        {error && (
          <div className="max-w-3xl mx-auto mb-8">
            {error.includes("log in") || error.includes("Login") ? (
              <div className="bg-amber-50 border-2 border-amber-300 text-amber-800 p-6 rounded-2xl flex items-center gap-4">
                <AlertCircle className="w-10 h-10" />
                <div className="flex-1">
                  <h3 className="font-bold text-xl">Authentication Required</h3>
                  <p>{error}</p>
                </div>
                <button
                  onClick={handleLogin}
                  className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  Login Now
                </button>
              </div>
            ) : (
              <div className="bg-red-50 border-2 border-red-300 text-red-700 p-6 rounded-2xl flex items-center gap-4">
                <AlertCircle className="w-10 h-10" />
                <div>
                  <h3 className="font-bold text-xl">Error</h3>
                  <p>{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {data && (
          <div className="space-y-10">
            {/* User Info Banner */}
            {data.user_info && (
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-3xl shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <User className="w-12 h-12" />
                    <div>
                      <h2 className="text-2xl font-bold">{data.user_info.greeting || `Welcome, ${data.user_info.email}`}</h2>
                      <p className="opacity-90 capitalize">Role: {data.user_info.role}</p>
                      {data.user_info.has_farming_profile && (
                        <p className="text-sm opacity-80 mt-1">✓ Personalized farming profile detected</p>
                      )}
                    </div>
                  </div>
                  {!data.user_info.has_farming_profile && user?.role === "farmer" && (
                    <button
                      onClick={() => window.location.href = "/profile/edit"}
                      className="px-4 py-2 bg-white text-green-700 rounded-lg hover:bg-green-50 transition"
                    >
                      Complete Farming Profile
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Summary */}
            {data.summary && (
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-10 rounded-3xl shadow-xl">
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
                  {data.station_info?.water_status || data.key_metrics?.water_level_status || "—"}
                </p>
                {data.station_info?.water_level && (
                  <p className="text-sm text-gray-500 mt-2">
                    Level: {data.station_info.water_level}m
                  </p>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-8 text-center transform hover:scale-105 transition">
                <TrendingUp className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Daily Extraction Limit</p>
                <p className="text-4xl font-bold text-green-700 mt-2">
                  {f(data.station_info?.daily_limit_liters || data.key_metrics?.daily_extraction_limit_liters)} L
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-8 text-center transform hover:scale-105 transition">
                <Users className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Buckets per Borewell</p>
                <p className="text-4xl font-bold text-purple-700 mt-2">
                  {data.key_metrics?.buckets_per_borewell || data.station_info?.buckets_per_borewell || "—"}
                </p>
              </div>
            </div>

            {/* Station Info */}
            {data.station_info && (
              <div className="bg-white rounded-3xl shadow-xl p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Station Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <p className="text-gray-600 font-medium">Station ID</p>
                    <p className="text-xl font-bold text-gray-800">{data.station_info.station_id}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6">
                    <p className="text-gray-600 font-medium">Location</p>
                    <p className="text-xl font-bold text-gray-800">{data.station_info.location}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6">
                    <p className="text-gray-600 font-medium">Historical Data</p>
                    <p className="text-xl font-bold text-gray-800">{data.station_info.historical_years || 0} years</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6">
                    <p className="text-gray-600 font-medium">Water Level</p>
                    <p className="text-xl font-bold text-gray-800">{data.station_info.water_level}m ({data.station_info.water_status})</p>
                  </div>
                </div>
              </div>
            )}

            {/* Personalized Recommendations for Farmers/Citizens */}
            {data.personalized_recommendations && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-10 shadow-xl">
                <h2 className="text-3xl font-bold text-green-800 flex items-center gap-4 mb-8">
                  <Sprout className="w-10 h-10" /> Personalized Recommendations
                </h2>

                {/* Greeting */}
                {data.personalized_recommendations.greeting && (
                  <div className="bg-white rounded-2xl p-6 mb-8 border-l-4 border-green-600 shadow">
                    <p className="text-lg text-gray-800 italic">{data.personalized_recommendations.greeting}</p>
                  </div>
                )}

                {/* Summary */}
                {data.personalized_recommendations.summary && (
                  <div className="bg-blue-50 rounded-2xl p-6 mb-8">
                    <h3 className="text-xl font-bold text-blue-800 mb-3">Situation Summary</h3>
                    <p className="text-gray-800">{data.personalized_recommendations.summary}</p>
                  </div>
                )}

                {/* Immediate Actions */}
                {data.personalized_recommendations.immediate_actions && (
                  <div className="bg-white rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold text-amber-700 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-6 h-6" /> Immediate Actions
                    </h3>
                    <ol className="space-y-3">
                      {renderArrayData(data.personalized_recommendations.immediate_actions).map((action, i) => (
                        <li key={i} className="flex gap-4">
                          <span className="shrink-0 w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold">{i + 1}</span>
                          <span className="text-gray-800 pt-1">{action}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Water Conservation */}
                {data.personalized_recommendations.water_conservation && (
                  <div className="bg-white rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold text-teal-700 mb-4">Water Conservation Tips</h3>
                    <div className="grid md:grid-cols-3 gap-6">
                      {data.personalized_recommendations.water_conservation.household_tips && (
                        <div className="bg-cyan-50 rounded-lg p-4 border-l-4 border-cyan-600">
                          <h4 className="font-bold text-cyan-900 mb-3 flex items-center gap-2">
                            <Home className="w-5 h-5" /> Household
                          </h4>
                          <ul className="space-y-2">
                            {renderArrayData(data.personalized_recommendations.water_conservation.household_tips).map((tip, i) => (
                              <li key={i} className="flex gap-2 text-sm text-gray-800">
                                <span className="shrink-0 text-cyan-600 mt-1">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {data.personalized_recommendations.water_conservation.farm_tips && (
                        <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-600">
                          <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                            <Sprout className="w-5 h-5" /> Farm
                          </h4>
                          <ul className="space-y-2">
                            {renderArrayData(data.personalized_recommendations.water_conservation.farm_tips).map((tip, i) => (
                              <li key={i} className="flex gap-2 text-sm text-gray-800">
                                <span className="shrink-0 text-green-600 mt-1">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {data.personalized_recommendations.water_conservation.livestock_tips && (
                        <div className="bg-amber-50 rounded-lg p-4 border-l-4 border-amber-600">
                          <h4 className="font-bold text-amber-900 mb-3">Livestock</h4>
                          <ul className="space-y-2">
                            {renderArrayData(data.personalized_recommendations.water_conservation.livestock_tips).map((tip, i) => (
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

                {/* Government Schemes */}
                {data.personalized_recommendations.government_schemes && (
                  <div className="bg-purple-50 rounded-2xl p-6 mb-8 shadow border-l-4 border-purple-600">
                    <h3 className="text-xl font-bold text-purple-800 mb-4">Government Schemes</h3>
                    <ul className="space-y-2">
                      {renderArrayData(data.personalized_recommendations.government_schemes).map((scheme, i) => (
                        <li key={i} className="flex gap-2 text-gray-800">
                          <span className="shrink-0 text-purple-600 mt-1">•</span>
                          <span>{scheme}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Critical Warning */}
                {data.personalized_recommendations.critical_warning && (
                  <div className="bg-red-100 border-2 border-red-500 rounded-2xl p-6 mb-8 shadow">
                    <div className="flex items-start gap-4">
                      <AlertCircle className="w-8 h-8 text-red-700 shrink-0 mt-1" />
                      <div>
                        <h3 className="text-xl font-bold text-red-900">Critical Water Alert</h3>
                        <p className="mt-2 text-red-800">{data.personalized_recommendations.critical_warning}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Planner Recommendations */}
            {data.planner_recommendations && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-3xl p-10 shadow-xl">
                <h2 className="text-3xl font-bold text-purple-800 flex items-center gap-4 mb-10">
                  <Building2 className="w-12 h-12" /> Planner Recommendations
                </h2>

                {/* Executive Summary */}
                {data.planner_recommendations.executive_summary && (
                  <div className="bg-white rounded-2xl p-6 mb-8 shadow border-l-4 border-purple-600">
                    <h3 className="text-xl font-bold text-purple-800 mb-4">Executive Summary</h3>
                    <p className="text-gray-800">{data.planner_recommendations.executive_summary}</p>
                  </div>
                )}

                {/* Urgency Level */}
                {data.planner_recommendations.urgency_level && (
                  <div className={`rounded-2xl p-6 mb-8 ${
                    data.planner_recommendations.urgency_level.includes('HIGH') 
                      ? 'bg-red-100 border-2 border-red-500' 
                      : data.planner_recommendations.urgency_level.includes('MEDIUM')
                      ? 'bg-amber-100 border-2 border-amber-500'
                      : 'bg-blue-100 border-2 border-blue-500'
                  }`}>
                    <div className="flex items-center gap-4">
                      <AlertCircle className="w-8 h-8" />
                      <div>
                        <h3 className="text-xl font-bold">Urgency Level</h3>
                        <p className="text-lg font-bold mt-1">{data.planner_recommendations.urgency_level}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Immediate Actions */}
                {data.planner_recommendations.immediate_actions && (
                  <div className="bg-white rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-6 h-6" /> Immediate Actions (0-30 days)
                    </h3>
                    <ol className="space-y-3">
                      {renderArrayData(data.planner_recommendations.immediate_actions).map((action, i) => (
                        <li key={i} className="flex gap-4">
                          <span className="shrink-0 w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold">{i + 1}</span>
                          <span className="text-gray-800 pt-1">{action}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Short Term Policies */}
                {data.planner_recommendations.short_term_policies && (
                  <div className="bg-white rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold text-blue-700 mb-4">Short Term Policies (1-6 months)</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {renderArrayData(data.planner_recommendations.short_term_policies).map((policy, i) => (
                        <div key={i} className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <span className="text-gray-800">{policy}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medium Term Projects */}
                {data.planner_recommendations.medium_term_projects && (
                  <div className="bg-white rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold text-green-700 mb-4">Medium Term Projects (6-24 months)</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {renderArrayData(data.planner_recommendations.medium_term_projects).map((project, i) => (
                        <div key={i} className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                          <div className="flex items-start gap-2">
                            <Wrench className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <span className="text-gray-800">{project}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Long Term Strategies */}
                {data.planner_recommendations.long_term_strategies && (
                  <div className="bg-white rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold text-indigo-700 mb-4">Long Term Strategies (2+ years)</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {renderArrayData(data.planner_recommendations.long_term_strategies).map((strategy, i) => (
                        <div key={i} className="bg-indigo-50 rounded-lg p-4 border-l-4 border-indigo-500">
                          <div className="flex items-start gap-2">
                            <Target className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                            <span className="text-gray-800">{strategy}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Budget Estimates */}
                {data.planner_recommendations.budget_estimates && (
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold mb-4">Budget Estimates</h3>
                    <div className="grid md:grid-cols-4 gap-4">
                      {Object.entries(data.planner_recommendations.budget_estimates).map(([period, amount], i) => (
                        <div key={i} className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                          <p className="text-sm opacity-90 capitalize">{period.replace(/_/g, " ")}</p>
                          <p className="text-xl font-bold mt-1">{amount}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Funding Sources */}
                {data.planner_recommendations.funding_sources && (
                  <div className="bg-white rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold text-green-800 mb-4">Funding Sources</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {renderArrayData(data.planner_recommendations.funding_sources).map((source, i) => (
                        <div key={i} className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                          <div className="flex items-start gap-2">
                            <DollarSign className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <span className="text-gray-800">{source}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance Indicators */}
                {data.planner_recommendations.performance_indicators && (
                  <div className="bg-white rounded-2xl p-6 mb-8 shadow">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Key Performance Indicators</h3>
                    <div className="space-y-3">
                      {renderArrayData(data.planner_recommendations.performance_indicators).map((kpi, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <BarChart className="w-5 h-5 text-green-600" />
                          <span className="text-gray-800">{kpi}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Assessment */}
                {data.planner_recommendations.risk_assessment && (
                  <div className="bg-white rounded-2xl p-6 shadow">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Risk Assessment</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      {Object.entries(data.planner_recommendations.risk_assessment).map(([key, value], i) => (
                        <div key={i} className={`rounded-lg p-4 ${
                          key === 'current_risk' && value?.toString().includes('HIGH')
                            ? 'bg-red-50 border-2 border-red-300'
                            : key === 'current_risk' && value?.toString().includes('MEDIUM')
                            ? 'bg-amber-50 border-2 border-amber-300'
                            : 'bg-gray-50 border-2 border-gray-300'
                        }`}>
                          <p className="font-bold text-gray-800 capitalize mb-1">{key.replace(/_/g, " ")}</p>
                          <p className="text-gray-700">
                            {Array.isArray(value) ? (
                              <ul className="space-y-1 mt-1">
                                {value.map((item, j) => (
                                  <li key={j} className="text-sm">• {item}</li>
                                ))}
                              </ul>
                            ) : (
                              value?.toString() || "—"
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* General Recommendations */}
            {data.general_recommendations && (
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-3xl p-10 shadow-xl">
                <h2 className="text-3xl font-bold text-cyan-800 flex items-center gap-4 mb-8">
                  <Users className="w-10 h-10" /> General Recommendations
                </h2>

                <div className="grid md:grid-cols-3 gap-8">
                  {/* Water Conservation */}
                  {data.general_recommendations.water_conservation && (
                    <div className="bg-white rounded-2xl p-6 shadow">
                      <h3 className="text-xl font-bold text-cyan-700 mb-4 flex items-center gap-2">
                        <Droplets className="w-6 h-6" /> Water Conservation
                      </h3>
                      <ul className="space-y-2">
                        {renderArrayData(data.general_recommendations.water_conservation).map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="shrink-0 text-cyan-600 mt-1">•</span>
                            <span className="text-gray-800">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Community Initiatives */}
                  {data.general_recommendations.community_initiatives && (
                    <div className="bg-white rounded-2xl p-6 shadow">
                      <h3 className="text-xl font-bold text-purple-700 mb-4 flex items-center gap-2">
                        <Users className="w-6 h-6" /> Community Initiatives
                      </h3>
                      <ul className="space-y-2">
                        {renderArrayData(data.general_recommendations.community_initiatives).map((initiative, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="shrink-0 text-purple-600 mt-1">•</span>
                            <span className="text-gray-800">{initiative}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Monitoring Suggestions */}
                  {data.general_recommendations.monitoring_suggestions && (
                    <div className="bg-white rounded-2xl p-6 shadow">
                      <h3 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6" /> Monitoring Suggestions
                      </h3>
                      <ul className="space-y-2">
                        {renderArrayData(data.general_recommendations.monitoring_suggestions).map((suggestion, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="shrink-0 text-blue-600 mt-1">•</span>
                            <span className="text-gray-800">{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Key Metrics Table */}
            {data.key_metrics && (
              <div className="bg-white rounded-3xl shadow-xl p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Key Water Metrics</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(data.key_metrics).map(([key, value]) => (
                        <tr key={key}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                            {key.replace(/_/g, " ")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {typeof value === 'number' ? f(value) : value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Metadata */}
            {data.metadata && (
              <div className="bg-gray-100 rounded-2xl p-6 text-center">
                <p className="text-sm text-gray-600">
                  Station: {data.metadata.station_id || stationId} • 
                  Generated: {new Date(data.metadata.timestamp).toLocaleString()} • 
                  Analysis Type: {data.metadata.analysis_type || "General"} • 
                  AI Model: {data.metadata.ai_model || "Unknown"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!data && !loading && !error && (
          <div className="text-center py-20">
            <Droplets className="w-32 h-32 text-gray-300 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-600">
              {user ? "Enter Station ID to Get AI Recommendations" : "Login to Access AI Recommendations"}
            </h2>
            <p className="text-gray-500 mt-3">
              {user ? "Enter a station ID above to get personalized water management advice" : "Personalized recommendations require authentication"}
            </p>
            {!user && (
              <button
                onClick={handleLogin}
                className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
              >
                <LogIn className="w-5 h-5" />
                Login to Continue
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}