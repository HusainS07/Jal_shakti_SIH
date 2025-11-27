"use client";
import { useEffect, useState } from "react";
import { LogOut, User, Copy, X } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [cropsInput, setCropsInput] = useState("");
  const [livestockInput, setLivestockInput] = useState("");
  const [landArea, setLandArea] = useState("");
  const [irrigation, setIrrigation] = useState("flood");

  const [crops, setCrops] = useState([]);
  const [livestock, setLivestock] = useState([]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(user._id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Add item on Enter or comma
  const addItem = (input, setInput, list, setList) => {
    const values = input
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (values.length > 0) {
      setList([...list, ...values]);
      setInput("");
    }
  };

  const removeItem = (list, setList, item) => {
    setList(list.filter((i) => i !== item));
  };

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          crops: crops,
          livestock: livestock,
          landAreaAcres: landArea ? Number(landArea) : null,
          irrigationMethod: irrigation,
        }),
      });

      if (res.ok) {
        alert("Profile updated!");
      } else {
        alert("Failed to save");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
    setSaving(false);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return (window.location.href = "/login");

    fetch("/api/user", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user);
        const profile = data.user.farmingProfile || {};
        setCrops(profile.crops || []);
        setLivestock(profile.livestock || []);
        setLandArea(profile.landAreaAcres || "");
        setIrrigation(profile.irrigationMethod || "flood");
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-xl font-bold text-teal-700">
        Loading...
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white p-8 text-center">
            <User className="mx-auto mb-4" size={70} />
            <h1 className="text-4xl font-bold">My Profile</h1>
            <p className="mt-3 text-lg opacity-90">{user.email}</p>
            <p className="mt-2 px-6 py-2 bg-white/20 rounded-full inline-block">
              {user.role.toUpperCase().replace("_", " ")}
            </p>
          </div>

          <div className="p-8 text-center">
            <p className="text-sm font-medium text-gray-600">User ID</p>
            <div className="flex items-center justify-center gap-3 mt-2">
              <code className="bg-gray-100 px-4 py-2 rounded-lg text-sm font-mono">
                {user._id}
              </code>
              <button onClick={handleCopy} className="text-blue-600">
                <Copy size={22} />
              </button>
            </div>
            {copied && <p className="text-green-600 text-sm mt-2">Copied!</p>}
          </div>
        </div>

        {/* Farming Profile - Free Text Chips */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-teal-100">
          <h2 className="text-2xl font-bold text-teal-700 mb-6 text-center">
            Your Farm Details (For Personal Water Advice)
          </h2>

          <div className="space-y-6">

            {/* Crops */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                Crops you grow (type and press Enter or comma)
              </label>
              <input
                type="text"
                value={cropsInput}
                onChange={(e) => setCropsInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addItem(cropsInput, setCropsInput, crops, setCrops);
                  }
                }}
                placeholder="e.g. Wheat, Mustard, Bajra, Cotton"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:outline-none"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {crops.map((crop) => (
                  <span key={crop} className="inline-flex items-center gap-2 bg-teal-100 text-teal-800 px-4 py-2 rounded-full text-sm font-medium">
                    {crop}
                    <button
                      onClick={() => removeItem(crops, setCrops, crop)}
                      className="hover:bg-teal-200 rounded-full p-0.5"
                    >
                      <X size={16} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Livestock */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                Animals / Livestock
              </label>
              <input
                type="text"
                value={livestockInput}
                onChange={(e) => setLivestockInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addItem(livestockInput, setLivestockInput, livestock, setLivestock);
                  }
                }}
                placeholder="e.g. Cow, Buffalo, Goat"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:outline-none"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {livestock.map((animal) => (
                  <span key={animal} className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium">
                    {animal}
                    <button
                      onClick={() => removeItem(livestock, setLivestock, animal)}
                      className="hover:bg-amber-200 rounded-full p-0.5"
                    >
                      <X size={16} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Land & Irrigation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-2">
                  Land Area (in Acres)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={landArea}
                  onChange={(e) => setLandArea(e.target.value)}
                  placeholder="5.5"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-2">
                  Main Irrigation Method
                </label>
                <select
                  value={irrigation}
                  onChange={(e) => setIrrigation(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:outline-none"
                >
                  <option value="flood">Flood Irrigation</option>
                  <option value="drip">Drip Irrigation</option>
                  <option value="sprinkler">Sprinkler</option>
                  <option value="rainfed">Rainfed Only</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl text-lg transition transform hover:scale-105 disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save My Farm Details"}
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="text-center pt-6">
          <button
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700 font-medium flex items-center gap-2 mx-auto"
          >
            <LogOut size={20} /> Logout
          </button>
        </div>

      </div>
    </div>
  );
}