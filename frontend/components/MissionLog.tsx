import React, { useState, useEffect } from 'react';

interface LogEntry {
    id: string;
    timestamp: string;
    type: 'VITALS' | 'MEDICATION' | 'ALERT' | 'SYSTEM';
    message: string;
}

export default function MissionLog() {
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Simulate incoming logs
    useEffect(() => {
        const initialLogs: LogEntry[] = [
            { id: '1', timestamp: new Date(Date.now() - 1000 * 60 * 15).toLocaleTimeString(), type: 'SYSTEM', message: 'Mission Started: Unit MEDIC-1 dispatched.' },
            { id: '2', timestamp: new Date(Date.now() - 1000 * 60 * 12).toLocaleTimeString(), type: 'VITALS', message: 'Initial Vitals: BP 140/90, HR 110, SpO2 96%' },
            { id: '3', timestamp: new Date(Date.now() - 1000 * 60 * 10).toLocaleTimeString(), type: 'ALERT', message: 'AI Warning: Tachycardia detected.' },
            { id: '4', timestamp: new Date(Date.now() - 1000 * 60 * 5).toLocaleTimeString(), type: 'MEDICATION', message: 'Administered: Aspirin 324mg PO' },
        ];
        setLogs(initialLogs);

        const interval = setInterval(() => {
            const newLog: LogEntry = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date().toLocaleTimeString(),
                type: 'VITALS',
                message: `Vitals Update: HR ${80 + Math.floor(Math.random() * 20)}, SpO2 ${95 + Math.floor(Math.random() * 4)}%`
            };
            setLogs(prev => [newLog, ...prev]);
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'VITALS': return 'text-blue-400';
            case 'MEDICATION': return 'text-green-400';
            case 'ALERT': return 'text-red-400 font-bold';
            case 'SYSTEM': return 'text-gray-400';
            default: return 'text-white';
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 h-96 flex flex-col">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Mission Log & Analytics
            </h2>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {logs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-3 p-2 hover:bg-gray-800 rounded transition-colors border-l-2 border-gray-700">
                        <span className="text-xs text-gray-500 font-mono whitespace-nowrap">{log.timestamp}</span>
                        <div className="flex-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded bg-gray-800 border border-gray-700 mr-2 ${getTypeColor(log.type)}`}>
                                {log.type}
                            </span>
                            <span className="text-sm text-gray-300">{log.message}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
