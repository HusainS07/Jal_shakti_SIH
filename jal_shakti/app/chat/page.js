// app/chat/page.js
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send, Bot, User, Loader2, Globe, MapPin,
  Languages, X, Droplet, Search
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
  return text.split("\n").map((line, i) => {
    if (!line.trim()) return <br key={i} />;
    if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
      return (
        <div key={i} className="flex gap-2">
          <span>•</span>
          <span>{line.replace(/^[•-]\s*/, "")}</span>
        </div>
      );
    }
    return <div key={i}>{line}</div>;
  });
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [stationData, setStationData] = useState(null);
  const [chatMode, setChatMode] = useState("general");
  const [showLangModal, setShowLangModal] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => scrollToBottom(), [messages]);

  useEffect(() => {
    const saved = localStorage.getItem("chatLanguage");
    if (saved) {
      const lang = LANGUAGES.find(l => l.id === saved);
      if (lang) setSelectedLang(lang);
    }

    setMessages([{
      role: "assistant",
      content: chatMode === "specific"
        ? "Hi! I'm in **Specific Mode**.\n\n🔍 Enter a **Station ID**, **State**, **District**, or **Village** name to search.\n\nExamples:\n• RJ_JAIPUR_CHOMU_001\n• Jaipur\n• Rajasthan\n• Chomu"
        : "Hi! I'm your **Jal Shakti AI Assistant**.\n\nAsk me anything about groundwater, conservation, farming, or water quality!",
      timestamp: new Date(),
    }]);
  }, [chatMode]);

  const toggleMode = () => {
    const newMode = chatMode === "general" ? "specific" : "general";
    setChatMode(newMode);
    setStationData(null);
    setPendingConfirmation(null);

    setMessages(prev => [...prev, {
      role: "assistant",
      content: newMode === "specific"
        ? "Switched to **Specific Mode**\n\n🔍 Enter a Station ID, State, District, or Village to search."
        : "Switched to **General Mode**\n\nYou can now ask general questions!",
      timestamp: new Date(),
    }]);
  };

  const handleLanguage = (lang) => {
    setSelectedLang(lang);
    localStorage.setItem("chatLanguage", lang.id);
    setShowLangModal(false);
    setMessages(prev => [...prev, {
      role: "assistant",
      content: `Language changed to **${lang.nativeName}**`,
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

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed");
      }

      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      }]);

      if (data.stationData) {
        setStationData(data.stationData);
        setPendingConfirmation(null);
      }

      if (data.pendingConfirmation) {
        setPendingConfirmation(data.pendingConfirmation);
      } else if (!data.stationData) {
        setPendingConfirmation(null);
      }

    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Sorry, I encountered an error: ${err.message}`,
        timestamp: new Date(),
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="max-w-5xl mx-auto h-screen flex flex-col">

        {/* Header */}
        <div className="bg-white shadow-lg p-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Droplet className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Jal Shakti AI Assistant</h1>
              <p className="text-sm text-gray-600">Ask in any Indian language</p>
            </div>
          </div>

          <div className="flex gap-3">
            {/* Mode Toggle */}
            <button
              onClick={toggleMode}
              className={`px-6 py-3 rounded-xl font-bold text-white flex items-center gap-3 shadow-lg transition-all ${
                chatMode === "specific"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600"
                  : "bg-gradient-to-r from-blue-600 to-cyan-600"
              }`}
            >
              {chatMode === "specific" ? <MapPin className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
              {chatMode === "specific" ? "Specific Mode" : "General Mode"}
            </button>

            {/* Language */}
            <button
              onClick={() => setShowLangModal(true)}
              className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl flex items-center gap-2"
            >
              <Languages className="w-5 h-5" />
              {selectedLang.nativeName}
            </button>
          </div>
        </div>

        {/* Station Info */}
        {stationData && (
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 text-center">
            <p className="font-bold text-lg">{stationData.station_id}</p>
            <p>{stationData.village}, {stationData.district}, {stationData.state}</p>
            <p className="text-sm mt-1">Status: <strong>{stationData.water_level_status?.toUpperCase()}</strong></p>
          </div>
        )}

        {/* Pending Confirmation Banner */}
        {pendingConfirmation && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5" />
              <span className="font-semibold">Waiting for confirmation...</span>
            </div>
            <span className="text-sm">Reply "Yes" or "No"</span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-lg p-4 rounded-2xl ${
                m.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}>
                {renderMessage(m.content)}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-4 rounded-2xl flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white p-5 border-t">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder={
                pendingConfirmation
                  ? "Type 'Yes' to confirm or 'No' to search again..."
                  : chatMode === "specific" && !stationData
                  ? "Enter Station ID, State, District, or Village..."
                  : "Type your message..."
              }
              className="flex-1 px-5 py-4 border rounded-xl focus:outline-none focus:border-blue-500"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-4 rounded-xl flex items-center gap-2 font-bold"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Language Modal */}
      {showLangModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Select Language</h2>
              <button onClick={() => setShowLangModal(false)}><X className="w-6 h-6" /></button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {LANGUAGES.map(l => (
                <button
                  key={l.id}
                  onClick={() => handleLanguage(l)}
                  className={`p-4 rounded-xl border-2 text-center transition ${
                    selectedLang.id === l.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-blue-400"
                  }`}
                >
                  <div className="text-2xl mb-2">{l.nativeName}</div>
                  <div className="text-sm text-gray-600">{l.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}