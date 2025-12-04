// app/station_data/page.js
"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Droplets, AlertCircle, CheckCircle, Beaker, Send, Bot, User, Loader2, Search, MessageCircle, X, Sprout, TrendingUp } from "lucide-react";
import Link from "next/link";

// Crop recommendations based on water level and quality
function getCropRecommendations(waterLevel, waterQuality) {
  const level = parseFloat(waterLevel) || 0;
  const ph = waterQuality?.ph || 7;
  
  if (level < 3.5) {
    return {
      status: "critical",
      message: "Water stress conditions - focus on drought-resistant crops",
      crops: [
        { name: "Bajra (Pearl Millet)", water: "Low", reason: "Highly drought tolerant" },
        { name: "Moth Bean", water: "Very Low", reason: "Survives in arid conditions" },
        { name: "Gram (Chickpea)", water: "Low", reason: "Rain-fed suitable" },
      ]
    };
  } else if (level < 5) {
    return {
      status: "moderate",
      message: "Moderate water availability - balanced cropping",
      crops: [
        { name: "Wheat", water: "Moderate", reason: "Well-suited for this level" },
        { name: "Mustard", water: "Moderate", reason: "Good for winter season" },
        { name: "Barley", water: "Low-Moderate", reason: "Tolerates water stress" },
      ]
    };
  } else {
    return {
      status: "good",
      message: "Good water availability - diverse cropping possible",
      crops: [
        { name: "Rice (with caution)", water: "High", reason: "Sufficient water available" },
        { name: "Sugarcane (limited)", water: "Very High", reason: "Only if sustainable" },
        { name: "Vegetables", water: "Moderate-High", reason: "High value crops" },
      ]
    };
  }
}

