"use client";

import { Activity, Cpu, Shield, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

export default function SystemStatus() {
    const [cpuLoad, setCpuLoad] = useState(12);
    const [aiLatency, setAiLatency] = useState(45);
    const [encryption, setEncryption] = useState("AES-256");

    useEffect(() => {
        const interval = setInterval(() => {
            setCpuLoad(prev => Math.min(100, Math.max(5, prev + (Math.random() * 10 - 5))));
            setAiLatency(prev => Math.min(200, Math.max(20, prev + (Math.random() * 20 - 10))));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold flex items-center gap-2 text-blue-400">
                    <Activity className="w-4 h-4" />
                    DIAGNOSTICS
                </h2>
                <span className="text-[10px] font-mono text-green-500 animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    OPTIMAL
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1">
                <div className="bg-gray-950/50 p-2.5 rounded-lg border border-gray-800/50 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-gray-400 text-[10px] mb-1">
                        <Cpu className="w-3 h-3" /> CPU
                    </div>
                    <div>
                        <div className="text-lg font-mono font-bold text-white leading-none mb-1">{cpuLoad.toFixed(0)}%</div>
                        <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                            <div
                                className="bg-blue-500 h-full transition-all duration-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]"
                                style={{ width: `${cpuLoad}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-950/50 p-2.5 rounded-lg border border-gray-800/50 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-gray-400 text-[10px] mb-1">
                        <Wifi className="w-3 h-3" /> LATENCY
                    </div>
                    <div>
                        <div className="text-lg font-mono font-bold text-white leading-none mb-1">{aiLatency.toFixed(0)}ms</div>
                        <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${aiLatency < 100 ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-yellow-500'}`}
                                style={{ width: `${(aiLatency / 200) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-950/50 p-2.5 rounded-lg border border-gray-800/50 col-span-2 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 text-gray-400 text-[10px]">
                            <Shield className="w-3 h-3" /> SECURITY
                        </div>
                        <div className="text-[10px] font-mono text-blue-400">{encryption}</div>
                    </div>
                    <div className="flex gap-0.5 h-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                            <div key={i} className="flex-1 bg-blue-900/20 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500/80 rounded-full animate-pulse" style={{ animationDelay: `${i * 50}ms` }}></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
