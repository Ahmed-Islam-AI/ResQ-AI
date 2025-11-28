"use client";

import { FileText, Copy, Check, Mic, Volume2, StopCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface SBARGeneratorProps {
    sessionId: string;
}

export default function SBARGenerator({ sessionId }: SBARGeneratorProps) {
    const [summary, setSummary] = useState("");
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [isSpeaking, setIsSpeaking] = useState(false);

    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setTranscript(prev => prev + " " + finalTranscript);
                }
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
            };
        }
    }, []);

    const toggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        } else {
            recognitionRef.current?.start();
            setIsRecording(true);
        }
    };

    const handleGenerate = async () => {
        if (!sessionId) return;
        setLoading(true);
        try {
            // Use dictated transcript if available, otherwise use placeholder
            const textToAnalyze = transcript || "Patient handoff requested. Standard protocol followed.";

            const res = await fetch("http://localhost:8000/sbar/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    session_id: sessionId,
                    transcript_entries: [
                        { timestamp: new Date().toISOString(), text: textToAnalyze, speaker: "Paramedic" }
                    ]
                }),
            });
            const data = await res.json();
            setSummary(data.summary);
        } catch (error) {
            console.error("SBAR generation failed:", error);
            setSummary("Failed to generate report. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(summary);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleReadAloud = () => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        if (!summary) return;

        const utterance = new SpeechSynthesisUtterance(summary);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-800 overflow-hidden shadow-lg">
            <div className="p-4 border-b border-gray-800 bg-gray-950 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-500" />
                    Handoff (SBAR)
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={toggleRecording}
                        className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse ring-1 ring-red-500' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                        title={isRecording ? "Stop Dictation" : "Start Dictation"}
                    >
                        {isRecording ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="text-xs font-bold bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(34,197,94,0.3)] hover:shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                    >
                        {loading ? "..." : "GENERATE"}
                    </button>
                </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                {/* Dictation Preview Area */}
                {transcript && (
                    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 text-xs text-gray-300 italic">
                        <span className="text-gray-500 not-italic font-bold mr-2">Dictation:</span>
                        "{transcript}"
                    </div>
                )}

                {summary ? (
                    <div className="relative bg-gray-950/50 p-5 rounded-xl border border-gray-800 backdrop-blur-sm flex-1">
                        <div className="absolute top-3 right-3 flex gap-2">
                            <button
                                onClick={handleReadAloud}
                                className={`p-2 rounded-lg transition-all ${isSpeaking ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                title="Read Aloud"
                            >
                                {isSpeaking ? <StopCircle className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={handleCopy}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                title="Copy to clipboard"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-300 leading-relaxed pt-8">
                            {summary}
                        </pre>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-600 space-y-4 border-2 border-dashed border-gray-800 rounded-xl m-2">
                        <div className={`p-4 rounded-full transition-all ${isRecording ? 'bg-red-500/10 scale-110' : 'bg-gray-900'}`}>
                            <Mic className={`w-8 h-8 ${isRecording ? 'text-red-500' : 'opacity-40'}`} />
                        </div>
                        <p className="text-sm font-medium opacity-60 text-center px-4">
                            {isRecording ? "Listening... Speak clearly..." : "Tap mic to dictate or click Generate"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
