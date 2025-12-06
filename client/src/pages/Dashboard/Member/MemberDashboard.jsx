import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { subscriptionService } from '../../../services/subscriptionService';
import { bookingService } from '../../../services/classService';
import { attendanceService } from '../../../services/attendanceService';

const MemberDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        bookings: 0,
        attended: 0,
        upcoming: 0
    });
    const [subscription, setSubscription] = useState(null);
    const [upcomingClasses, setUpcomingClasses] = useState([]);
    const [recentAttendance, setRecentAttendance] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
    }, [user]);

    const loadDashboardData = async () => {
        try {
            // Fetch concurrent data
            const [subs, bookings, attendance] = await Promise.all([
                subscriptionService.getMySubscriptions(),
                bookingService.getMyBookings(),
                user?._id ? attendanceService.getMemberAttendance(user._id) : { attendance: [] }
            ]);

            // Process Subscription
            // Assuming getMySubscriptions returns an array
            // Match logic with Subscription.jsx
            const activeSub = subs.find(s => ['active', 'trialing', 'past_due'].includes(s.status?.toLowerCase()));
            setSubscription(activeSub);

            // Process Bookings
            const upcoming = bookings.filter(b =>
                b.classId?.startTime && new Date(b.classId.startTime) > new Date() && b.status === 'booked'
            );
            setUpcomingClasses(upcoming.slice(0, 3)); // Show top 3

            // Process Stats
            const attendedCount = attendance.attendance?.length || 0;

            setStats({
                bookings: bookings.length,
                attended: attendedCount,
                upcoming: upcoming.length
            });

            setRecentAttendance(attendance.attendance?.slice(0, 5) || []);
            setLoading(false);

        } catch (error) {
            console.error("Error loading dashboard:", error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Welcome Back!</h1>
                <Link to="/dashboard/classes" className="btn-primary">
                    Book a Class
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white border-none">
                    <h3 className="text-lg font-medium opacity-90">Active Plan</h3>
                    <p className="text-2xl font-bold mt-2">
                        {subscription ? subscription.planId.name : 'No Active Plan'}
                    </p>
                    <p className="text-sm mt-1 opacity-75">
                        {subscription
                            ? `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                            : <Link to="/subscription-plans" className="underline hover:text-white">View Plans</Link>
                        }
                    </p>
                </div>

                <div className="card">
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Upcoming Classes</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.upcoming}</p>
                </div>

                <div className="card">
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Total Workouts</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.attended}</p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Upcoming Schedule */}
                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Upcoming Schedule</h2>
                        <Link to="/dashboard/my-bookings" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                            View All
                        </Link>
                    </div>

                    {upcomingClasses.length > 0 ? (
                        <div className="space-y-4">
                            {upcomingClasses.map(booking => (
                                <div key={booking._id} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="flex-shrink-0 w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex flex-col items-center justify-center font-bold">
                                        <span className="text-xs">{new Date(booking.classId.startTime).toLocaleString('default', { month: 'short' })}</span>
                                        <span className="text-lg">{new Date(booking.classId.startTime).getDate()}</span>
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <h3 className="font-semibold text-gray-900">{booking.classId.name}</h3>
                                        <p className="text-sm text-gray-500">
                                            {new Date(booking.classId.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {booking.classId.trainerId?.name}
                                        </p>
                                    </div>
                                    <Link to={`/dashboard/my-bookings`} className="text-sm border border-gray-300 px-3 py-1 rounded hover:bg-white transition-colors">
                                        Details
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <p>No upcoming classes booked.</p>
                            <Link to="/dashboard/classes" className="text-primary-500 hover:text-primary-600 font-medium mt-2 inline-block">
                                Browse Schedule
                            </Link>
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                    </div>

                    {recentAttendance.length > 0 ? (
                        <div className="space-y-4">
                            {recentAttendance.map((record, index) => (
                                <div key={record._id || index} className="flex items-start">
                                    <div className="flex-shrink-0 mt-1">
                                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-900">
                                            Attended {record.classId?.name || 'Class'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(record.checkedInAt || record.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4">No recent activity recorded.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MemberDashboard;
