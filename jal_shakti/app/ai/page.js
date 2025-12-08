"use client";
import React, { useState } from "react";
import { Search, Globe, Droplets, AlertCircle, CheckCircle, XCircle, Loader2, Copy, Download } from "lucide-react";

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "hi", name: "हिंदी", flag: "🇮🇳" },
  { code: "ta", name: "தமிழ்", flag: "🇮🇳" },
  { code: "te", name: "తెలుగు", flag: "🇮🇳" },
  { code: "bn", name: "বাংলা", flag: "🇮🇳" },
  { code: "mr", name: "मराठी", flag: "🇮🇳" },
  { code: "gu", name: "ગુજરાતી", flag: "🇮🇳" },
  { code: "kn", name: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "ml", name: "മലയാളം", flag: "🇮🇳" },
  { code: "pa", name: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { code: "or", name: "ଓଡ଼ିଆ", flag: "🇮🇳" },
  { code: "as", name: "অসমীয়া", flag: "🇮🇳" },
];

export default function AIWaterDashboard() {
  const [stationId, setStationId] = useState("");
  const [selectedLang, setSelectedLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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
      const url = `/api/ai/${stationId}?language_id=${selectedLang}`;
      
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });

      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || "Failed to fetch recommendations");
      }
      
      setData(result);
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `water-recommendations-${stationId}-${selectedLang}.json`;
    a.click();
  };

  const getStatusColor = (status) => {
    if (!status) return "bg-gray-500";
    const s = status.toLowerCase();
    if (s.includes("safe") || s.includes("सुरक्षित") || s.includes("பாதுகாப்பான")) return "bg-green-500";
    if (s.includes("moderate") || s.includes("मध्यम") || s.includes("மிதமான")) return "bg-yellow-500";
    return "bg-red-500";
  };

  const renderSection = (title, icon, content, bgColor= "bg-white") => {
    if (!content) return null;
    
    return (
      <div className={`${bgColor} rounded-xl shadow-lg p-6 border border-gray-200`}>
        <div className="flex items-center gap-3 mb-4">
          {icon}
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        </div>
        <div className="text-gray-700 space-y-3">
          {typeof content === "string" ? (
            <p className="leading-relaxed">{content}</p>
          ) : Array.isArray(content) ? (
            <ul className="space-y-2">
              {content.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-3">
              {Object.entries(content).map(([key, value]) => (
                <div key={key} className="bg-gray-50 p-3 rounded-lg">
                  <strong className="text-gray-900 capitalize">{key.replace(/_/g, " ")}:</strong>{" "}
                  <span className="text-gray-700">
                    {Array.isArray(value) ? (
                      <ul className="mt-2 space-y-1">
                        {value.map((v, i) => (
                          <li key={i} className="ml-4">• {v}</li>
                        ))}
                      </ul>
                    ) : typeof value === "object" ? (
                      JSON.stringify(value, null, 2)
                    ) : (
                      String(value)
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&family=Noto+Sans+Tamil:wght@400;700&family=Noto+Sans+Telugu:wght@400;700&family=Noto+Sans+Malayalam:wght@400;700&family=Noto+Sans+Kannada:wght@400;700&family=Noto+Sans+Gujarati:wght@400;700&family=Noto+Sans+Gurmukhi:wght@400;700&family=Noto+Sans+Bengali:wght@400;700&family=Noto+Sans+Oriya:wght@400;700&display=swap" rel="stylesheet" />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Droplets className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">AI Water Advisor</h1>
                <p className="text-blue-100 mt-1">Intelligent recommendations for groundwater management</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Input Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-200">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Search className="w-4 h-4 inline mr-2" />
                  Station ID
                </label>
                <input
                  type="text"
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchRecommendations()}
                  placeholder="e.g. RJ_JAIPUR_CHOMU_001"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Globe className="w-4 h-4 inline mr-2" />
                  Language
                </label>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition text-lg cursor-pointer"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={fetchRecommendations}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold rounded-xl transition shadow-lg hover:shadow-xl flex items-center justify-center gap-3 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Generating Recommendations...
                </>
              ) : (
                <>
                  <Search className="w-6 h-6" />
                  Get AI Recommendations
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-800">Error</p>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {data && (
            <div className="space-y-6">
              {/* Action Buttons */}
              <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-md border border-gray-200">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-700">
                    Response Language: <span className="text-blue-600">{data.metadata?.language_name || selectedLang}</span>
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy JSON"}
                  </button>
                  <button
                    onClick={downloadJSON}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>

              {/* Overall Summary */}
              {data.overall_summary && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-lg p-6 border-2 border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-800">Water Quality</h3>
                      <div className={`${getStatusColor(data.water_quality?.status)} text-white px-4 py-1 rounded-full text-sm font-bold`}>
                        {data.water_quality?.status || "N/A"}
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{data.overall_summary.water_quality_status}</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg p-6 border-2 border-green-200">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Water Availability</h3>
                    <p className="text-gray-700 leading-relaxed">{data.overall_summary.water_availability_status}</p>
                  </div>
                </div>
              )}

              {/* Urgent Actions */}
              {data.overall_summary?.urgent_actions && (
                <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl shadow-lg p-6 border-2 border-red-300">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="w-7 h-7 text-red-600" />
                    <h3 className="text-2xl font-bold text-red-800">Urgent Actions Required</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {data.overall_summary.urgent_actions.map((action, i) => (
                      <div key={i} className="bg-white rounded-lg p-4 flex items-start gap-3 shadow-md">
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
              {data.key_metrics && (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6">Key Metrics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(data.key_metrics).map(([key, value]) => (
                      <div key={key} className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
                        <p className="text-sm text-gray-600 mb-1 capitalize">{key.replace(/_/g, " ")}</p>
                        <p className="text-2xl font-bold text-blue-900">{typeof value === "number" ? value.toLocaleString() : value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Water Quality Details */}
              {data.water_quality && (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6">Water Quality Analysis</h3>
                  
                  {data.water_quality.parameters_analysis && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-700 mb-3">Parameters</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {Object.entries(data.water_quality.parameters_analysis).map(([key, value]) => (
                          <div key={key} className="bg-indigo-50 rounded-lg p-4 text-center border border-indigo-200">
                            <p className="text-xs text-indigo-600 uppercase font-semibold mb-1">{key}</p>
                            <p className="text-2xl font-bold text-indigo-900">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.water_quality.treatment_needed && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-700 mb-3">Treatment Needed</h4>
                      <div className="grid md:grid-cols-2 gap-3">
                        {data.water_quality.treatment_needed.map((treatment, i) => (
                          <div key={i} className="bg-yellow-50 rounded-lg p-3 flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <p className="text-gray-700 text-sm">{treatment}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.water_quality.safe_for && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Safety Assessment</h4>
                      <div className="grid grid-cols-3 gap-4">
                        {Object.entries(data.water_quality.safe_for).map(([use, safe]) => (
                          <div key={use} className={`rounded-lg p-4 text-center ${safe ? "bg-green-100 border-2 border-green-400" : "bg-red-100 border-2 border-red-400"}`}>
                            {safe ? (
                              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                            ) : (
                              <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                            )}
                            <p className="font-bold capitalize">{use}</p>
                            <p className={`text-sm ${safe ? "text-green-700" : "text-red-700"}`}>
                              {safe ? "Safe" : "Not Safe"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Household Usage */}
              {data.household_water_usage && renderSection(
                "Household Water Usage",
                <Droplets className="w-6 h-6 text-blue-600" />,
                data.household_water_usage
              )}

              {/* Farmer Recommendations */}
              {data.farmer_recommendations && renderSection(
                "Farmer Recommendations",
                <Globe className="w-6 h-6 text-green-600" />,
                data.farmer_recommendations,
                "bg-gradient-to-br from-green-50 to-emerald-50"
              )}

              {/* Policy Recommendations */}
              {data.policy_recommendations && renderSection(
                "Policy & Planning",
                <AlertCircle className="w-6 h-6 text-orange-600" />,
                data.policy_recommendations,
                "bg-gradient-to-br from-orange-50 to-amber-50"
              )}

              {/* General Recommendations */}
              {data.general_recommendations && renderSection(
                "General Recommendations",
                <CheckCircle className="w-6 h-6 text-purple-600" />,
                data.general_recommendations
              )}

              {/* Seasonal Advice */}
              {data.seasonal_advice && renderSection(
                "Seasonal Water Management",
                <Globe className="w-6 h-6 text-teal-600" />,
                data.seasonal_advice,
                "bg-gradient-to-br from-teal-50 to-cyan-50"
              )}

              {/* Metadata */}
              {data.metadata && (
                <div className="bg-gray-100 rounded-xl p-6 text-center text-sm text-gray-600 border border-gray-300">
                  <p>Generated: {new Date(data.metadata.generated_at).toLocaleString()}</p>
                  <p className="mt-1">Station: {data.metadata.station_id} • Role: {data.metadata.user_role} • Language: {data.metadata.language_name}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}