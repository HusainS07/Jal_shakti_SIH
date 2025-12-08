"use client";

import { useState, useEffect, useRef } from "react";
import { Droplets, MapPin, Layers, Loader2, Globe as GlobeIcon } from "lucide-react";
import * as THREE from "three";

export default function StationsGlobePage() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [hoveredStation, setHoveredStation] = useState(null);
  const containerRef = useRef();
  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const globeRef = useRef();
  const pinsRef = useRef([]);
  const animationFrameRef = useRef();

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

  useEffect(() => {
    if (!containerRef.current || loading) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 250;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create globe
    const geometry = new THREE.SphereGeometry(80, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = "anonymous";
    
    const material = new THREE.MeshPhongMaterial({
      map: textureLoader.load("//unpkg.com/three-globe/example/img/earth-night.jpg"),
    });
    
    const globe = new THREE.Mesh(geometry, material);
    globeRef.current = globe;
    scene.add(globe);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Auto-rotation
    let rotationSpeed = 0.002;
    let targetCameraPos = { x: 0, y: 0, z: 250 };
    let currentStep = 0;
    const flyToSteps = 180;
    let isFlying = false;

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Auto-rotate globe
      globe.rotation.y += rotationSpeed;

      // Smooth camera movement for fly-to
      if (isFlying && currentStep < flyToSteps) {
        camera.position.x += (targetCameraPos.x - camera.position.x) * 0.05;
        camera.position.y += (targetCameraPos.y - camera.position.y) * 0.05;
        camera.position.z += (targetCameraPos.z - camera.position.z) * 0.05;
        currentStep++;
        
        if (currentStep >= flyToSteps) {
          isFlying = false;
          rotationSpeed = 0.001;
        }
      }

      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };

    animate();

    // Fly to India after 2 seconds
    setTimeout(() => {
      const indiaLat = 20.5937;
      const indiaLng = 78.9629;
      
      // Convert lat/lng to 3D coordinates
      const phi = (90 - indiaLat) * (Math.PI / 180);
      const theta = (indiaLng + 180) * (Math.PI / 180);
      
      targetCameraPos = {
        x: -120 * Math.sin(phi) * Math.cos(theta),
        y: 120 * Math.cos(phi),
        z: 120 * Math.sin(phi) * Math.sin(theta)
      };
      
      isFlying = true;
      currentStep = 0;
    }, 2000);

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [loading]);

  // Add pins after globe is created
  useEffect(() => {
    if (!sceneRef.current || !globeRef.current || stations.length === 0 || loading) return;

    // Clear existing pins
    pinsRef.current.forEach(pin => sceneRef.current.remove(pin));
    pinsRef.current = [];

    // Add new pins after delay
    setTimeout(() => {
      stations.forEach((station) => {
        if (!station.lat || !station.lng) return;

        const lat = station.lat;
        const lng = station.lng;
        const radius = 82; // Slightly above globe surface

        // Convert lat/lng to 3D coordinates
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);

        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        // Create pin
        const pinGeometry = new THREE.SphereGeometry(1.5, 16, 16);
        const pinMaterial = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const pin = new THREE.Mesh(pinGeometry, pinMaterial);
        pin.position.set(x, y, z);
        pin.userData = station;

        sceneRef.current.add(pin);
        pinsRef.current.push(pin);
      });
    }, 5000);
  }, [stations, loading]);

  // Handle mouse interactions
  useEffect(() => {
    if (!containerRef.current || !rendererRef.current) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(pinsRef.current);

      if (intersects.length > 0) {
        const hoveredPin = intersects[0].object;
        setHoveredStation(hoveredPin.userData);
        document.body.style.cursor = "pointer";
      } else {
        setHoveredStation(null);
        document.body.style.cursor = "default";
      }
    };

    const handleClick = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(pinsRef.current);

      if (intersects.length > 0) {
        const clickedPin = intersects[0].object;
        setSelectedStation(clickedPin.userData);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick);
      document.body.style.cursor = "default";
    };
  }, []);

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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 text-center max-w-md border border-white/20">
          <p className="text-red-400 font-bold text-xl mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-hidden">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 p-6 pointer-events-none">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <Droplets className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Groundwater Monitoring Stations
                </h1>
                <p className="text-sm text-blue-200">
                  {userLocation
                    ? `Near ${userLocation.latitude.toFixed(2)}°N, ${userLocation.longitude.toFixed(2)}°E`
                    : "Locating..."}
                </p>
              </div>
            </div>
            {!loading && (
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{stations.length}</p>
                <p className="text-sm text-blue-200">Stations Found</p>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-xl text-white">Loading groundwater data...</p>
          </div>
        </div>
      )}

      {/* Globe Container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Hover Tooltip */}
      {hoveredStation && !selectedStation && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className="bg-black/90 text-white px-4 py-3 rounded-lg shadow-2xl max-w-xs">
            <div className="font-bold text-sm mb-1">{hoveredStation.station_id}</div>
            <div className="text-xs text-blue-300">
              {hoveredStation.village}, {hoveredStation.district}
            </div>
            <div className="text-xs mt-2">
              Water Depth: <strong>{hoveredStation.waterStatus?.currentDepth || "N/A"} m</strong>
            </div>
            <div className="text-xs text-yellow-300 mt-1">Click for details</div>
          </div>
        </div>
      )}

      {/* Station Details Panel */}
      {selectedStation && (
        <div className="absolute bottom-6 left-6 right-6 z-20 max-w-2xl mx-auto pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/30">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {selectedStation.station_id}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {selectedStation.village}, {selectedStation.district},{" "}
                    {selectedStation.state}
                  </span>
                </div>
              </div>
              <div
                className={`w-16 h-16 ${
                  selectedStation.waterStatus?.statusColor || "bg-gray-400"
                } rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg`}
              >
                {selectedStation.waterStatus?.statusShort || "?"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-600 uppercase tracking-wider">
                  Current Depth
                </p>
                <p className="text-3xl font-black text-blue-700 mt-1">
                  {selectedStation.waterStatus?.currentDepth !== null
                    ? `${selectedStation.waterStatus?.currentDepth} m`
                    : "—"}
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-600 uppercase tracking-wider">
                  Distance
                </p>
                <p className="text-3xl font-black text-purple-700 mt-1">
                  {selectedStation.distance_km} km
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 mb-4">
              <Layers className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">Aquifer:</span>
              <span className="text-sm font-bold text-blue-700">
                {selectedStation.aquifer_type?.replace(/_/g, " ") || "Unknown"}
              </span>
            </div>

            <div className="text-center mb-4">
              <p className="text-lg font-semibold text-gray-800">
                Status:{" "}
                <span
                  className={`${
                    selectedStation.waterStatus?.statusColor?.includes("red")
                      ? "text-red-600"
                      : selectedStation.waterStatus?.statusColor?.includes(
                          "yellow"
                        )
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  {selectedStation.waterStatus?.status || "NO DATA"}
                </span>
              </p>
            </div>

            <button
              onClick={() => setSelectedStation(null)}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!selectedStation && !loading && stations.length > 0 && (
        <div className="absolute bottom-6 left-6 z-20 pointer-events-none">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <p className="text-white text-sm font-medium">
              🔴 Click on red pins to view station details
            </p>
          </div>
        </div>
      )}
    </div>
  );
}