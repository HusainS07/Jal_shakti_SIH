// app/chat/page.js
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send, Bot, User, Loader2, Globe, MapPin,
  Languages, X, Droplet, Search, Info, AlertCircle
} from "lucide-react";

const LANGUAGES = [
  { id: "en", name: "English", nativeName: "English" },
  { id: "hi", name: "Hindi", nativeName: "हिंदी" },
  { id: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { id: "te", name: "Telugu", nativeName: "తెలుగు" },
  { id: "bn", name: "Bengali", nativeName: "বাংলা" },
  { id: "mr", name: "Marathi", nativeName: "मराठी" },
  { id: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { id: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { id: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { id: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { id: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ" },
  { id: "as", name: "Assamese", nativeName: "অসমীয়া" },
];

function renderMessage(text) {
  if (!text) return null;
  
  // Handle markdown-style bold text
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    
    return part.split("\n").map((line, i) => {
      if (!line.trim()) return <br key={`${idx}-${i}`} />;
      
      if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
        return (
          <div key={`${idx}-${i}`} className="flex gap-2 ml-4 my-1">
            <span className="text-blue-600">•</span>
            <span>{line.replace(/^[•-]\s*/, "")}</span>
          </div>
        );
      }
      
      // Check for numbered lists
      if (/^\d+\./.test(line.trim())) {
        return (
          <div key={`${idx}-${i}`} className="ml-4 my-1">
            {line}
          </div>
        );
      }
      
      return <div key={`${idx}-${i}`} className="my-1">{line}</div>;
    });
  });
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [stationData, setStationData] = useState(null);
  const [showLangModal, setShowLangModal] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [showStationInfo, setShowStationInfo] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => scrollToBottom(), [messages]);

  useEffect(() => {
    // Load saved language preference
    const saved = localStorage.getItem("chatLanguage");
    if (saved) {
      const lang = LANGUAGES.find(l => l.id === saved);
      if (lang) setSelectedLang(lang);
    }

    // Initial welcome message
    setMessages([{
      role: "assistant",
      content: "🙏 **Namaste!** I'm your **Jal Shakti AI Assistant**.\n\nI can help you with:\n• **General queries** about groundwater, irrigation, and farming\n• **Specific station data** - Just provide a Station ID or location\n\nHow can I assist you today?",
      timestamp: new Date(),
    }]);
  }, []);

  const handleLanguage = (lang) => {
    setSelectedLang(lang);
    localStorage.setItem("chatLanguage", lang.id);
    setShowLangModal(false);
    
    setMessages(prev => [...prev, {
      role: "assistant",
      content: `✅ Language changed to **${lang.nativeName}** (${lang.name})`,
      timestamp: new Date(),
    }]);
  };

  const clearStation = () => {
    setStationData(null);
    setPendingConfirmation(null);
    setMessages(prev => [...prev, {
      role: "assistant",
      content: "🔄 Station cleared. You can now search for a new location or ask general questions.",
      timestamp: new Date(),
    }]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setLoading(true);

    try {
      const payload = {
        message: currentInput,
        sessionId,
        language_id: selectedLang.id,
      };

      // If there's a pending confirmation, include it
      if (pendingConfirmation) {
        payload.confirmStationId = pendingConfirmation;
      }

      // If station is already loaded, include it in context
      if (stationData) {
        payload.station_id = stationData.station_id;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      }]);

      // Update station data if provided
      if (data.stationData) {
        setStationData(data.stationData);
        setPendingConfirmation(null);
      }

      // Handle pending confirmation
      if (data.pendingConfirmation) {
        setPendingConfirmation(data.pendingConfirmation);
      } else if (!data.stationData && pendingConfirmation) {
        // Clear pending if user said no
        setPendingConfirmation(null);
      }

    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `❌ Sorry, I encountered an error: ${err.message}\n\nPlease try again.`,
        timestamp: new Date(),
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      <div className="max-w-6xl mx-auto h-screen flex flex-col">

        {/* Header */}
        <div className="bg-white shadow-xl border-b-4 border-blue-500 p-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-3 rounded-2xl shadow-lg">
              <Droplet className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Jal Shakti AI Assistant
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Powered by Complete Database Context
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {/* Language Selector */}
            <button
              onClick={() => setShowLangModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl flex items-center gap-2 shadow-lg transition-all transform hover:scale-105"
            >
              <Languages className="w-5 h-5" />
              <span className="font-semibold">{selectedLang.nativeName}</span>
            </button>

            {/* Clear Station Button */}
            {stationData && (
              <button
                onClick={clearStation}
                className="px-5 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl flex items-center gap-2 shadow-lg transition-all"
              >
                <X className="w-5 h-5" />
                Clear Station
              </button>
            )}
          </div>
        </div>

        {/* Station Info Banner */}
        {stationData && (
          <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white shadow-lg">
            <div className="p-5 flex justify-between items-center">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="w-6 h-6" />
                  <p className="font-bold text-xl">{stationData.station_id}</p>
                </div>
                <p className="text-blue-100 ml-9">
                  {stationData.village}, {stationData.district}, {stationData.state}
                </p>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end mb-1">
                  <Droplet className="w-5 h-5" />
                  <span className="text-sm font-medium">Water Level</span>
                </div>
                <p className="text-2xl font-bold">{stationData.avg_level} m</p>
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-2 ${
                  stationData.water_level_status?.toLowerCase().includes('critical') ? 'bg-red-500' :
                  stationData.water_level_status?.toLowerCase().includes('moderate') ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}>
                  {stationData.water_level_status?.toUpperCase()}
                </div>
              </div>

              <button
                onClick={() => setShowStationInfo(!showStationInfo)}
                className="ml-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <Info className="w-6 h-6" />
              </button>
            </div>

            {/* Expanded Station Info */}
            {showStationInfo && (
              <div className="bg-white/10 backdrop-blur-sm border-t border-white/20 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-100 mb-1">📍 Location Details</p>
                    <p className="font-semibold">Village: {stationData.village}</p>
                    <p className="font-semibold">District: {stationData.district}</p>
                    <p className="font-semibold">State: {stationData.state}</p>
                  </div>
                  <div>
                    <p className="text-blue-100 mb-1">💧 Water Status</p>
                    <p className="font-semibold">Current Depth: {stationData.avg_level} meters</p>
                    <p className="font-semibold">Status: {stationData.water_level_status}</p>
                  </div>
                </div>
                <p className="text-xs text-blue-100 mt-3">
                  ℹ️ Complete data loaded: Water levels, aquifer properties, extraction infrastructure, water quality, and usage patterns
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pending Confirmation Banner */}
        {pendingConfirmation && (
          <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border-l-4 border-yellow-500 text-yellow-900 p-4 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 animate-pulse" />
                <span className="font-semibold">
                  Station found! Waiting for your confirmation...
                </span>
              </div>
              <div className="flex gap-2 text-sm bg-yellow-200 px-3 py-1 rounded-lg">
                <span>Reply:</span>
                <strong>"Yes"</strong>
                <span>or</span>
                <strong>"No"</strong>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div 
              key={i} 
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
            >
              <div className={`max-w-3xl ${m.role === "user" ? "ml-12" : "mr-12"}`}>
                {/* Avatar & Name */}
                <div className={`flex items-center gap-2 mb-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">Jal Shakti AI</span>
                    </>
                  )}
                  {m.role === "user" && (
                    <>
                      <span className="text-sm font-semibold text-gray-700">You</span>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    </>
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`p-4 rounded-2xl shadow-lg ${
                  m.role === "user"
                    ? "bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-tr-sm"
                    : m.isError
                    ? "bg-red-50 text-red-800 border-2 border-red-200 rounded-tl-sm"
                    : "bg-white text-gray-800 border border-gray-200 rounded-tl-sm"
                }`}>
                  <div className="leading-relaxed">
                    {renderMessage(m.content)}
                  </div>
                  
                  {/* Timestamp */}
                  <div className={`text-xs mt-2 ${
                    m.role === "user" ? "text-blue-100" : "text-gray-400"
                  }`}>
                    {m.timestamp.toLocaleTimeString('en-IN', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="max-w-3xl mr-12">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Jal Shakti AI</span>
                </div>
                <div className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-gray-600">
                      {stationData ? "Analyzing station data..." : "Thinking..."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t-2 border-gray-200 p-5 shadow-2xl">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  pendingConfirmation
                    ? `Type 'Yes' to confirm or 'No' to search again...`
                    : stationData
                    ? `Ask me anything about ${stationData.station_id}...`
                    : "Ask about groundwater, or enter a Station ID / Location..."
                }
                className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 resize-none transition-colors"
                rows="2"
                disabled={loading}
              />
              <div className="flex justify-between items-center mt-2 px-2">
                <p className="text-xs text-gray-500">
                  {stationData 
                    ? `💧 Station loaded: Full context available` 
                    : `💡 Tip: You can ask in ${selectedLang.nativeName}`
                  }
                </p>
                <p className="text-xs text-gray-400">
                  Press Enter to send • Shift+Enter for new line
                </p>
              </div>
            </div>
            
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-400 text-white px-8 py-4 rounded-xl flex items-center gap-2 font-bold shadow-lg transition-all transform hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-6 h-6" />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Language Selection Modal */}
      {showLangModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Choose Your Language
                </h2>
                <p className="text-gray-600 mt-1">भाषा चुनें • மொழியைத் தேர்ந்தெடுக்கவும்</p>
              </div>
              <button 
                onClick={() => setShowLangModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {LANGUAGES.map(l => (
                <button
                  key={l.id}
                  onClick={() => handleLanguage(l)}
                  className={`p-5 rounded-xl border-2 text-center transition-all transform hover:scale-105 ${
                    selectedLang.id === l.id
                      ? "border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg"
                      : "border-gray-300 hover:border-blue-400 hover:shadow-md"
                  }`}
                >
                  <div className="text-3xl mb-2">{l.nativeName}</div>
                  <div className="text-sm text-gray-600 font-medium">{l.name}</div>
                  {selectedLang.id === l.id && (
                    <div className="mt-2 text-blue-600 font-bold text-xs">✓ Selected</div>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm text-gray-700">
                <strong>💡 Note:</strong> The AI will respond in your selected language. 
                You can change the language anytime during the conversation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}