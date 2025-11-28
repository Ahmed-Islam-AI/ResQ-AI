"use client";

import { ReactNode } from "react";

interface DashboardLayoutProps {
    map: ReactNode;
    vitals: ReactNode;
    triage: ReactNode;
    hospitalCapacity: ReactNode;
    missionLog: ReactNode;
    inventory: ReactNode;
    weather: ReactNode;
    quickActions: ReactNode;
    teamStatus: ReactNode;
    systemStatus: ReactNode;
    liveFeed: ReactNode;
    activeAlerts: ReactNode;
    resourceChart: ReactNode;
    hospitalList: ReactNode;
    voiceLog: ReactNode;
    nearbyUnits: ReactNode;
}

export default function DashboardLayout({
    map,
    vitals,
    triage,
    hospitalCapacity,
    missionLog,
    inventory,
    weather,
    quickActions,
    teamStatus,
    systemStatus,
    liveFeed,
    activeAlerts,
    resourceChart,
    hospitalList,
    voiceLog,
    nearbyUnits,
}: DashboardLayoutProps) {
    return (
        <div className="min-h-screen w-full bg-gray-950 text-white flex flex-col">
            <header className="flex-none flex justify-between items-center p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-900/50">
                        R
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">ResQ-AI <span className="text-blue-500 font-light">COMMAND</span></h1>
                        <p className="text-xs text-gray-500 uppercase tracking-widest">Real-time EMS Triage System</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-sm font-bold text-gray-300">UNIT: MEDIC-1</div>
                        <div className="text-xs text-green-500 flex items-center justify-end gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            ONLINE
                        </div>
                    </div>
                </div>
            </header>

            {/* Live Ticker Feed */}
            <div className="sticky top-[73px] z-40">
                {liveFeed}
            </div>

            <div className="flex-1 p-4 space-y-4">
                {/* Main Content Area - Responsive Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-6">

                    {/* Left Main Column */}
                    <div className="xl:col-span-8 flex flex-col gap-6">
                        {/* Map Section */}
                        <div className="w-full aspect-[16/9] min-h-[400px] lg:min-h-[500px] relative rounded-2xl overflow-hidden border border-gray-800 shadow-2xl ring-1 ring-gray-700/50 bg-gray-900">
                            {map}
                        </div>

                        {/* Row 1: Triage & Inventory */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="h-[350px]">{triage}</div>
                            <div className="h-[350px]">{inventory}</div>
                        </div>

                        {/* Row 2: Operations & Capacity */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="h-[350px]">{nearbyUnits}</div>
                            <div className="h-[350px]">{hospitalCapacity}</div>
                        </div>
                    </div>

                    {/* Right Sidebar: Controls & Status */}
                    <div className="xl:col-span-4 flex flex-col gap-4 h-full">
                        {/* Critical Vitals & Alerts */}
                        <div className="space-y-4">
                            <div>{vitals}</div>
                            <div>{activeAlerts}</div>
                        </div>

                        {/* Status Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="h-[220px]">{systemStatus}</div>
                            <div className="h-[220px]">{resourceChart}</div>
                        </div>

                        {/* AI & Tools */}
                        <div className="space-y-4 flex-1 flex flex-col">
                            <div className="flex-1 min-h-[300px]">{voiceLog}</div>
                            <div>{quickActions}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
