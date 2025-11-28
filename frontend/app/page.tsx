"use client";

import dynamic from "next/dynamic";
import DashboardLayout from "@/components/DashboardLayout";
import VitalsMonitor from "@/components/VitalsMonitor";
import TriageAssistant from "@/components/TriageAssistant";
import HospitalCapacity from "@/components/HospitalCapacity";
import MissionLog from "@/components/MissionLog";
import ResourceInventory, { Resource } from "@/components/ResourceInventory";
import WeatherWidget from "@/components/WeatherWidget";
import QuickActions from "@/components/QuickActions";
import TeamStatus from "@/components/TeamStatus";
import SystemStatus from "@/components/SystemStatus";
import LiveFeed from "@/components/LiveFeed";
import ActiveAlerts from "@/components/ActiveAlerts";
import ResourceChart from "@/components/ResourceChart";
import { useEffect, useState } from "react";

// Dynamically import map to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-900 animate-pulse rounded-lg flex items-center justify-center text-gray-500">
      Loading Map Data...
    </div>
  ),
});

import HospitalList from "@/components/HospitalList";
import VoiceCommandLog from "@/components/VoiceCommandLog";
import NearbyUnits from "@/components/NearbyUnits";

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("");

  const [resources, setResources] = useState<Resource[]>([
    { id: '1', name: 'Oxygen Tank (Main)', count: 85, max: 100, unit: '%', critical: false },
    { id: '2', name: 'Portable O2', count: 40, max: 100, unit: '%', critical: true },
    { id: '3', name: 'Epinephrine (1:1000)', count: 4, max: 10, unit: 'amps', critical: true },
    { id: '4', name: 'IV Kits (18G)', count: 12, max: 20, unit: 'kits', critical: false },
    { id: '5', name: 'Trauma Dressings', count: 8, max: 15, unit: 'packs', critical: false },
    { id: '6', name: 'Naloxone (Narcan)', count: 2, max: 6, unit: 'doses', critical: true },
  ]);

  const handleResourceUpdate = (id: string, delta: number) => {
    setResources(prev => prev.map(r => {
      if (r.id === id) {
        const newCount = Math.max(0, Math.min(r.max, r.count + delta));
        return { ...r, count: newCount };
      }
      return r;
    }));
  };

  useEffect(() => {
    // Create or restore a session
    const initSession = async () => {
      const sid = "session-" + Math.random().toString(36).substring(7);
      setSessionId(sid);
      try {
        await fetch(`http://localhost:8000/session/create?session_id=${sid}`, {
          method: "POST"
        });
      } catch (e) {
        console.error("Failed to init session", e);
      }
    };
    initSession();
  }, []);

  return (
    <main className="min-h-screen bg-black">
      <DashboardLayout
        map={<MapComponent />}
        vitals={<VitalsMonitor sessionId={sessionId} />}
        triage={<TriageAssistant sessionId={sessionId} />}
        hospitalCapacity={<HospitalCapacity />}
        missionLog={<MissionLog />}
        inventory={<ResourceInventory resources={resources} onUpdate={handleResourceUpdate} />}
        weather={<WeatherWidget />}
        quickActions={<QuickActions />}
        teamStatus={<TeamStatus />}
        systemStatus={<SystemStatus />}
        liveFeed={<LiveFeed />}
        activeAlerts={<ActiveAlerts />}
        resourceChart={<ResourceChart resources={resources} />}
        hospitalList={<HospitalList />}
        voiceLog={<VoiceCommandLog />}
        nearbyUnits={<NearbyUnits />}
      />
    </main>
  );
}