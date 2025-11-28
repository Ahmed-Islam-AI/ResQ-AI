"use client";

import { Navigation, MapPin, Radio } from "lucide-react";

export default function NearbyUnits() {
    const units = [
        { id: "MEDIC-2", status: "Available", distance: "0.8 mi", eta: "2 min" },
        { id: "MEDIC-4", status: "Busy", distance: "2.4 mi", eta: "8 min" },
        { id: "ENG-12", status: "En Route", distance: "1.2 mi", eta: "4 min" },
        { id: "SUP-1", status: "Available", distance: "3.5 mi", eta: "12 min" },
    ];

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-cyan-400">
                    <Navigation className="w-5 h-5" />
                    NEARBY UNITS
                </h2>
                <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                    <span className="text-[10px] font-mono text-cyan-500">LIVE</span>
                </div>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {units.map((unit) => (
                    <div
                        key={unit.id}
                        className="p-3 rounded-lg border border-gray-800 bg-gray-950/50 flex items-center justify-between group hover:border-cyan-900/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${unit.status === 'Available' ? 'bg-green-500/10 text-green-500' :
                                    unit.status === 'Busy' ? 'bg-red-500/10 text-red-500' :
                                        'bg-yellow-500/10 text-yellow-500'
                                }`}>
                                <Radio className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-gray-200">{unit.id}</div>
                                <div className={`text-[10px] font-mono uppercase ${unit.status === 'Available' ? 'text-green-500' :
                                        unit.status === 'Busy' ? 'text-red-500' :
                                            'text-yellow-500'
                                    }`}>
                                    {unit.status}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-mono font-bold text-cyan-400">{unit.eta}</div>
                            <div className="text-[10px] text-gray-500 flex items-center justify-end gap-1">
                                <MapPin className="w-3 h-3" />
                                {unit.distance}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
