"use client";

import { ShieldAlert, Mic, Send } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface AnalysisResult {
    status: "SAFE" | "WARNING";
    reason: string | null;
    timestamp: string;
    source?: string;
}

export default function RiskAnalysisFeed({ sessionId }: { sessionId: string }) {
    const [transcript, setTranscript] = useState("");
    const [history, setHistory] = useState<AnalysisResult[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [processing, setProcessing] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transcript.trim() || !sessionId) return;

        setProcessing(true);
        try {
            const res = await fetch("http://localhost:8000/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    session_id: sessionId,
                    transcript: transcript,
                }),
            });

            const data = await res.json();
            const result = data.analysis;

            setHistory(prev => [...prev, {
                status: result.status,
                reason: result.reason || "No risks detected.",
                timestamp: new Date().toLocaleTimeString(),
                source: result.source
            }]);

            if (data.audio_alert) {
                const audio = new Audio(`data:audio/mp3;base64,${data.audio_alert}`);
                audio.play();
            }

            setTranscript("");
        } catch (error) {
            console.error("Analysis failed:", error);
        } finally {
            setProcessing(false);
        }
    };

    // Voice Recognition Logic
    useEffect(() => {
        let recognition: any = null;

        if (isRecording && "webkitSpeechRecognition" in window) {
            // @ts-ignore
            recognition = new window.webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "en-US";

            recognition.onresult = (event: any) => {
                let finalTranscript = "";
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setTranscript(prev => prev + " " + finalTranscript);
                }
            };

            recognition.start();
        }

        return () => {
            if (recognition) {
                recognition.stop();
            }
        };
    }, [isRecording]);

    return (
        <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800 bg-gray-950 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-blue-500" />
                    AI Safety Guardian
                </h2>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-xs text-green-500 font-mono">ACTIVE</span>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {history.length === 0 && (
                    <div className="text-center text-gray-600 py-10 text-sm">
                        AI is listening for medical risks...
                    </div>
                )}
                {history.map((item, idx) => (
                    <div
                        key={idx}
                        className={`p-3 rounded-lg border backdrop-blur-sm transition-all ${item.status === "WARNING"
                            ? "bg-red-950/40 border-red-900/50 text-red-100 shadow-[0_0_15px_rgba(220,38,38,0.1)]"
                            : "bg-green-950/40 border-green-900/50 text-green-100"
                            }`}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.status === "WARNING"
                                    ? "bg-red-500/20 border-red-500/50 text-red-200"
                                    : "bg-green-500/20 border-green-500/50 text-green-200"
                                    }`}>
                                    {item.status}
                                </span>
                                {item.source && (
                                    <span className="text-[10px] uppercase tracking-wider opacity-60 font-mono border border-white/10 px-1.5 py-0.5 rounded">
                                        {item.source.replace('_', ' ')}
                                    </span>
                                )}
                            </div>
                            <span className="text-xs opacity-50 font-mono">{item.timestamp}</span>
                        </div>
                        <p className="text-sm leading-relaxed opacity-90">{item.reason}</p>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-gray-950 border-t border-gray-800">
                <form onSubmit={handleAnalyze} className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setIsRecording(!isRecording)}
                        className={`p-2 rounded-full transition-colors ${isRecording ? "bg-red-600 text-white animate-pulse" : "bg-gray-800 text-gray-400 hover:text-white"
                            }`}
                    >
                        <Mic className="w-5 h-5" />
                    </button>
                    <input
                        type="text"
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        placeholder={isRecording ? "Listening..." : "Transcribe observation or action..."}
                        className="flex-1 bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={processing}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md disabled:opacity-50"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
