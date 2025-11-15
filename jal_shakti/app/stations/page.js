"use client";

import { useState, useEffect } from "react";
import { MapPin, Navigation, Droplets } from "lucide-react";
import Link from "next/link";

export default function StationsPage() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          setUserLocation({ longitude, latitude });
          fetchStations(longitude, latitude);
        },
        (err) => {
          console.error("Location error:", err);
          // Fallback to Mumbai coordinates
          const defaultLng = 72.85;
          const defaultLat = 19.02;
          setUserLocation({ longitude: defaultLng, latitude: defaultLat });
          fetchStations(defaultLng, defaultLat);
        }
      );
    } else {
      // Fallback if geolocation not supported
      const defaultLng = 72.85;
      const defaultLat = 19.02;
      setUserLocation({ longitude: defaultLng, latitude: defaultLat });
      fetchStations(defaultLng, defaultLat);
    }
  }, []);

  const fetchStations = async (lng, lat) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/stations_data/${lng}/${lat}`);
      const data = await response.json();
      
      console.log("API Response:", data); // Debug log
      console.log("Stations:", data.stations); // Debug log
      
      if (response.ok) {
        setStations(data.stations || []);
      } else {
        setError(data.error || "Failed to fetch stations");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load stations");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading nearby stations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-600 font-semibold">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl mb-4 shadow-lg">
            <Droplets className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Nearby Stations</h1>
          <p className="text-gray-600">
            {userLocation
              ? `Showing stations near ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`
              : "Finding your location..."}
          </p>
        </div>

        {/* Stations List */}
        {stations.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 text-center">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No stations found nearby</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your location or check back later</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stations.map((station, index) => {
              console.log(`Station ${index}:`, station); // Debug each station
              return (
                <div
                  key={station._id || index}
                  className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-white/20"
                >
                  {/* Station Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-1">
                        {station.stationName || "Unknown Station"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {station.city || "Unknown City"}, {station.state || "Unknown State"}
                      </p>
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>

                  {/* District */}
                  {station.district && (
                    <div className="mb-4 text-sm text-gray-600">
                      <span className="font-semibold">District:</span> {station.district}
                    </div>
                  )}

                  {/* Slots Info */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Available Slots</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {station.availableSlots ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Total Capacity</span>
                      <span className="font-semibold">{station.capacity ?? 0}</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            station.capacity > 0
                              ? ((station.capacity - station.availableSlots) / station.capacity) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Location Coordinates */}
                  {station.location?.coordinates && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Navigation className="w-3 h-3" />
                      <span>
                        {station.location.coordinates[1].toFixed(4)}, {station.location.coordinates[0].toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Back Button */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="inline-block bg-white/80 backdrop-blur-lg px-6 py-3 rounded-xl text-gray-700 font-semibold hover:bg-white transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
