"use client";

import { Search, BookOpen, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface Protocol {
    protocol: string;
    details: string;
    contraindications: string[];
    score: number;
}

export default function ProtocolViewer() {
    const [symptom, setSymptom] = useState("");
    const [protocols, setProtocols] = useState<Protocol[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!symptom.trim()) return;

        setLoading(true);
        try {
            // Use the new generate endpoint which handles both static search and AI generation
            const res = await fetch("http://localhost:8000/protocol/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symptom, limit: 3 }),
            });
            const data = await res.json();
            setProtocols(data.protocols);
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800 bg-gray-950">
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-500" />
                    Protocol Assistant
                </h2>
                <form onSubmit={handleSearch} className="relative">
                    <input
                        type="text"
                        value={symptom}
                        onChange={(e) => setSymptom(e.target.value)}
                        placeholder="Search protocols or describe symptom..."
                        className="w-full bg-gray-900 text-white border border-gray-700 rounded-md py-2 pl-10 pr-4 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                </form>
                <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                    <span className="bg-purple-900/30 text-purple-400 px-1.5 py-0.5 rounded text-[10px] border border-purple-800">AI ENABLED</span>
                    <span>If no match found, AI will generate a protocol.</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading && <div className="text-center text-gray-500 py-4">Searching protocols...</div>}

                {!loading && protocols.length === 0 && (
                    <div className="text-center text-gray-600 py-8 text-sm">
                        Enter a symptom to find relevant EMS protocols.
                    </div>
                )}

                {protocols.map((p, idx) => (
                    <div key={idx} className="bg-gray-800 rounded-lg p-4 border-l-4 border-purple-500">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-white">{p.protocol}</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={async () => {
                                        try {
                                            const text = `Protocol for ${p.protocol}. ${p.details}`;
                                            const res = await fetch("http://localhost:8000/speak", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ text }),
                                            });
                                            const data = await res.json();
                                            if (data.audio_base64) {
                                                new Audio(`data:audio/mp3;base64,${data.audio_base64}`).play();
                                            }
                                        } catch (e) {
                                            console.error(e);
                                            alert("Audio playback failed");
                                        }
                                    }}
                                    className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
                                    title="Read Protocol"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                                </button>
                                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                                    Match: {Math.round(p.score * 100)}%
                                </span>
                            </div>
                        </div>
                        <p className="text-gray-300 text-sm mb-3">{p.details}</p>

                        {p.contraindications.length > 0 && (
                            <div className="bg-red-900/20 rounded p-2 border border-red-900/50">
                                <div className="flex items-center gap-2 text-red-400 text-xs font-bold mb-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    CONTRAINDICATIONS
                                </div>
                                <ul className="list-disc list-inside text-xs text-red-300">
                                    {p.contraindications.map((c, i) => (
                                        <li key={i}>{c}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
