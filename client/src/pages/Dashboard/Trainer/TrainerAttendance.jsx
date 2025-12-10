import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { attendanceService } from '../../../services/attendanceService';
import { classService } from '../../../services/classService';

const TrainerAttendance = () => {
    const { user } = useAuth();
    const [myClasses, setMyClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [attendanceData, setAttendanceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                // Fetch all classes for this trainer
                const data = await classService.getClasses({
                    trainerId: user._id,
                    limit: 100 // Reasonable limit for history
                });

                // Handling different response structures (just in case)
                let classes = [];
                if (data && data.classes) {
                    classes = data.classes;
                } else if (Array.isArray(data)) {
                    classes = data;
                }

                // Sort by date descending (newest first)
                const sorted = classes.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
                setMyClasses(sorted);

                // Auto-select the most recent class if exists
                if (sorted.length > 0) {
                    setSelectedClassId(sorted[0]._id);
                }

            } catch (error) {
                console.error("Failed to fetch classes:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchClasses();
        }
    }, [user]);

    useEffect(() => {
        if (!selectedClassId) return;

        const fetchDetails = async () => {
            setDetailLoading(true);
            try {
                // Returns { attendance, bookings, stats }
                const data = await attendanceService.getClassAttendance(selectedClassId);
                setAttendanceData(data);
            } catch (error) {
                console.error("Failed to fetch attendance details:", error);
                setAttendanceData(null);
            } finally {
                setDetailLoading(false);
            }
        };

        fetchDetails();
    }, [selectedClassId]);

    const handleClassChange = (e) => {
        setSelectedClassId(e.target.value);
    };

    // Helper to format date
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: 'numeric', minute: 'numeric'
        });
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading your classes...</div>;
    }

    if (myClasses.length === 0) {
        return (
            <div className="space-y-6 animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-900">Attendance Records</h2>
                <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
                    <p>You haven't scheduled any classes yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Attendance Records</h2>

                {/* Class Selector */}
                <div className="w-full md:w-auto">
                    <select
                        value={selectedClassId}
                        onChange={handleClassChange}
                        className="input-field w-full md:w-80 border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                        {myClasses.map(cls => (
                            <option key={cls._id} value={cls._id}>
                                {formatDate(cls.startTime)} - {cls.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {detailLoading ? (
                <div className="py-20 text-center bg-white rounded-xl border border-gray-100">
                    <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading attendance data...</p>
                </div>
            ) : attendanceData ? (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-sm text-gray-500 font-medium">Total Booked</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{attendanceData.stats.totalBookings}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-green-100 bg-green-50/50">
                            <p className="text-sm text-green-700 font-medium">Present</p>
                            <p className="text-3xl font-bold text-green-700 mt-2">{attendanceData.stats.checkedIn}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-red-100 bg-red-50/50">
                            <p className="text-sm text-red-700 font-medium">No Shows</p>
                            <div className="flex items-baseline gap-2 mt-2">
                                <p className="text-3xl font-bold text-red-700">{attendanceData.stats.noShows}</p>
                                <span className="text-xs text-red-600 font-medium">({attendanceData.stats.cancelled} cancelled)</span>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-100 bg-blue-50/50">
                            <p className="text-sm text-blue-700 font-medium">Check-in Method</p>
                            <div className="flex flex-col gap-1 mt-2 text-sm font-medium text-blue-800">
                                <div className="flex justify-between"><span>QR Scan:</span> <span>{attendanceData.stats.qrCheckIns}</span></div>
                                <div className="flex justify-between"><span>Manual:</span> <span>{attendanceData.stats.manualCheckIns}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Student List Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900">Student List</h3>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {attendanceData.bookings.length} Students
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 w-1/3">Member</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Check-in Time</th>
                                        <th className="px-6 py-3">Method</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-700">
                                    {attendanceData.bookings.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                                                No bookings found for this class.
                                            </td>
                                        </tr>
                                    ) : (
                                        attendanceData.bookings.map(booking => {
                                            // Find attendance record if they checked in
                                            const attRecord = attendanceData.attendance.find(a => a.bookingId === booking._id);

                                            // Determine display status
                                            let statusBadge;
                                            if (booking.status === 'checked_in') {
                                                statusBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Present
                                                </span>;
                                            } else if (booking.status === 'cancelled') {
                                                statusBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    Cancelled
                                                </span>;
                                            } else if (booking.status === 'no_show') {
                                                statusBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    No Show
                                                </span>;
                                            } else {
                                                statusBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    Booked
                                                </span>;
                                            }

                                            return (
                                                <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 flex items-center justify-center font-bold text-sm uppercase shadow-sm">
                                                                {booking.memberId?.name?.substring(0, 2) || 'NA'}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-900">{booking.memberId?.name || 'Unknown'}</p>
                                                                <p className="text-xs text-gray-500">{booking.memberId?.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">{statusBadge}</td>
                                                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                                        {attRecord
                                                            ? new Date(attRecord.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                            : '-'
                                                        }
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500 capitalize">
                                                        {attRecord ? (
                                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs ${attRecord.method === 'qr' ? 'bg-purple-50 text-purple-700' : 'bg-orange-50 text-orange-700'}`}>
                                                                {attRecord.method === 'qr' ? '📷 QR Scan' : '✍️ Manual'}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="p-16 text-center bg-white rounded-xl border border-dashed border-gray-300">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">Select a class from the dropdown above to view its attendance records.</p>
                </div>
            )}
        </div>
    );
};

export default TrainerAttendance;
