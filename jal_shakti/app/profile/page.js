"use client";
import { useEffect, useState } from "react";
import { LogOut, User, Copy } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(user._id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No token found. Please login first.");
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setUser(data.user);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-xl font-semibold">
        Loading user info...
      </div>
    );

  if (error)
    return (
      <div className="flex justify-center items-center h-screen text-red-600 text-xl font-semibold">
        {error}
      </div>
    );

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-100 to-blue-200 px-4">
      <div className="w-full max-w-lg bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="bg-blue-700 text-white px-6 py-6 text-center relative">
          <User className="mx-auto mb-3" size={50} />
          <h2 className="text-3xl font-bold">Profile</h2>

          {/* Role Badge */}
          <span className="inline-block bg-blue-900 text-white text-sm font-semibold px-3 py-1 mt-2 rounded-full">
            {user.role.toUpperCase()}
          </span>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-6 text-gray-800">

          {/* User ID */}
          <div>
            <label className="font-semibold block mb-1">User ID:</label>
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg justify-between">
              <span className="text-gray-700 break-all">{user._id}</span>
              <button onClick={handleCopy} className="text-blue-600 hover:text-blue-800">
                <Copy size={18} />
              </button>
            </div>
            {copied && (
              <span className="text-green-600 text-sm mt-1 block">Copied!</span>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="font-semibold block mb-1">Email:</label>
            <p className="text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
              {user.email}
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-100 text-end">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2 rounded-lg transition-all duration-200"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
