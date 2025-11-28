"use client";

import { AlertTriangle, Bell, Info } from "lucide-react";

export default function ActiveAlerts() {
    const alerts = [
        { id: 1, type: "critical", message: "OXYGEN LEVELS CRITICAL (Main Tank < 10%)", time: "10:42" },
        { id: 2, type: "warning", message: "High Traffic Congestion on Route 4", time: "10:38" },
        { id: 3, type: "info", message: "Shift Change in 45 minutes", time: "10:15" },
        { id: 4, type: "warning", message: "Weather Alert: Heavy Rain Expected", time: "09:55" },
    ];

    const playAlert = async (text: string) => {
        try {
            const res = await fetch("http://localhost:8000/speak", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });

            if (!res.ok) throw new Error("Failed to generate audio");

            const data = await res.json();
            if (data.audio_base64) {
                const audio = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
                audio.play();
            }
        } catch (error) {
            console.error("Audio playback failed:", error);
            alert("Could not play audio. Check API key.");
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-red-400">
                    <Bell className="w-5 h-5 animate-pulse" />
                    ACTIVE ALERTS
                </h2>
                <span className="bg-red-900/30 text-red-400 text-xs px-2 py-1 rounded-full border border-red-800/50 font-mono">
                    {alerts.length} CRITICAL
                </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {alerts.map((alert) => (
                    <div
                        key={alert.id}
                        className={`p-3 rounded-lg border backdrop-blur-sm transition-all hover:scale-[1.02] cursor-default flex items-start gap-3 ${alert.type === 'critical' ? 'bg-red-950/40 border-red-900/50 text-red-100 shadow-[0_0_15px_rgba(220,38,38,0.1)]' :
                                alert.type === 'warning' ? 'bg-amber-950/40 border-amber-900/50 text-amber-100' :
                                    'bg-blue-950/40 border-blue-900/50 text-blue-100'
                            }`}
                    >
                        <div className={`mt-1 p-1 rounded-full ${alert.type === 'critical' ? 'bg-red-500/10' :
                                alert.type === 'warning' ? 'bg-amber-500/10' :
                                    'bg-blue-500/10'
                            }`}>
                            {alert.type === 'critical' ? <AlertTriangle className="w-4 h-4 text-red-500" /> :
                                alert.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
                                    <Info className="w-4 h-4 text-blue-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold leading-tight">{alert.message}</div>
                            <div className="text-xs opacity-60 mt-1 font-mono">{alert.time}</div>
                        </div>
                        <button
                            onClick={() => playAlert(alert.message)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                            title="Read Alert"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-volume-2 opacity-50 group-hover:opacity-100 transition-opacity"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
