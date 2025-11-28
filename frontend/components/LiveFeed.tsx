"use client";

import { AlertTriangle, Radio } from "lucide-react";

export default function LiveFeed() {
    return (
        <div className="bg-blue-950/30 border-y border-blue-900/50 backdrop-blur-sm overflow-hidden flex items-center h-10 relative">
            <div className="bg-blue-600 text-white px-4 h-full flex items-center font-bold text-xs uppercase tracking-wider z-10 shadow-lg">
                <Radio className="w-3 h-3 mr-2 animate-pulse" />
                Live Feed
            </div>
            <div className="flex-1 overflow-hidden relative h-full flex items-center">
                <div className="animate-marquee whitespace-nowrap flex items-center gap-8 text-sm font-mono text-blue-200">
                    <span className="flex items-center gap-2"><AlertTriangle className="w-3 h-3 text-yellow-500" /> HEAVY TRAFFIC REPORTED ON I-95 SOUTHBOUND</span>
                    <span className="text-blue-500">•</span>
                    <span>SEVERE THUNDERSTORM WARNING IN EFFECT UNTIL 22:00</span>
                    <span className="text-blue-500">•</span>
                    <span className="flex items-center gap-2"><AlertTriangle className="w-3 h-3 text-red-500" /> MULTI-VEHICLE COLLISION AT 5TH AVE & MAIN ST</span>
                    <span className="text-blue-500">•</span>
                    <span>HOSPITAL CAPACITY AT ST. MARY'S REACHING CRITICAL LEVELS</span>
                    <span className="text-blue-500">•</span>
                    <span>NEW PROTOCOL UPDATE: CARDIAC ARREST V4.2 DEPLOYED</span>
                </div>
            </div>

            <style jsx>{`
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
        </div>
    );
}
