"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Loader2, Info, Droplet, Sprout, Languages, X } from "lucide-react";

// Language options with Assamese added
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

// Simple markdown renderer for chat messages
function renderMessage(text) {
  if (!text) return null;
  
  const lines = text.split('\n');
  
  return lines.map((line, idx) => {
    if (!line.trim()) return <br key={idx} />;
    
    let processed = line;
    const elements = [];
    let lastIndex = 0;
    
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;
    
    while ((match = boldRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        elements.push(
          <span key={`text-${idx}-${lastIndex}`}>
            {line.substring(lastIndex, match.index)}
          </span>
        );
      }
      elements.push(
        <strong key={`bold-${idx}-${match.index}`} className="font-bold">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < line.length) {
      elements.push(
        <span key={`text-${idx}-${lastIndex}`}>
          {line.substring(lastIndex)}
        </span>
      );
    }
    
    if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
      return (
        <div key={idx} className="flex gap-2 ml-2">
          <span>•</span>
          <span>{elements.length > 0 ? elements : line.substring(1).trim()}</span>
        </div>
      );
    }
    
    return (
      <div key={idx} className="mb-1">
        {elements.length > 0 ? elements : line}
      </div>
    );
  });
}

function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [stationData, setStationData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [needsStationId, setNeedsStationId] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]); // Default English
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load saved language preference
    const savedLang = localStorage.getItem("chatLanguage");
    if (savedLang) {
      const lang = LANGUAGES.find(l => l.id === savedLang);
      if (lang) setSelectedLanguage(lang);
    }

    // Initial greeting
    setMessages([
      {
        role: "assistant",
        content: "👋 Hi! I'm your **water management assistant**.\n\nPlease provide a **station ID** to get started.",
        timestamp: new Date(),
      },
    ]);
  }, []);

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    localStorage.setItem("chatLanguage", language.id);
    setShowLanguageModal(false);
    
    // Add system message about language change
    const systemMessage = {
      role: "assistant",
      content: `✓ Language changed to **${language.name} (${language.nativeName})**. All responses will now be in ${language.name}.`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, systemMessage]);
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
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      
      // Extract station_id if user is providing it
      let station_id = null;
      if (needsStationId) {
        const idMatch = input.match(/\b\d{4,}\b/) || input.match(/station[:\s]+(\w+)/i);
        station_id = idMatch ? idMatch[1] || idMatch[0] : input.trim();
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message: input,
          sessionId,
          language_id: selectedLanguage.id,
          language_name: `${selectedLanguage.name} (${selectedLanguage.nativeName})`,
          ...(needsStationId && station_id && { station_id }),
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

      // Update station data if provided
      if (data.stationData) {
        setStationData(data.stationData);
        setNeedsStationId(false);
      }

      // Update user profile if provided
      if (data.userProfile) {
        setUserProfile(data.userProfile);
      }

      // Check if still needs station ID
      if (data.needsStationId !== undefined) {
        setNeedsStationId(data.needsStationId);
      }

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
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
      <div className="max-w-5xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
        
        {/* Header */}
        <div className="bg-white rounded-t-2xl shadow-lg p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-3 rounded-xl">
                <Droplet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Water Management Assistant</h1>
                <p className="text-sm text-gray-500">
                  {userProfile ? "Personalized advice for your farm" : "Ask me anything about groundwater stations"}
                </p>
              </div>
            </div>
            
            {/* Language Selector Button */}
            <button
              onClick={() => setShowLanguageModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-md"
            >
              <Languages className="w-5 h-5" />
              <div className="text-left">
                <div className="text-xs opacity-80">Language</div>
                <div className="text-sm font-semibold">{selectedLanguage.nativeName}</div>
              </div>
            </button>
          </div>

          {/* User Farming Profile Card */}
          {userProfile && (userProfile.crops?.length > 0 || userProfile.livestock?.length > 0) && (
            <div className="mt-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Sprout className="w-4 h-4" />
                <span className="font-semibold">Your Farming Profile</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {userProfile.crops?.length > 0 && (
                  <div>
                    <div className="opacity-80">Crops</div>
                    <div className="font-semibold">{userProfile.crops.join(", ")}</div>
                  </div>
                )}
                {userProfile.livestock?.length > 0 && (
                  <div>
                    <div className="opacity-80">Livestock</div>
                    <div className="font-semibold">{userProfile.livestock.join(", ")}</div>
                  </div>
                )}
                {userProfile.landAreaAcres && (
                  <div>
                    <div className="opacity-80">Land Area</div>
                    <div className="font-semibold">{userProfile.landAreaAcres} acres</div>
                  </div>
                )}
                {userProfile.irrigationMethod && (
                  <div>
                    <div className="opacity-80">Irrigation</div>
                    <div className="font-semibold capitalize">{userProfile.irrigationMethod}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Station Info Card */}
          {stationData && stationData.station_name !== "Unknown Station" && (
            <div className="mt-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4" />
                <span className="font-semibold">Current Station: {stationData.station_name}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="opacity-80">Location</div>
                  <div className="font-semibold">{stationData.district}, {stationData.state}</div>
                </div>
                <div>
                  <div className="opacity-80">Station ID</div>
                  <div className="font-semibold">{stationData.station_id}</div>
                </div>
                <div>
                  <div className="opacity-80">Water Status</div>
                  <div className="font-semibold bg-white/20 px-2 py-1 rounded inline-block">
                    {stationData.water_level_status?.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 bg-white p-6 overflow-y-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                    : "bg-gradient-to-br from-green-500 to-emerald-500"
                }`}
              >
                {message.role === "user" ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`flex-1 max-w-[70%] ${
                  message.role === "user" ? "text-right" : "text-left"
                }`}
              >
                <div
                  className={`inline-block p-4 rounded-2xl ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                      : message.isError
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
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

          {loading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-gray-100 p-4 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white rounded-b-2xl shadow-lg p-4 border-t">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                needsStationId
                  ? "Enter station ID (e.g., 12345)..."
                  : userProfile
                  ? `Ask about ${userProfile.crops?.join(", ") || "your crops"}, water needs, etc...`
                  : "Ask about water levels, quality, recommendations..."
              }
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <Send className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Quick Suggestions */}
          {!needsStationId && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">Quick questions:</span>
              {userProfile && userProfile.crops?.length > 0 ? (
                [
                  `Water needs for ${userProfile.crops[0]}?`,
                  "Best irrigation schedule?",
                  userProfile.livestock?.length > 0 ? `Water for ${userProfile.livestock[0]}?` : "Conservation tips?",
                  "Crop alternatives?",
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(suggestion)}
                    className="text-xs bg-green-50 text-green-600 px-3 py-1 rounded-full hover:bg-green-100 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))
              ) : (
                [
                  "What's the water quality?",
                  "Show conservation tips",
                  "Recommend crops",
                  "Water level trends",
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(suggestion)}
                    className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Language Selection Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Languages className="w-6 h-6" />
                <div>
                  <h2 className="text-xl font-bold">Select Language</h2>
                  <p className="text-sm opacity-90">Choose your preferred language for responses</p>
                </div>
              </div>
              <button
                onClick={() => setShowLanguageModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Language Grid */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {LANGUAGES.map((language) => (
                  <button
                    key={language.id}
                    onClick={() => handleLanguageChange(language)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedLanguage.id === language.id
                        ? "border-purple-500 bg-purple-50 shadow-md"
                        : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/50"
                    }`}
                  >
                    <div className="font-semibold text-gray-800">{language.name}</div>
                    <div className="text-lg mt-1 text-purple-600">{language.nativeName}</div>
                    {selectedLanguage.id === language.id && (
                      <div className="mt-2 text-xs text-purple-600 font-medium">✓ Selected</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowLanguageModal(false)}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPage;