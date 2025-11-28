"use client";

import { Users, MapPin, Battery } from "lucide-react";

export default function TeamStatus() {
    const units = [
        { id: "MEDIC-2", status: "Available", dist: "1.2 mi", battery: 90 },
        { id: "MEDIC-3", status: "Busy", dist: "3.5 mi", battery: 65 },
        { id: "ENG-4", status: "En Route", dist: "0.8 mi", battery: 100 },
        { id: "SUP-1", status: "Available", dist: "5.0 mi", battery: 82 },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Available": return "text-green-400";
            case "Busy": return "text-red-400";
            case "En Route": return "text-yellow-400";
            default: return "text-gray-400";
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 h-full">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Nearby Units
            </h2>

            <div className="space-y-2">
                {units.map((unit) => (
                    <div key={unit.id} className="flex items-center justify-between p-2 bg-gray-800 rounded border border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${unit.status === 'Available' ? 'bg-green-500' : unit.status === 'Busy' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                            <div>
                                <div className="font-bold text-sm text-white">{unit.id}</div>
                                <div className={`text-xs ${getStatusColor(unit.status)}`}>{unit.status}</div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                <MapPin className="w-3 h-3" />
                                {unit.dist}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <Battery className="w-3 h-3" />
                                {unit.battery}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
