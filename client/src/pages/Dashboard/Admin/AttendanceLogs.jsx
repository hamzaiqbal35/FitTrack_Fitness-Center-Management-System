import React, { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const AttendanceLogs = () => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const data = await adminService.getAttendanceReport(dateRange.startDate, dateRange.endDate);
            // Ensure data is an array
            setAttendanceData(data.attendance || []);
        } catch (error) {
            console.error("Failed to fetch attendance logs", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
    }, [dateRange]);

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setDateRange(prev => ({ ...prev, [name]: value }));
    };

    // Chart Data Preparation
    const chartData = {
        labels: attendanceData.map(d => d._id),
        datasets: [
            {
                label: 'Total Check-ins',
                data: attendanceData.map(d => d.count),
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1,
            },
            {
                label: 'QR Scans',
                data: attendanceData.map(d => d.qrCount),
                backgroundColor: 'rgba(16, 185, 129, 0.5)',
                borderColor: 'rgb(16, 185, 129)',
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Daily Attendance Trends' },
        },
        scales: {
            y: {
                ticks: {
                    precision: 0
                },
                beginAtZero: true
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900">Attendance Logs</h2>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                        type="date"
                        name="startDate"
                        value={dateRange.startDate}
                        onChange={handleDateChange}
                        className="input-field"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                        type="date"
                        name="endDate"
                        value={dateRange.endDate}
                        onChange={handleDateChange}
                        className="input-field"
                    />
                </div>
                <button
                    onClick={fetchAttendance}
                    className="btn-primary"
                >
                    Refresh Data
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium">Total Visits</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                        {attendanceData.reduce((acc, curr) => acc + curr.count, 0)}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium">QR Check-ins</h3>
                    <p className="text-3xl font-bold text-primary-600 mt-2">
                        {attendanceData.reduce((acc, curr) => acc + curr.qrCount, 0)}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium">Manual Check-ins</h3>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                        {attendanceData.reduce((acc, curr) => acc + curr.manualCount, 0)}
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                {loading ? <p className="text-center py-10">Loading chart...</p> : <Bar options={options} data={chartData} />}
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Daily Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QR Scans</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manual</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {attendanceData.map((day) => (
                                <tr key={day._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{day._id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{day.count}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{day.qrCount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{day.manualCount}</td>
                                </tr>
                            ))}
                            {attendanceData.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                        No attendance records found for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AttendanceLogs;
