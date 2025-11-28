"use client";

import { PieChart } from "lucide-react";
import { Resource } from "./ResourceInventory";

interface ResourceChartProps {
    resources: Resource[];
}

export default function ResourceChart({ resources }: ResourceChartProps) {
    // Calculate efficiency based on resource levels
    const totalMax = resources.reduce((acc, r) => acc + r.max, 0);
    const totalCount = resources.reduce((acc, r) => acc + r.count, 0);
    const efficiency = totalMax > 0 ? Math.round((totalCount / totalMax) * 100) : 0;

    // Calculate segment percentages for visualization
    // Medical: based on critical items
    const criticalItems = resources.filter(r => r.critical);
    const criticalMax = criticalItems.reduce((acc, r) => acc + r.max, 0);
    const criticalCount = criticalItems.reduce((acc, r) => acc + r.count, 0);
    const medEfficiency = criticalMax > 0 ? (criticalCount / criticalMax) * 100 : 0;

    // For demo purposes, we'll map these to the chart segments
    // Blue (Meds) = Medical Efficiency
    // Purple (Fuel) = Fixed for now or random fluctuation
    // Green (Power) = Fixed for now

    const blueStroke = (medEfficiency / 100) * 40; // Max 40

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold flex items-center gap-2 text-purple-400">
                    <PieChart className="w-4 h-4" />
                    RESOURCES
                </h2>
                <span className="text-[10px] font-mono text-gray-500">LIVE</span>
            </div>

            <div className="flex items-center justify-center flex-1 relative py-2">
                <div className="relative w-28 h-28 flex items-center justify-center">
                    {/* Background Track */}
                    <div className="absolute inset-0 rounded-full border-[8px] border-gray-800"></div>

                    <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
                        {/* Background Circle */}
                        <path className="text-gray-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />

                        {/* Blue Segment (Medical) - Dynamic */}
                        <path className="text-blue-600 transition-all duration-500 ease-out" strokeDasharray={`${blueStroke}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />

                        {/* Purple Segment (Fuel) - 30% (starts at 40%) */}
                        <path className="text-purple-500" strokeDasharray="30, 100" strokeDashoffset="-40" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />

                        {/* Green Segment (Power) - 15% (starts at 70%) */}
                        <path className="text-green-500" strokeDasharray="15, 100" strokeDashoffset="-70" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-white drop-shadow-md">{efficiency}%</span>
                        <span className="text-[9px] text-gray-400 uppercase tracking-widest font-medium">Efficiency</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-1 mt-2 text-center">
                <div className="bg-gray-950/50 rounded p-1">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mx-auto mb-1 shadow-[0_0_5px_rgba(37,99,235,0.5)]"></div>
                    <div className="text-[10px] text-gray-400 font-medium">Meds</div>
                </div>
                <div className="bg-gray-950/50 rounded p-1">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mx-auto mb-1 shadow-[0_0_5px_rgba(168,85,247,0.5)]"></div>
                    <div className="text-[10px] text-gray-400 font-medium">Fuel</div>
                </div>
                <div className="bg-gray-950/50 rounded p-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mx-auto mb-1 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                    <div className="text-[10px] text-gray-400 font-medium">Pwr</div>
                </div>
            </div>
        </div>
    );
}