// Simple markdown renderer
function renderMessage(text) {
  if (!text) return null;
  const lines = text.split('\n');
  
  return lines.map((line, idx) => {
    if (!line.trim()) return <br key={idx} />;
    
    const elements = [];
    let lastIndex = 0;
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;
    
    while ((match = boldRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        elements.push(<span key={`text-${idx}-${lastIndex}`}>{line.substring(lastIndex, match.index)}</span>);
      }
      elements.push(<strong key={`bold-${idx}-${match.index}`} className="font-bold">{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < line.length) {
      elements.push(<span key={`text-${idx}-${lastIndex}`}>{line.substring(lastIndex)}</span>);
    }
    
    if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
      return (
        <div key={idx} className="flex gap-2 ml-2">
          <span>•</span>
          <span>{elements.length > 0 ? elements : line.substring(1).trim()}</span>
        </div>
      );
    }
    
    return <div key={idx} className="mb-1">{elements.length > 0 ? elements : line}</div>;
  });
}

export default function StationDataPage() {
  const [stationId, setStationId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showChat, setShowChat] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [chatInitialized, setChatInitialized] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchStationData = (id) => {
    if (!id.trim()) {
      setError("Please enter a station ID");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    fetch(`/api/stations/by-id/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setData(json.data);
          setError(null);
        } else {
          setError(json.message || "Station not found");
          setData(null);
        }
      })
      .catch(() => {
        setError("Failed to load data");
        setData(null);
      })
      .finally(() => setLoading(false));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchStationData(stationId);
  };

  const initializeChat = async () => {
    if (chatInitialized) return;
    
    setChatLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message: data.station_id,
          sessionId,
          station_id: data.station_id,
        }),
      });

      const chatData = await response.json();
      
      if (response.ok) {
        setMessages([{
          role: "assistant",
          content: chatData.reply,
          timestamp: new Date(),
        }]);
        setChatInitialized(true);
      }
    } catch (error) {
      console.error("Chat init error:", error);
    } finally {
      setChatLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setChatLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message: input,
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      const assistantMessage = {
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = {
        role: "assistant",
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const openChat = () => {
    setShowChat(true);
    if (!chatInitialized) {
      initializeChat();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4 mx-auto"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Station Data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl mb-4 shadow-xl">
              <Droplets className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Station Data Viewer</h1>
            <p className="text-gray-600">Enter a station ID to view detailed groundwater information</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Station ID
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={stationId}
                    onChange={(e) => setStationId(e.target.value)}
                    placeholder="e.g., RJ_JAIPUR_CHOMU_001 or 12345"
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg flex items-center gap-2"
                  >
                    <Search className="w-5 h-5" />
                    Search
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              )}
            </form>

            <div className="mt-8 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-gray-600">
                <strong>Tip:</strong> Try searching for stations like "RJ_JAIPUR_CHOMU_001" or use numeric IDs
              </p>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const d = data;
  const q = d.water_quality;
  const recommendations = getCropRecommendations(d.current_water_level.depth_m, q);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      <div className={`transition-all duration-300 ${showChat ? 'grid grid-cols-2' : 'block'}`}>
        
        {/* Left Side - Station Data */}
        <div className={`${showChat ? 'border-r border-gray-200' : ''} overflow-y-auto`} style={{ maxHeight: '100vh' }}>
          <div className="py-8 px-6">
            <div className="max-w-4xl mx-auto">

              {/* Search Bar */}
              <div className="mb-6">
                <form onSubmit={handleSearch} className="flex gap-3">
                  <input
                    type="text"
                    value={stationId}
                    onChange={(e) => setStationId(e.target.value)}
                    placeholder="Search another station..."
                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Search
                  </button>
                </form>
              </div>

              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl mb-4 shadow-xl">
                  <Droplets className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-gray-800 mb-2">Station Data Report</h1>
                <p className="text-2xl font-semibold text-blue-700">{d.station_id}</p>
                <p className="text-lg text-gray-600 mt-1 flex items-center justify-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {d.location.village}, {d.location.block}, {d.location.district}, {d.location.state}
                </p>
              </div>

              {/* Current Status */}
              <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Current Groundwater Status</h2>
                <div className="flex items-center justify-center gap-8">
                  <div className={`flex items-center justify-center w-32 h-32 ${d.current_water_level.status_color} rounded-full text-white text-5xl font-black shadow-xl`}>
                    {d.current_water_level.short}
                  </div>
                  <div className="text-left">
                    <p className="text-5xl font-black text-blue-700">
                      {d.current_water_level.depth_m !== null ? `${d.current_water_level.depth_m} m` : "—"}
                    </p>
                    <p className="text-lg text-gray-600 mt-2">{d.current_water_level.period}</p>
                    <p className="text-3xl font-bold mt-2 text-gray-800">{d.current_water_level.status}</p>
                  </div>
                </div>
              </div>

              {/* Crop Recommendations */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl shadow-xl p-6 mb-6">
                <h3 className="text-2xl font-bold text-green-800 mb-4 flex items-center gap-3">
                  <Sprout className="w-7 h-7" /> Crop Recommendations
                </h3>
                <p className="text-gray-700 mb-4 font-medium">{recommendations.message}</p>
                <div className="grid gap-4">
                  {recommendations.crops.map((crop, i) => (
                    <div key={i} className="bg-white/90 rounded-xl p-4 flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-lg flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-gray-800">{crop.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{crop.reason}</p>
                        <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          Water Need: {crop.water}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6 mb-6">
                {/* Aquifer Details */}
                <div className="bg-gradient-to-br from-teal-50 to-cyan-100 rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-bold text-teal-800 mb-4 flex items-center gap-3">
                    <Beaker className="w-6 h-6" /> Aquifer Properties
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      { label: "Type", value: d.aquifer.type?.replace(/_/g, " ") || "—" },
                      { label: "Weathered Zone", value: d.aquifer.weathered_zone_m ? `${d.aquifer.weathered_zone_m} m` : "—" },
                      { label: "Fractured Zone", value: d.aquifer.fractured_zone_m ? `${d.aquifer.fractured_zone_m} m` : "—" },
                      { label: "Storativity", value: d.aquifer.storativity || "—" },
                      { label: "Transmissivity", value: d.aquifer.transmissivity_m2_day ? `${d.aquifer.transmissivity_m2_day} m²/day` : "—" },
                      { label: "Storage", value: d.aquifer.storage_capacity_m3 ? `${d.aquifer.storage_capacity_m3.toLocaleString()} m³` : "—" },
                    ].map((item, i) => (
                      <div key={i} className="bg-white/80 rounded-xl p-3">
                        <p className="text-gray-600 text-xs">{item.label}</p>
                        <p className="text-lg font-bold text-teal-700">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Water Quality */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-bold text-purple-800 mb-4 flex items-center gap-3">
                    <Beaker className="w-6 h-6" /> Water Quality
                  </h3>

                  {!q ? (
                    <div className="text-center py-12 text-lg text-gray-500 bg-white/80 rounded-2xl">
                      No quality data
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-white/90 rounded-2xl p-6 text-center">
                        <p className="text-5xl font-black text-purple-700">{q.ph}</p>
                        <p className="text-sm text-gray-600 mt-1">pH Level ({q.year})</p>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="bg-white/80 rounded-xl p-3 text-center">
                          <p className="text-gray-600 text-xs">EC</p>
                          <p className="text-lg font-bold">{q.ec_uScm}</p>
                          <p className="text-xs text-gray-500">µS/cm</p>
                        </div>
                        <div className="bg-white/80 rounded-xl p-3 text-center">
                          <p className="text-gray-600 text-xs">NO₃</p>
                          <p className="text-lg font-bold">{q.no3_mgL}</p>
                          <p className="text-xs text-gray-500">mg/L</p>
                        </div>
                        <div className="bg-white/80 rounded-xl p-3 text-center">
                          <p className="text-gray-600 text-xs">F</p>
                          <p className="text-lg font-bold">{q.f_mgL}</p>
                          <p className="text-xs text-gray-500">mg/L</p>
                        </div>
                      </div>

                      <div className="text-center">
                        {q.suitability === "POTABLE" ? (
                          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-xl text-lg font-bold">
                            <CheckCircle className="w-5 h-5" /> POTABLE
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-xl text-lg font-bold">
                            <AlertCircle className="w-5 h-5" /> NEEDS TREATMENT
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Seasonal Levels */}
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                <h3 className="text-2xl font-bold text-center text-gray-800 mb-6">Latest Seasonal Levels</h3>
                <div className="grid grid-cols-4 gap-4">
                  {["jan", "apr_may", "aug", "nov"].map(key => (
                    <div key={key} className="text-center bg-gradient-to-br from-blue-50 to-cyan-100 rounded-xl p-4 shadow-lg">
                      <p className="text-sm font-semibold text-gray-700 uppercase">
                        {key === "apr_may" ? "Apr–May" : key}
                      </p>
                      <p className="text-4xl font-black text-blue-700 mt-2">
                        {d.seasonal_levels_latest[key] !== null ? `${d.seasonal_levels_latest[key]}m` : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={openChat}
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 flex items-center gap-3"
                >
                  <MessageCircle className="w-6 h-6" />
                  Ask AI Assistant
                </button>
                <Link
                  href="/"
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 flex items-center gap-3"
                >
                  Back to Home
                </Link>
              </div>

              <div className="text-center mt-6 text-sm text-gray-500">
                Data Source: CGWB • NAQUIM • State Groundwater Department
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Chat Panel */}
        {showChat && (
          <div className="bg-white flex flex-col" style={{ height: '100vh' }}>
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot className="w-6 h-6" />
                <div>
                  <h2 className="font-bold text-lg">AI Water Assistant</h2>
                  <p className="text-xs opacity-90">Ask about {d.station_id}</p>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === "user"
                        ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                        : "bg-gradient-to-br from-green-500 to-emerald-500"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>

                  <div className={`flex-1 max-w-[80%] ${message.role === "user" ? "text-right" : "text-left"}`}>
                    <div
                      className={`inline-block p-3 rounded-xl text-sm ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                          : message.isError
                          ? "bg-red-100 text-red-800"
                          : "bg-white text-gray-800 shadow"
                      }`}
                    >
                      <div className="break-words">{renderMessage(message.content)}</div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 px-2">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                      <span className="text-sm text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about water levels, crops, conservation..."
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors text-sm"
                  disabled={chatLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={chatLoading || !input.trim()}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg"
                >
                  {chatLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Quick Suggestions */}
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  "Water quality safe?",
                  "Best crops?",
                  "Conservation tips",
                  "Irrigation advice",
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(suggestion)}
                    className="text-xs bg-green-50 text-green-600 px-3 py-1 rounded-full hover:bg-green-100 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}