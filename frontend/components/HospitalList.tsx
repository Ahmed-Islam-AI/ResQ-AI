"use client";

import { Building2, Clock, MapPin } from "lucide-react";

export default function HospitalList() {
    const hospitals = [
        { name: "St. Mary's General", distance: "2.4 mi", time: "8 min", wait: "15m", status: "Open" },
        { name: "County Trauma Center", distance: "5.1 mi", time: "12 min", wait: "45m", status: "Busy" },
        { name: "Westside Clinic", distance: "1.8 mi", time: "5 min", wait: "10m", status: "Open" },
    ];

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg h-full">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-green-400">
                    <Building2 className="w-5 h-5" />
                    HOSPITAL NETWORK
                </h2>
            </div>

            <div className="space-y-3">
                {hospitals.map((h, i) => (
                    <div key={i} className="bg-gray-950 p-3 rounded-lg border border-gray-800 flex items-center justify-between">
                        <div>
                            <div className="font-bold text-sm text-white">{h.name}</div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {h.distance}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {h.time}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`text-xs font-bold px-2 py-1 rounded ${h.status === 'Busy' ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>
                                Wait: {h.wait}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
