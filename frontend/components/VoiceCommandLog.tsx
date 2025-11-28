"use client";

import { Mic, Bot, User, Volume2, StopCircle, Send } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
    time: string;
}

export default function VoiceCommandLog() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'ai', text: "Ready. Ask me about protocols (e.g., 'Chest Pain').", time: "Now" }
    ]);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [language, setLanguage] = useState<'english' | 'urdu'>('english');
    const [inputText, setInputText] = useState("");

    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false; // Stop after one sentence for Q&A
            recognitionRef.current.interimResults = false;
            // Set language based on state
            recognitionRef.current.lang = language === 'urdu' ? 'ur-PK' : 'en-US';

            recognitionRef.current.onstart = () => setIsListening(true);
            recognitionRef.current.onend = () => setIsListening(false);

            recognitionRef.current.onresult = (event: any) => {
                const command = event.results[0][0].transcript.trim();
                handleUserQuery(command);
            };
        }
    }, [language]); // Re-initialize when language changes

    const handleUserQuery = async (query: string) => {
        // Add User Message
        const userMsg: ChatMessage = {
            role: 'user',
            text: query,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMsg]);
        setIsProcessing(true);

        try {
            // Fetch AI Response
            const res = await fetch("http://localhost:8000/assistant/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, language }),
            });
            const data = await res.json();

            const aiText = data.response;
            const aiMsg: ChatMessage = {
                role: 'ai',
                text: aiText,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, aiMsg]);

            // Speak Response
            speakResponse(aiText);

        } catch (error) {
            console.error("Assistant failed:", error);
            setMessages(prev => [...prev, { role: 'ai', text: "Connection error. Please try again.", time: "Now" }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const speakResponse = async (text: string) => {
        window.speechSynthesis.cancel();

        // Use Server-side ElevenLabs TTS for Urdu (better quality/support)
        if (language === 'urdu') {
            try {
                setIsSpeaking(true);
                const res = await fetch("http://localhost:8000/speak", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text }),
                });

                if (!res.ok) throw new Error("TTS request failed");

                const data = await res.json();
                if (data.audio_base64) {
                    const audio = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
                    audio.onended = () => setIsSpeaking(false);
                    audio.play();
                    return;
                }
            } catch (error) {
                console.error("Server TTS failed, falling back to browser:", error);
                setIsSpeaking(false);
            }
        }

        // Default / Fallback: Browser TTS
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'urdu' ? 'ur-PK' : 'en-US';
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            window.speechSynthesis.cancel(); // Stop speaking if listening starts
            recognitionRef.current?.start();
        }
    };

    const stopSpeaking = () => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    };

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'english' ? 'urdu' : 'english');
    };

    const handleTextSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;
        handleUserQuery(inputText);
        setInputText("");
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">
                <h2 className="text-lg font-bold flex items-center gap-2 text-blue-400">
                    <Bot className="w-5 h-5" />
                    AI ASSISTANT
                </h2>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={toggleLanguage}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-colors border ${language === 'urdu'
                            ? 'bg-green-900/50 text-green-400 border-green-800'
                            : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                            }`}
                        title="Switch Language"
                    >
                        {language === 'urdu' ? 'URDU' : 'ENG'}
                    </button>

                    {isSpeaking && (
                        <button onClick={stopSpeaking} className="p-1.5 bg-gray-800 rounded-full text-blue-400 hover:bg-gray-700 animate-pulse">
                            <Volume2 className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={toggleListening}
                        className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                        title={isListening ? "Listening..." : "Ask AI"}
                    >
                        <Mic className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.role === 'user' ? 'bg-gray-700' : 'bg-blue-900/50'}`}>
                            {msg.role === 'user' ? <User className="w-3 h-3 text-gray-300" /> : <Bot className="w-3 h-3 text-blue-400" />}
                        </div>
                        <div className={`max-w-[85%] rounded-lg p-2 text-xs leading-relaxed ${msg.role === 'user'
                            ? 'bg-gray-800 text-gray-200 rounded-tr-none'
                            : 'bg-blue-950/30 border border-blue-900/30 text-blue-100 rounded-tl-none'
                            }`}>
                            {msg.text}
                            <div className={`text-[9px] mt-1 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                {msg.time}
                            </div>
                        </div>
                    </div>
                ))}
                {isProcessing && (
                    <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-3 h-3 text-blue-400" />
                        </div>
                        <div className="bg-blue-950/30 border border-blue-900/30 rounded-lg p-2 rounded-tl-none">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-75"></span>
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-150"></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleTextSubmit} className="mt-3 flex gap-2 border-t border-gray-800 pt-3">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={language === 'urdu' ? "Sawwal puchein..." : "Type your question..."}
                    className="flex-1 bg-gray-800 text-white text-xs rounded px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
                    disabled={isProcessing}
                />
                <button
                    type="submit"
                    disabled={isProcessing || !inputText.trim()}
                    className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
}
