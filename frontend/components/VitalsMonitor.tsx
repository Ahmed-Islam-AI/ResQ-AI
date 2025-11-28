"use client";

import React, { useEffect, useRef, useState } from 'react';

interface VitalsMonitorProps {
    pulse?: number | null;
    spo2?: number | null;
    sessionId?: string;
}

export default function VitalsMonitor({ pulse: initialPulse, spo2: initialSpo2, sessionId }: VitalsMonitorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [pulse, setPulse] = useState<number | null>(initialPulse || 80);
    const [spo2, setSpo2] = useState<number | null>(initialSpo2 || 98);

    // Poll for vitals if sessionId is provided
    useEffect(() => {
        if (!sessionId) return;

        const fetchVitals = async () => {
            try {
                const res = await fetch(`http://localhost:8000/session/${sessionId}`);
                const data = await res.json();
                if (data.patient_vitals) {
                    if (data.patient_vitals.pulse) setPulse(data.patient_vitals.pulse);
                    if (data.patient_vitals.spo2) setSpo2(data.patient_vitals.spo2);
                }
            } catch (e) {
                console.error("Failed to fetch vitals", e);
            }
        };

        const interval = setInterval(fetchVitals, 2000);
        return () => clearInterval(interval);
    }, [sessionId]);

    const startSimulation = async () => {
        if (!sessionId) return;
        try {
            await fetch(`http://localhost:8000/session/${sessionId}/simulate`, { method: 'POST' });
        } catch (e) {
            console.error("Failed to start simulation", e);
        }
    };

    // Animation loop for ECG
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let x = 0;

        // Resize canvas
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const draw = () => {
            // Fade out effect
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#00ff00'; // Green line
            ctx.beginPath();

            // Simulate ECG wave
            const baseLine = canvas.height / 2;
            const amplitude = 30;
            const frequency = 0.1;

            // Draw segment
            ctx.moveTo(x, baseLine);

            // Generate a "beat" if we are in a specific interval based on pulse
            const beatInterval = 60000 / (pulse || 80); // ms per beat
            const now = Date.now();
            const timeSinceLastBeat = now % beatInterval;

            let y = baseLine;

            // QRS Complex simulation
            if (timeSinceLastBeat < 100) {
                y = baseLine - amplitude * 1.5; // R wave
            } else if (timeSinceLastBeat < 150) {
                y = baseLine + amplitude * 0.5; // S wave
            } else if (timeSinceLastBeat < 300) {
                y = baseLine - amplitude * 0.2; // T wave
            }

            // Add some noise
            y += (Math.random() - 0.5) * 5;

            x += 2;
            if (x > canvas.width) {
                x = 0;
            }

            ctx.lineTo(x, y);
            ctx.stroke();

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [pulse]);

    return (
        <div className="bg-black border-2 border-gray-800 rounded-lg p-4 relative overflow-hidden h-48">
            <div className="absolute top-2 left-4 z-10 flex space-x-8">
                <div>
                    <div className="text-xs text-green-500 font-bold uppercase tracking-wider">Heart Rate</div>
                    <div className="text-4xl font-mono font-bold text-green-400 flex items-end">
                        {pulse || '--'}
                        <span className="text-sm ml-1 mb-1 text-green-600">BPM</span>
                    </div>
                </div>
                <div>
                    <div className="text-xs text-blue-500 font-bold uppercase tracking-wider">SpO2</div>
                    <div className="text-4xl font-mono font-bold text-blue-400 flex items-end">
                        {spo2 || '--'}
                        <span className="text-sm ml-1 mb-1 text-blue-600">%</span>
                    </div>
                </div>
            </div>

            {/* Grid overlay */}
            <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 pointer-events-none opacity-20">
                {Array.from({ length: 72 }).map((_, i) => (
                    <div key={i} className="border border-green-900/50"></div>
                ))}
            </div>

            <button
                onClick={startSimulation}
                className="absolute bottom-2 right-2 z-20 bg-gray-800/50 hover:bg-gray-700 text-xs text-gray-400 px-2 py-1 rounded border border-gray-700 transition-colors"
            >
                SIMULATE
            </button>

            <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
    );
}
