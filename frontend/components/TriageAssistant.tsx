import React, { useState } from 'react';

interface TriageResult {
    esi_level: number;
    color: string;
    description: string;
    recommended_action: string;
    ai_rationale?: string;
    ai_advice?: string;
}

interface TriageAssistantProps {
    sessionId?: string;
}

export default function TriageAssistant({ sessionId }: TriageAssistantProps) {
    const [symptoms, setSymptoms] = useState('');
    const [canWalk, setCanWalk] = useState(true);
    const [breathing, setBreathing] = useState(true);
    const [mentalStatus, setMentalStatus] = useState('Alert');
    const [pulse, setPulse] = useState<string>('');
    const [respRate, setRespRate] = useState<string>('');
    const [result, setResult] = useState<TriageResult | null>(null);
    const [loading, setLoading] = useState(false);

    const calculateTriage = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/triage/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    symptoms: symptoms.split(',').map(s => s.trim()),
                    can_walk: canWalk,
                    breathing: breathing,
                    mental_status: mentalStatus,
                    pulse: pulse ? parseInt(pulse) : null,
                    respiratory_rate: respRate ? parseInt(respRate) : null
                })
            });
            const data = await res.json();
            setResult(data);
        } catch (e) {
            console.error("Triage calculation failed", e);
        } finally {
            setLoading(false);
        }
    };

    const getBadgeColor = (color: string) => {
        switch (color) {
            case 'Red': return 'bg-red-600 text-white';
            case 'Orange': return 'bg-orange-500 text-white';
            case 'Yellow': return 'bg-yellow-500 text-black';
            case 'Green': return 'bg-green-500 text-white';
            case 'Blue': return 'bg-blue-500 text-white';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 h-full overflow-y-auto">
            <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Smart Triage Assistant
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Primary Symptoms (comma separated)</label>
                    <input
                        type="text"
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-purple-500 outline-none"
                        placeholder="e.g. Chest pain, dizziness"
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Can Walk?</label>
                        <select
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                            value={canWalk ? 'yes' : 'no'}
                            onChange={(e) => setCanWalk(e.target.value === 'yes')}
                        >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Breathing Normally?</label>
                        <select
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                            value={breathing ? 'yes' : 'no'}
                            onChange={(e) => setBreathing(e.target.value === 'yes')}
                        >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Mental Status</label>
                        <select
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                            value={mentalStatus}
                            onChange={(e) => setMentalStatus(e.target.value)}
                        >
                            <option value="Alert">Alert</option>
                            <option value="Verbal">Responds to Verbal</option>
                            <option value="Pain">Responds to Pain</option>
                            <option value="Unresponsive">Unresponsive</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Pulse (BPM)</label>
                        <input
                            type="number"
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                            placeholder="e.g. 80"
                            value={pulse}
                            onChange={(e) => setPulse(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-1">Respiratory Rate (breaths/min)</label>
                    <input
                        type="number"
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                        placeholder="e.g. 16"
                        value={respRate}
                        onChange={(e) => setRespRate(e.target.value)}
                    />
                </div>

                <button
                    onClick={calculateTriage}
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                    {loading ? 'Calculating...' : 'Calculate Priority'}
                </button>

                {result && (
                    <div className="mt-4 bg-gray-800 p-4 rounded border border-gray-700 animate-fade-in space-y-3">
                        <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                            <span className="text-gray-400">ESI Level</span>
                            <span className={`px-3 py-1 rounded-full font-bold ${getBadgeColor(result.color)}`}>
                                Level {result.esi_level}
                            </span>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">{result.description}</h3>
                            <p className="text-sm text-gray-300">{result.recommended_action}</p>
                        </div>

                        {result.ai_rationale && (
                            <div className="bg-purple-900/20 p-3 rounded border border-purple-500/30">
                                <h4 className="text-xs font-bold text-purple-400 uppercase mb-1">AI Rationale</h4>
                                <p className="text-sm text-gray-200">{result.ai_rationale}</p>
                            </div>
                        )}

                        {result.ai_advice && (
                            <div className="bg-blue-900/20 p-3 rounded border border-blue-500/30">
                                <h4 className="text-xs font-bold text-blue-400 uppercase mb-1">Clinical Advice</h4>
                                <p className="text-sm text-gray-200">{result.ai_advice}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
