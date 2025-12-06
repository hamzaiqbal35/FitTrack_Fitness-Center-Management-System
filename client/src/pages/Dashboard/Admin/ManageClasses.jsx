import React, { useState, useEffect } from 'react';
import { classService } from '../../../services/classService';
import { adminService } from '../../../services/adminService'; // Import adminService
import { useAuth } from '../../../contexts/AuthContext';
import AttendanceModal from '../Trainer/AttendanceModal';

const ManageClasses = () => {
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [trainers, setTrainers] = useState([]); // State for trainers
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startTime: '',
        duration: 60,
        capacity: 20,
        location: 'Main Gym Floor',
        capacity: 20,
        location: 'Main Gym Floor',
        trainerId: '', // Add trainerId to form data
        isRecurring: false,
        recurrenceCount: 4
    });
    const [editingId, setEditingId] = useState(null);
    const [selectedClassForAttendance, setSelectedClassForAttendance] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [classesData, trainersData] = await Promise.all([
                classService.getClasses(), // Fetch ALL classes (no filter)
                adminService.getTrainers() // Fetch trainers
            ]);
            setClasses(classesData);
            setTrainers(trainersData.users || trainersData); // Handle potential pagination response structure
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to refresh just classes
    const loadClasses = async () => {
        try {
            const data = await classService.getClasses();
            setClasses(data);
        } catch (error) {
            console.error("Failed to load classes", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Calculate endTime based on duration
            const start = new Date(formData.startTime);
            const end = new Date(start.getTime() + formData.duration * 60000);

            const payload = {
                ...formData,
                endTime: end.toISOString()
            };

            if (editingId) {
                await classService.updateClass(editingId, payload);
            } else {
                await classService.createClass(payload);
            }
            setIsModalOpen(false);
            setEditingId(null);
            setEditingId(null);
            setFormData({ name: '', description: '', startTime: '', duration: 60, capacity: 20, location: 'Main Gym Floor', isRecurring: false, recurrenceCount: 4 });
            loadClasses();
        } catch (error) {
            console.error("Failed to save class", error);
            alert(error.response?.data?.message || 'Failed to save class');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this class?')) return;
        try {
            await classService.deleteClass(id);
            loadClasses();
        } catch (error) {
            console.error("Failed to delete class", error);
        }
    };

    const handleEdit = (cls) => {
        setEditingId(cls._id);
        const startTime = new Date(cls.startTime);
        const formattedTime = new Date(startTime.getTime() - (startTime.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

        setFormData({
            name: cls.name,
            description: cls.description || '',
            startTime: formattedTime,
            duration: cls.duration || 60, // Default to 60 if undefined
            capacity: cls.capacity,
            location: cls.location || 'Main Gym Floor',
            location: cls.location || 'Main Gym Floor',
            trainerId: (cls.trainerId && (cls.trainerId._id || cls.trainerId)) || '', // Handle null/undefined trainer
            isRecurring: false, // Default to false for edits
            recurrenceCount: 4
        });
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Manage Classes</h2>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({
                            name: '',
                            description: '',
                            startTime: '',
                            duration: 60,
                            capacity: 20,
                            location: 'Main Gym Floor',
                            location: 'Main Gym Floor',
                            trainerId: '',
                            isRecurring: false,
                            recurrenceCount: 4
                        });
                        setIsModalOpen(true);
                    }}
                    className="btn-primary"
                >
                    Create Class
                </button>
            </div>

            {loading ? <p>Loading...</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((cls) => (
                        <div key={cls._id} className="card relative flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-lg">{cls.name}</h3>
                                <p className="text-sm text-gray-500 mb-2">
                                    {new Date(cls.startTime).toLocaleString()}
                                </p>
                                <p className="text-sm">Duration: {cls.duration} min</p>
                                <p className="text-sm">Capacity: {cls.attendees?.length || 0} / {cls.capacity}</p>
                            </div>

                            <div className="mt-4 flex gap-2 flex-wrap">
                                <button onClick={() => setSelectedClassForAttendance(cls)} className="btn-secondary text-sm py-1 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                                    Attendance
                                </button>
                                <button onClick={() => handleEdit(cls)} className="btn-secondary text-sm py-1 px-3">Edit</button>
                                <button onClick={() => handleDelete(cls._id)} className="text-red-600 hover:text-red-800 text-sm font-medium px-2">Cancel</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                        <h3 className="text-lg font-bold mb-4">{editingId ? 'Edit Class' : 'Create New Class'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Class Name</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field mt-1"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Assigned Trainer</label>
                                <select
                                    required
                                    className="input-field mt-1"
                                    value={formData.trainerId}
                                    onChange={e => setFormData({ ...formData, trainerId: e.target.value })}
                                >
                                    <option value="">Select a Trainer</option>
                                    {trainers.map(trainer => (
                                        <option key={trainer._id} value={trainer._id}>
                                            {trainer.name} ({trainer.specialization || 'General'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    className="input-field mt-1"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Location</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field mt-1"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="input-field mt-1"
                                    value={formData.startTime}
                                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Duration (min)</label>
                                    <input
                                        type="number"
                                        required
                                        className="input-field mt-1"
                                        value={formData.duration}
                                        onChange={e => setFormData({ ...formData, duration: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Capacity</label>
                                    <input
                                        type="number"
                                        required
                                        className="input-field mt-1"
                                        value={formData.capacity}
                                        onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                                    />
                                </div>
                            </div>

                            {!editingId && (
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="isRecurring"
                                            checked={formData.isRecurring}
                                            onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="isRecurring" className="text-sm font-medium text-gray-900 select-none">
                                            Repeat Weekly
                                        </label>
                                    </div>

                                    {formData.isRecurring && (
                                        <div className="mt-3">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                For how many weeks?
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="2"
                                                    max="12"
                                                    value={formData.recurrenceCount}
                                                    onChange={e => setFormData({ ...formData, recurrenceCount: parseInt(e.target.value) })}
                                                    className="input-field w-20 py-1"
                                                />
                                                <span className="text-xs text-gray-500">
                                                    (Creates {formData.recurrenceCount} sessions)
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary">Save Class</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedClassForAttendance && (
                <AttendanceModal
                    classId={selectedClassForAttendance._id}
                    classDetails={selectedClassForAttendance}
                    onClose={() => setSelectedClassForAttendance(null)}
                />
            )}
        </div>
    );
};

export default ManageClasses;

