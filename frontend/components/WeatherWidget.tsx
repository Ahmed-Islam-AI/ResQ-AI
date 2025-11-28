"use client";

import { CloudRain, Wind, Droplets, Sun } from "lucide-react";

export default function WeatherWidget() {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Sun className="w-5 h-5 text-yellow-500" />
                Environmental Conditions
            </h2>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-gray-400">Temperature</div>
                        <div className="text-xl font-bold text-white">72°F</div>
                    </div>
                    <Sun className="w-8 h-8 text-yellow-500 opacity-50" />
                </div>

                <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-gray-400">Precipitation</div>
                        <div className="text-xl font-bold text-blue-400">0%</div>
                    </div>
                    <CloudRain className="w-8 h-8 text-blue-500 opacity-50" />
                </div>

                <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-gray-400">Wind Speed</div>
                        <div className="text-xl font-bold text-gray-200">12 mph</div>
                    </div>
                    <Wind className="w-8 h-8 text-gray-500 opacity-50" />
                </div>

                <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-gray-400">Humidity</div>
                        <div className="text-xl font-bold text-cyan-400">45%</div>
                    </div>
                    <Droplets className="w-8 h-8 text-cyan-500 opacity-50" />
                </div>
            </div>

            <div className="mt-3 text-xs text-center text-green-500 bg-green-900/20 py-1 rounded border border-green-900/50">
                Road Conditions: DRY & CLEAR
            </div>
        </div>
    );
}
