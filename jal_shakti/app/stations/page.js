"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link"; // Import Link for navigation
import { 
  Droplets, 
  Navigation, 
  Layers, 
  Loader2, 
  MapPin, 
  ArrowDown, 
  Activity, 
  TrendingDown, 
  Mountain,
  LayoutDashboard // New Icon for Dashboard button
} from "lucide-react";
import * as THREE from "three";

export default function GlobeToMapPage() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [globeReady, setGlobeReady] = useState(false);

  const globeContainerRef = useRef();
  const mapContainerRef = useRef();
  const leafletMapRef = useRef();
  const markersRef = useRef([]);
  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const globeRef = useRef();
  const animationFrameRef = useRef();

  // -----------------------------------------
  // 1. Geolocation Logic
  // -----------------------------------------
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ latitude, longitude });
          fetchStations(longitude, latitude);
        },
        () => fallbackToJaipur()
      );
    } else {
      fallbackToJaipur();
    }

    function fallbackToJaipur() {
      setUserLocation({ latitude: 27.17, longitude: 75.72 });
      fetchStations(75.72, 27.17);
    }
  }, []);

  // -----------------------------------------
  // 2. 3D Globe (Bright & Centered on India)
  // -----------------------------------------
  useEffect(() => {
    if (!globeContainerRef.current || loading || showMap) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    camera.position.z = 250; // Start far away
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    globeContainerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Sphere/Globe Setup ---
    const geometry = new THREE.SphereGeometry(80, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = "anonymous";

    // UPDATED: Using a brighter "Blue Marble" / Day texture
    const material = new THREE.MeshPhongMaterial({
      map: textureLoader.load("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"),
      bumpScale: 0.04,
      specular: new THREE.Color("grey"),
      shininess: 10,
    });

    const globe = new THREE.Mesh(geometry, material);
    globeRef.current = globe;
    scene.add(globe);

    // --- Lighting (Brighter) ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); 
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(10, 10, 10); // Sun position
    scene.add(ambientLight, directionalLight);

    // --- Animation Variables ---
    let rotationSpeed = 0.0008; // Slow rotation
    let targetCameraPos = { x: 0, y: 0, z: 250 };
    let currentStep = 0;
    const flyToSteps = 350; // Slow, cinematic flight
    let isFlying = false;

    // --- Animation Loop ---
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Rotate globe slowly
      globe.rotation.y += rotationSpeed;

      // "Fly To" Logic
      if (isFlying && currentStep < flyToSteps) {
        const easingFactor = 0.015; // Smooth ease
        
        camera.position.x += (targetCameraPos.x - camera.position.x) * easingFactor;
        camera.position.y += (targetCameraPos.y - camera.position.y) * easingFactor;
        camera.position.z += (targetCameraPos.z - camera.position.z) * easingFactor;
        
        currentStep++;

        if (currentStep >= flyToSteps) {
          isFlying = false;
          rotationSpeed = 0.0001; // Almost stop
          setTimeout(() => transitionToMap(), 800);
        }
      }

      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };

    animate();
    setGlobeReady(true);

    // --- Trigger Flight to India ---
    setTimeout(() => {
      // UPDATED: Precise coordinates for India Center
      const indiaLat = 22.0; 
      const indiaLng = 79.0;

      const phi = (90 - indiaLat) * (Math.PI / 180);
      const theta = (indiaLng + 270) * (Math.PI / 180);

      const radius = 150;
      
      targetCameraPos = {
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.cos(phi),
        z: radius * Math.sin(phi) * Math.sin(theta),
      };

      // Important: Stop the globe rotation so the target doesn't move away while we fly
      rotationSpeed = 0; 
      // *** CHANGE HERE: Adjusted rotation to center India perfectly ***
      globe.rotation.y = 4.75; 

      isFlying = true;
      currentStep = 0;
    }, 2000);

    const handleResize = () => {
      if (!showMap) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (globeContainerRef.current?.contains(renderer.domElement)) {
        globeContainerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, [loading, showMap]);

  // -----------------------------------------
  // 3. Transition to Map
  // -----------------------------------------
  const transitionToMap = () => {
    if (globeContainerRef.current) {
      globeContainerRef.current.style.opacity = "0";
      globeContainerRef.current.style.transition = "opacity 1.2s ease-out";
    }

    setTimeout(() => {
      setShowMap(true);
      setTimeout(() => initializeLeafletMap(), 200);
    }, 1200);
  };

  // -----------------------------------------
  // 4. Leaflet Map
  // -----------------------------------------
  const initializeLeafletMap = () => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    const loadLeaflet = () => {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (!window.L) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => createMap();
        document.body.appendChild(script);
      } else {
        createMap();
      }
    };

    const createMap = () => {
      if (!window.L || leafletMapRef.current) return;

      const validStations = stations.filter((s) => s.lat && s.lng);

      const centerLat =
        validStations.reduce((sum, s) => sum + s.lat, 0) /
        validStations.length;

      const centerLng =
        validStations.reduce((sum, s) => sum + s.lng, 0) /
        validStations.length;

      const map = window.L.map(mapContainerRef.current).setView(
        [centerLat, centerLng],
        7
      );

      leafletMapRef.current = map;

      window.L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: "© OpenStreetMap",
          maxZoom: 19,
        }
      ).addTo(map);

      validStations.forEach((station) => {
        const statusColor = station.waterStatus?.statusColor?.includes("red")
          ? "#ef4444"
          : station.waterStatus?.statusColor?.includes("yellow")
          ? "#f59e0b"
          : "#10b981";

        const customIcon = window.L.divIcon({
          className: "custom-marker",
          html: `<div style="width:24px;height:24px;background:${statusColor};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = window.L.marker([station.lat, station.lng], {
          icon: customIcon,
        })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: sans-serif;">
              <h3 style="font-weight:700; color:#1e293b; margin:0 0 4px 0;">${station.station_id}</h3>
              <p style="font-size:12px;color:#64748b;margin:0 0 8px 0;">
                ${station.village}, ${station.district}
              </p>
              <div style="display:flex; align-items:center; gap:8px;">
                 <span style="font-weight:bold; font-size:14px; color:#0f172a;">${station.waterStatus?.currentDepth || "N/A"}m</span>
                 <span style="font-size:10px; background:${statusColor}; color:white; padding:2px 6px; border-radius:10px;">${station.waterStatus?.status}</span>
              </div>
            </div>
          `);

        marker.on("click", () => {
          setSelectedStation(station);
          document
            .getElementById("cards-section")
            ?.scrollIntoView({ behavior: "smooth" });
        });

        markersRef.current.push(marker);
      });

      if (validStations.length > 0) {
        const bounds = validStations.map((s) => [s.lat, s.lng]);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    };

    loadLeaflet();
  };

  // -----------------------------------------
  // 5. API Fetch
  // -----------------------------------------
  const fetchStations = async (lng, lat) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/stations/nearest/${lng}/${lat}`);
      const data = await res.json();

      if (data.success) {
        const stationsWithCoords = (data.stations || []).map((station) => ({
          ...station,
          lat: station.location?.latitude || 0,
          lng: station.location?.longitude || 0,
        }));
        setStations(stationsWithCoords);
      } else {
        setError("No stations found");
      }
    } catch (err) {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------
  // 6. UI
  // -----------------------------------------
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-900 to-blue-900 flex items-center justify-center p-4">
        <p className="text-white bg-red-500/20 p-4 rounded-xl border border-red-400">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-900 to-blue-900 flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* GLOBE VIEW */}
      {!showMap && (
        <div className="relative min-h-screen bg-black overflow-hidden">
          {/* Header Overlay */}
          <div className="absolute top-6 w-full flex justify-center z-20">
            <div className="flex items-center gap-6">
                {/* Dashboard Button */}
                <Link href="/function" className="text-sm font-semibold px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl transition-colors flex items-center gap-2 border border-blue-400">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                </Link>

                {/* Title Card */}
                <div className="bg-black/30 backdrop-blur-md rounded-full px-8 py-4 border border-white/10 shadow-2xl">
                    <div className="flex items-center gap-3">
                        <div className="bg-cyan-500/20 p-2 rounded-full">
                           <Droplets className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-white font-bold tracking-wide text-lg">JalShakti</p>
                            <p className="text-cyan-200 text-[10px] uppercase tracking-widest font-semibold">Live Groundwater Monitoring</p>
                        </div>
                    </div>
                </div>
            </div>
          </div>
          <div ref={globeContainerRef} className="absolute inset-0 bg-gradient-to-b from-black via-slate-900 to-black" />
        </div>
      )}

      {/* MAP DASHBOARD VIEW */}
      {showMap && (
        <div className="w-full h-screen flex flex-col bg-slate-100 font-sans">
          
          {/* Navbar */}
          <div className="bg-white px-6 py-4 shadow-sm border-b border-slate-200 z-10">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                  <Droplets className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 leading-tight">National Groundwater Network</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">{stations.length} Active Sensors</p>
                  </div>
                </div>
              </div>

              {/* Dashboard Button in Map View */}
              <Link href="/function" className="text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
              </Link>
            </div>
          </div>

          {/* Map Container */}
          <div ref={mapContainerRef} className="flex-1 w-full shadow-inner relative" style={{ minHeight: "450px" }}>
            {/* Legend Overlay */}
            <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg border border-slate-200 text-xs z-[400] hidden md:block">
              <div className="font-bold mb-2 text-slate-700">Water Level Status</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Safe</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Semi-Critical</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> Critical</div>
              </div>
            </div>
          </div>

          {/* STATION CARDS SECTION */}
          <div
            id="cards-section"
            className="bg-slate-100 px-4 py-8 overflow-y-auto"
            style={{ maxHeight: "55vh" }}
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                 <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <Activity className="w-5 h-5 text-blue-600" />
                   Station Analytics
                 </h2>
                 <span className="text-sm text-slate-500">Showing nearest stations</span>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                {stations.map((station) => {
                  const ws = station.waterStatus || {};
                  
                  // Determine Styles based on status
                  const isCritical = ws.statusColor?.includes("red");
                  const isWarning = ws.statusColor?.includes("yellow");
                  
                  const cardBorderColor = isCritical ? "border-l-red-500" : isWarning ? "border-l-amber-500" : "border-l-emerald-500";
                  const statusBg = isCritical ? "bg-red-50 text-red-700 border-red-100" : isWarning ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-emerald-50 text-emerald-700 border-emerald-100";
                  const depthColor = isCritical ? "text-red-700" : isWarning ? "text-amber-700" : "text-slate-800";
                  const isSelected = selectedStation?.station_id === station.station_id;

                  return (
                    <div
                      key={station._id}
                      onClick={() => {
                        setSelectedStation(station);
                        if (leafletMapRef.current && station.lat && station.lng) {
                          leafletMapRef.current.setView([station.lat, station.lng], 12, { animate: true });
                        }
                      }}
                      className={`
                        bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group
                        border border-slate-200 border-l-4 ${cardBorderColor}
                        ${isSelected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
                      `}
                    >
                      {/* Card Header */}
                      <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                             <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">ID: {station.station_id}</span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                            {station.village || "Unknown Village"}
                          </h3>
                          <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {station.district}, {station.state}
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBg}`}>
                          {ws.status || "No Data"}
                        </div>
                      </div>

                      {/* Card Body - Main Metrics */}
                      <div className="p-5 grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-slate-400 text-xs font-medium uppercase mb-1 flex items-center gap-1">
                            <ArrowDown className="w-3 h-3" /> Current Depth
                          </p>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-3xl font-bold ${depthColor}`}>
                              {ws.currentDepth !== null ? ws.currentDepth : "--"}
                            </span>
                            <span className="text-sm text-slate-500 font-medium">m</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                              Last updated: {ws.referencePeriod || "N/A"}
                          </p>
                        </div>

                        {/* Secondary Metrics Mini-Grid */}
                        <div className="col-span-2 sm:col-span-1 grid grid-rows-2 gap-2">
                          <div className="bg-slate-50 rounded-lg p-2 flex flex-col justify-center">
                             <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-semibold uppercase">
                                <Mountain className="w-3 h-3" /> Elevation
                             </div>
                             <div className="text-sm font-bold text-slate-700 mt-0.5">
                                {station.elevation_meters? `${station.elevation_meters} m` : "N/A"}
                             </div>
                          </div>
                          
                          <div className="bg-slate-50 rounded-lg p-2 flex flex-col justify-center">
                             <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-semibold uppercase">
                                <Layers className="w-3 h-3" /> Aquifer
                             </div>
                             <div className="text-sm font-bold text-slate-700 mt-0.5 truncate" title={station.aquifer_type}>
                                {station.aquifer_type ? station.aquifer_type.replace(/_/g, " ") : "Unknown"}
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center rounded-b-xl">
                         <div className="flex items-center gap-1 text-xs text-slate-500">
                            <TrendingDown className="w-3 h-3 text-slate-400" />
                            <span>Pre-Monsoon Data</span>
                         </div>
                         <button className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                            View Analysis &rarr;
                         </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}