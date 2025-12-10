import React, { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService'; // reusing generic user update if possible, or specialized service
import api from '../../../services/api'; // fallback for direct update

const AvailabilityModal = ({ onClose, currentAvailability, onSave, readOnly = false }) => {
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Initialize schedule from props or default
        const initialSchedule = DAYS.map(day => {
            const existing = currentAvailability?.find(a => a.day === day);
            return existing || {
                day,
                startTime: '09:00',
                endTime: '17:00',
                isAvailable: false
            };
        });
        setSchedule(initialSchedule);
    }, [currentAvailability]);

    const handleChange = (index, field, value) => {
        const newSchedule = [...schedule];
        newSchedule[index] = { ...newSchedule[index], [field]: value };
        setSchedule(newSchedule);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Filter only available days or send all? Send all for simpler processing usually, 
            // but schema allows array. Let's send all.
            // Using a specific endpoint or generic update?
            // "updateUser" in adminService calls /users/:id. 
            // We need to update *current user*. 
            // Let's use api.put('/users/profile') or similar if it exists, or /users/:id

            // Assuming we can update 'availability' via standard profile update
            const response = await api.put('/users/profile', { availability: schedule });

            if (onSave) onSave(response.data);
            onClose();
        } catch (error) {
            console.error("Failed to update availability", error);
            alert("Failed to save availability");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">{readOnly ? 'Trainer Availability' : 'Manage Availability'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {schedule.map((slot, index) => (
                            <div key={slot.day} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50">
                                <div className="w-32 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id={`available-${slot.day}`}
                                        name={`available-${slot.day}`}
                                        checked={slot.isAvailable}
                                        disabled={readOnly}
                                        onChange={(e) => handleChange(index, 'isAvailable', e.target.checked)}
                                        className="rounded text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                                    />
                                    <label htmlFor={`available-${slot.day}`} className={`font-medium ${slot.isAvailable ? 'text-gray-900' : 'text-gray-400'} ${readOnly ? '' : 'cursor-pointer select-none'}`}>
                                        {slot.day}
                                    </label>
                                </div>

                                {slot.isAvailable && (
                                    <div className="flex items-center gap-2 flex-1">
                                        <input
                                            type="time"
                                            id={`start-${slot.day}`}
                                            name={`start-${slot.day}`}
                                            aria-label={`Start time for ${slot.day}`}
                                            value={slot.startTime}
                                            disabled={readOnly}
                                            onChange={(e) => handleChange(index, 'startTime', e.target.value)}
                                            className="input-field py-1 disabled:bg-gray-100 disabled:text-gray-500"
                                            required={slot.isAvailable}
                                        />
                                        <span className="text-gray-400">to</span>
                                        <input
                                            type="time"
                                            id={`end-${slot.day}`}
                                            name={`end-${slot.day}`}
                                            aria-label={`End time for ${slot.day}`}
                                            value={slot.endTime}
                                            disabled={readOnly}
                                            onChange={(e) => handleChange(index, 'endTime', e.target.value)}
                                            className="input-field py-1 disabled:bg-gray-100 disabled:text-gray-500"
                                            required={slot.isAvailable}
                                        />
                                    </div>
                                )}
                                {!slot.isAvailable && (
                                    <div className="flex-1 text-sm text-gray-400 italic">
                                        Unavailable
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn-secondary">{readOnly ? 'Close' : 'Cancel'}</button>
                        {!readOnly && (
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Schedule'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AvailabilityModal;
