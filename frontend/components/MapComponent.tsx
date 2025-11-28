"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";

// Fix for default marker icon in Next.js
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Incident {
  id: string;
  type: string;
  status: string;
  latitude: number;
  longitude: number;
  address: string;
  unit: string;
}

// Helper component to recenter map when location changes
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 14); // Zoom level 14 for better street view
  }, [lat, lng, map]);
  return null;
}

export default function MapComponent() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [otherUnits, setOtherUnits] = useState<{ [key: string]: { latitude: number; longitude: number } }>({});
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [unitId] = useState(`unit-${Math.floor(Math.random() * 1000)}`); // Random unit ID for demo
  const [activeRoute, setActiveRoute] = useState<[number, number][] | null>(null);

  useEffect(() => {
    // 1. Initialize WebSocket
    const ws = new WebSocket(`ws://localhost:8000/ws/location/${unitId}`);

    ws.onopen = () => {
      console.log("Connected to location server");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "location_update") {
        // Filter out my own unit ID from other units
        const others = { ...data.units };
        delete others[unitId];
        setOtherUnits(others);
      }
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [unitId]);

  useEffect(() => {
    // 2. Watch Geolocation & Fetch Local Incidents & Hospitals
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser.");
      // Fallback to default location (NY) for demo
      setMyLocation({ lat: 40.73, lng: -73.99 });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log("Got location:", latitude, longitude);

        // Only fetch incidents once when we first get location or if we moved significantly (simplified: fetch on first fix)
        if (!myLocation) {
          try {
            // Fetch Incidents
            const resIncidents = await fetch(`http://localhost:8000/incidents?latitude=${latitude}&longitude=${longitude}`);
            const dataIncidents = await resIncidents.json();
            setIncidents(dataIncidents.incidents);

            // Fetch Hospitals
            const resHospitals = await fetch(`http://localhost:8000/hospitals`);
            const dataHospitals = await resHospitals.json();
            // Mock locations for hospitals relative to user for demo purposes
            const hospitalsWithLoc = dataHospitals.hospitals.map((h: any, i: number) => ({
              ...h,
              latitude: latitude + (Math.random() * 0.04 - 0.02),
              longitude: longitude + (Math.random() * 0.04 - 0.02)
            }));
            setHospitals(hospitalsWithLoc);

          } catch (error) {
            console.error("Failed to fetch data:", error);
          }
        }

        setMyLocation({ lat: latitude, lng: longitude });

        // Send update to server
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            latitude,
            longitude
          }));
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        // Fallback to default location (NY) for demo if permission denied or error
        if (!myLocation) {
          setMyLocation({ lat: 40.73, lng: -73.99 });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [socket, myLocation]);

  const handleDispatch = async (target: { latitude: number; longitude: number }) => {
    console.log("Dispatching to:", target);

    // Use myLocation or fallback
    const startLoc = myLocation || { lat: 40.73, lng: -73.99 };

    // Use OSRM for real road routing
    try {
      const start = `${startLoc.lng},${startLoc.lat}`;
      const end = `${target.longitude},${target.latitude}`;
      const url = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const coordinates = data.routes[0].geometry.coordinates;
        // OSRM returns [lng, lat], Leaflet needs [lat, lng]
        const routeLatLngs = coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
        setActiveRoute(routeLatLngs);
      } else {
        // Fallback to straight line if no route found
        console.warn("No route found, drawing straight line");
        setActiveRoute([
          [startLoc.lat, startLoc.lng],
          [target.latitude, target.longitude]
        ]);
      }
    } catch (error) {
      console.error("Routing failed:", error);
      // Fallback to straight line
      setActiveRoute([
        [startLoc.lat, startLoc.lng],
        [target.latitude, target.longitude]
      ]);
    }
  };

  // Custom icon for my ambulance - White Dot with Pulse effect
  const myIcon = L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background-color: #ffffff; width: 15px; height: 15px; border-radius: 50%; border: 2px solid #3b82f6; box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.4);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  });

  // Icon for other units - Standard Ambulance
  const otherUnitIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/263/263058.png",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
    className: "grayscale opacity-75"
  });

  // Hospital Icon
  const hospitalIcon = L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 4px; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-family: sans-serif;">H</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-gray-800 shadow-lg relative z-0">
      <MapContainer
        key="resq-map-container"
        center={[40.73, -73.99]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Recenter map when location changes */}
        {myLocation && <RecenterMap lat={myLocation.lat} lng={myLocation.lng} />}

        {/* My Location Marker */}
        {myLocation && (
          <Marker position={[myLocation.lat, myLocation.lng]} icon={myIcon}>
            <Popup>
              <div className="font-bold text-blue-600">My Unit ({unitId})</div>
              <div className="text-xs">Live Location</div>
            </Popup>
          </Marker>
        )}

        {/* Other Units Markers */}
        {Object.entries(otherUnits).map(([id, loc]) => (
          <Marker key={id} position={[loc.latitude, loc.longitude]} icon={otherUnitIcon}>
            <Popup className="custom-popup">
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center justify-between mb-2 border-b border-gray-200 pb-2">
                  <div className="font-bold text-gray-800 text-lg">{id}</div>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">ACTIVE</span>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-gray-600 flex items-center gap-1">
                    <span className="font-semibold">Status:</span> Available
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-1">
                    <span className="font-semibold">Location:</span> {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    onClick={() => {
                      console.log(`Calling unit ${id}...`);
                      alert(`Calling unit ${id}...`);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 px-3 rounded flex items-center justify-center gap-1 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                    CALL
                  </button>
                  <button
                    onClick={() => handleDispatch({ latitude: loc.latitude, longitude: loc.longitude })}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs py-2 px-3 rounded flex items-center justify-center gap-1 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    DISPATCH
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Incident Markers */}
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            position={[incident.latitude, incident.longitude]}
            icon={icon}
          >
            <Popup className="text-gray-900">
              <div className="font-bold">{incident.type}</div>
              <div className="text-sm">{incident.address}</div>
              <div className="text-xs mt-1 font-semibold text-blue-600">
                Unit: {incident.unit}
              </div>
              <button
                onClick={() => handleDispatch(incident)}
                className="mt-2 w-full bg-blue-600 text-white text-xs py-1 px-2 rounded hover:bg-blue-700"
              >
                DISPATCH
              </button>
            </Popup>
          </Marker>
        ))}

        {/* Hospital Markers */}
        {hospitals.map((hospital) => (
          <Marker
            key={hospital.id}
            position={[hospital.latitude, hospital.longitude]}
            icon={hospitalIcon}
          >
            <Popup className="text-gray-900">
              <div className="font-bold text-red-600">{hospital.name}</div>
              <div className="text-xs font-semibold">{hospital.specialties.join(", ")}</div>
              <div className="text-xs mt-1">
                Status: <span className={hospital.status === 'Normal' ? 'text-green-600' : 'text-red-600'}>{hospital.status}</span>
              </div>
              <div className="text-xs">Beds: {hospital.available_beds}/{hospital.total_beds}</div>
              <button
                onClick={() => handleDispatch(hospital)}
                className="mt-2 w-full bg-green-600 text-white text-xs py-1 px-2 rounded hover:bg-green-700"
              >
                ROUTE TO HOSPITAL
              </button>
            </Popup>
          </Marker>
        ))}

        {activeRoute && (
          <Polyline
            positions={activeRoute}
            color="#3b82f6"
            weight={5}
            opacity={0.8}
          />
        )}
      </MapContainer>
    </div>
  );
}
