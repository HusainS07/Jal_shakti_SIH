"use client";
import { useEffect, useState } from "react";
import { LogOut, User } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
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
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-8 text-center">
          <User className="mx-auto mb-3" size={50} />
          <h2 className="text-2xl font-bold">Profile</h2>
          <p className="opacity-90 mt-1">{user.role.toUpperCase()}</p>
        </div>
        
        {/* Body */}
        <div className="px-8 py-6 space-y-4 text-gray-800">
          <div className="flex justify-between">
            <span className="font-semibold">User ID:</span>
            <span className="text-gray-600">{user._id}</span>
          </div>

          <div className="flex justify-between">
            <span className="font-semibold">Email:</span>
            <span className="text-blue-700 font-medium">{user.email}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t bg-gray-50 text-end">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
