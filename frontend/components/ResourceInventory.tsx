import React from 'react';

export interface Resource {
    id: string;
    name: string;
    count: number;
    max: number;
    unit: string;
    critical: boolean;
}

interface ResourceInventoryProps {
    resources: Resource[];
    onUpdate: (id: string, delta: number) => void;
}

export default function ResourceInventory({ resources, onUpdate }: ResourceInventoryProps) {

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 h-full overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Unit Inventory
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {resources.map((resource) => {
                    const percentage = (resource.count / resource.max) * 100;
                    const isLow = percentage < 30;

                    return (
                        <div key={resource.id} className={`p-3 rounded border ${isLow ? 'bg-red-900/20 border-red-800' : 'bg-gray-800 border-gray-700'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-medium text-gray-200">{resource.name}</span>
                                {isLow && <span className="text-xs text-red-400 font-bold animate-pulse">LOW STOCK</span>}
                            </div>

                            <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl font-bold text-white">
                                    {resource.count} <span className="text-sm text-gray-500 font-normal">{resource.unit}</span>
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => onUpdate(resource.id, -1)}
                                        className="w-6 h-6 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded text-white"
                                    >-</button>
                                    <button
                                        onClick={() => onUpdate(resource.id, 1)}
                                        className="w-6 h-6 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded text-white"
                                    >+</button>
                                </div>
                            </div>

                            <div className="w-full bg-gray-900 rounded-full h-1.5">
                                <div
                                    className={`h-1.5 rounded-full transition-all ${isLow ? 'bg-red-500' : 'bg-green-500'}`}
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
