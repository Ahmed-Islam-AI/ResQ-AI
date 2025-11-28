import React, { useEffect, useState } from 'react';

interface Hospital {
    id: string;
    name: string;
    distance_miles: number;
    total_beds: number;
    available_beds: number;
    specialties: string[];
    status: string;
}

export default function HospitalCapacity() {
    const [hospitals, setHospitals] = useState<Hospital[]>([]);

    useEffect(() => {
        const fetchHospitals = async () => {
            try {
                const res = await fetch('http://localhost:8000/hospitals');
                const data = await res.json();
                setHospitals(data.hospitals);
            } catch (e) {
                console.error("Failed to fetch hospitals", e);
            }
        };

        fetchHospitals();
        const interval = setInterval(fetchHospitals, 5000); // Update every 5s
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Normal': return 'text-green-400';
            case 'Busy': return 'text-yellow-400';
            case 'Diverting': return 'text-red-500 font-bold';
            default: return 'text-gray-400';
        }
    };

    const getProgressColor = (occupancy: number) => {
        if (occupancy > 0.9) return 'bg-red-500';
        if (occupancy > 0.75) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 h-full overflow-y-auto">
            <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Hospital Resource Tracking
            </h2>

            <div className="space-y-4">
                {hospitals.map((hospital) => {
                    const occupancy = (hospital.total_beds - hospital.available_beds) / hospital.total_beds;

                    return (
                        <div key={hospital.id} className="bg-gray-800 p-3 rounded border border-gray-700">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-semibold text-white">{hospital.name}</h3>
                                    <p className="text-xs text-gray-400">{hospital.distance_miles} miles away</p>
                                </div>
                                <span className={`text-sm ${getStatusColor(hospital.status)}`}>
                                    {hospital.status}
                                </span>
                            </div>

                            <div className="mb-2">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>Capacity</span>
                                    <span>{hospital.available_beds} / {hospital.total_beds} beds free</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(occupancy)}`}
                                        style={{ width: `${occupancy * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1 mt-2">
                                {hospital.specialties.map((spec, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full">
                                        {spec}
                                    </span>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
