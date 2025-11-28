"use client";

import { Shield, Flame, Biohazard, Phone, Radio } from "lucide-react";

export default function QuickActions() {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Radio className="w-5 h-5 text-red-500" />
                Emergency Support
            </h2>

            <div className="grid grid-cols-2 gap-3">
                <button className="flex flex-col items-center justify-center p-3 bg-blue-900/20 hover:bg-blue-900/40 border border-blue-800 rounded-lg transition-colors group">
                    <Shield className="w-6 h-6 text-blue-500 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-blue-400">POLICE</span>
                </button>

                <button className="flex flex-col items-center justify-center p-3 bg-red-900/20 hover:bg-red-900/40 border border-red-800 rounded-lg transition-colors group">
                    <Flame className="w-6 h-6 text-red-500 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-red-400">FIRE DEPT</span>
                </button>

                <button className="flex flex-col items-center justify-center p-3 bg-yellow-900/20 hover:bg-yellow-900/40 border border-yellow-800 rounded-lg transition-colors group">
                    <Biohazard className="w-6 h-6 text-yellow-500 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-yellow-400">HAZMAT</span>
                </button>

                <button className="flex flex-col items-center justify-center p-3 bg-green-900/20 hover:bg-green-900/40 border border-green-800 rounded-lg transition-colors group">
                    <Phone className="w-6 h-6 text-green-500 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-green-400">MED CONTROL</span>
                </button>
            </div>
        </div>
    );
}
