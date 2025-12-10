import React, { useState, useEffect } from 'react';
import { classService } from '../../../services/classService';
import { useAuth } from '../../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import AvailabilityModal from './AvailabilityModal';

const TrainerDashboard = () => {
    const { user } = useAuth();
    const [upcomingClasses, setUpcomingClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await classService.getClasses({ trainerId: user._id, status: 'scheduled' });

            // Filter future classes
            const upcoming = data.filter(c => new Date(c.startTime) > new Date())
                .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

            setUpcomingClasses(upcoming);
        } catch (error) {
            console.error("Failed to load dashboard", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900">Trainer Dashboard</h1>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-blue-50 border-blue-100">
                    <h3 className="text-sm font-medium text-blue-800 uppercase">Upcoming Classes</h3>
                    <p className="text-3xl font-bold text-blue-900 mt-2">{upcomingClasses.length}</p>
                </div>
                <div className="card">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">Quick Actions</h3>
                    <div className="mt-4 flex gap-2 flex-wrap">
                        <Link to="/dashboard/plans" className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-blue-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 hover:scale-[1.02] transition-all duration-300 transform">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            Upload New Plan
                        </Link>
                        <button
                            onClick={() => setShowAvailabilityModal(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            Set Availability
                        </button>
                    </div>
                </div>
            </div>


            {/* Upcoming Schedule */}
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Your Schedule</h2>
                    <Link to="/dashboard/my-classes" className="text-primary-600 text-sm hover:underline">Manage All</Link>
                </div>

                {loading ? <p>Loading...</p> : upcomingClasses.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {upcomingClasses.slice(0, 5).map(cls => (
                            <div key={cls._id} className="py-4 flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                                    <p className="text-sm text-gray-500">
                                        {new Date(cls.startTime).toLocaleDateString()} at {new Date(cls.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                        {cls.attendees?.length || 0} / {cls.capacity}
                                    </span>
                                    <div className="mt-1">
                                        <Link to={`/dashboard/my-classes`} className="text-sm text-primary-600 hover:text-primary-800">View Details</Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-6">No upcoming classes scheduled.</p>
                )}
            </div>

            {showAvailabilityModal && (
                <AvailabilityModal
                    currentAvailability={user?.availability}
                    onClose={() => setShowAvailabilityModal(false)}
                    onSave={() => setShowAvailabilityModal(false)}
                />
            )}
        </div>
    );
};

export default TrainerDashboard;
