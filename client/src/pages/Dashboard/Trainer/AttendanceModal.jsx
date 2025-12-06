import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { attendanceService } from '../../../services/attendanceService';

const AttendanceModal = ({ classId, onClose, classDetails }) => {
    const [attendees, setAttendees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('roster'); // 'roster' | 'scanner'
    const [scanResult, setScanResult] = useState(null);
    const scannerRef = useRef(null);

    useEffect(() => {
        loadData();
    }, [classId]);

    // Handle Scanner Lifecycle
    useEffect(() => {
        if (view === 'scanner') {
            // Give DOM time to render the #reader div
            const timeoutId = setTimeout(() => {
                // Check if scanner instance already exists to prevent duplicates
                // Note: html5-qrcode might attach to DOM ID so we must be careful with StrictMode
                // We rely on cleanup to clear it.
                const element = document.getElementById("reader");
                if (element && !scannerRef.current) {
                    try {
                        const scanner = new Html5QrcodeScanner(
                            "reader", 
                            { fps: 10, qrbox: { width: 250, height: 250 } },
                            /* verbose= */ false
                        );
                        scanner.render(handleScanSuccess, handleScanFailure);
                        scannerRef.current = scanner;
                    } catch (e) {
                        console.error("Scanner init error", e);
                    }
                }
            }, 100);
            
            return () => {
                clearTimeout(timeoutId);
                if (scannerRef.current) {
                    try {
                        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
                    } catch (e) { console.error("Clear error", e); }
                    scannerRef.current = null;
                }
            };
        } else {
            // Cleanup if switching away from scanner
            if (scannerRef.current) {
                 try {
                        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
                    } catch (e) { console.error("Clear error", e); }
                scannerRef.current = null;
            }
        }
    }, [view]);

    const loadData = async () => {
        setLoading(true);
        try {
            const attendanceData = await attendanceService.getClassAttendance(classId);
            
            if (attendanceData.bookings) {
                const checkedInMap = new Map();
                attendanceData.attendance.forEach(a => {
                    const mId = a.memberId._id || a.memberId;
                    checkedInMap.set(mId, a.checkedInAt);
                });

                const roster = attendanceData.bookings.map(booking => {
                    const member = booking.memberId || { _id: 'unknown', name: 'Unknown User', email: 'N/A' };
                    // Handle case where member might be null/deleted
                    const memberId = member._id || 'unknown';
                    
                    return {
                        _id: memberId,
                        bookingId: booking._id, 
                        name: member.name || 'Unknown',
                        email: member.email || 'N/A',
                        checkedIn: checkedInMap.has(memberId),
                        checkInTime: checkedInMap.get(memberId)
                    };
                });
                
                setAttendees(roster);
            } else {
                setAttendees([]);
            }
        } catch (error) {
            console.error("Failed to load attendance", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async (memberId) => {
        try {
            await attendanceService.manualCheckIn(classId, memberId);
            setAttendees(prev => prev.map(a =>
                a._id === memberId
                    ? { ...a, checkedIn: true, checkInTime: new Date().toISOString() }
                    : a
            ));
        } catch (error) {
            console.error("Check-in failed", error);
            alert("Failed to manual check-in: " + (error.response?.data?.message || "Unknown error"));
        }
    };

    const handleScanSuccess = async (decodedText, decodedResult) => {
        // Pause scanner to avoid multiple reads
        if (scannerRef.current) {
             try { scannerRef.current.pause(); } catch(e) {}
        }

        try {
            const data = JSON.parse(decodedText);
            const bookingId = data.b;
            const token = data.t;

            if (!bookingId || !token) throw new Error("Invalid QR Code format");

            await attendanceService.checkInWithQR(bookingId, token);
            setScanResult({ success: true, message: `Checked in successfully!` });
            
            // Refresh roster
            await loadData();
            
            // Resume after 2 seconds
            setTimeout(() => {
                setScanResult(null);
                if (scannerRef.current) {
                     try { scannerRef.current.resume(); } catch(e) {}
                }
            }, 2000);

        } catch (error) {
            console.error("Scan failed", error);
            setScanResult({ success: false, message: error.response?.data?.message || error.message || "Invalid QR Code" });
            
            setTimeout(() => {
                setScanResult(null);
                if (scannerRef.current) {
                     try { scannerRef.current.resume(); } catch(e) {}
                }
            }, 3000);
        }
    };

    const handleScanFailure = (error) => {
        // console.warn(`Code scan error = ${error}`);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Class Attendance</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex border-b border-gray-200 mb-4">
                    <button 
                        className={`py-2 px-4 ${view === 'roster' ? 'border-b-2 border-primary-600 text-primary-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setView('roster')}
                    >
                        Roster List
                    </button>
                    <button 
                        className={`py-2 px-4 ${view === 'scanner' ? 'border-b-2 border-primary-600 text-primary-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setView('scanner')}
                    >
                        Scan QR Code
                    </button>
                </div>

                <div className="mb-2">
                    <p className="text-sm text-gray-500">
                        {classDetails.name} • {new Date(classDetails.startTime).toLocaleString()}
                    </p>
                    <p className="text-sm font-medium mt-1">
                        Checked In: {attendees.filter(a => a.checkedIn).length} / {attendees.length}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto min-h-[300px]">
                    {view === 'roster' ? (
                        <div className="divide-y divide-gray-100">
                            {loading ? (
                                <p className="text-center py-4">Loading roster...</p>
                            ) : attendees.length > 0 ? (
                                attendees.map(member => (
                                    <div key={member.bookingId || member._id} className="py-3 flex justify-between items-center">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                                                {member.name?.charAt(0) || '?'}
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">{member.name}</p>
                                                <p className="text-xs text-gray-500">{member.email}</p>
                                            </div>
                                        </div>
                                        <div>
                                            {member.checkedIn ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Checked In {new Date(member.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleCheckIn(member._id)}
                                                    className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                                                >
                                                    Mark Present
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center py-6 text-gray-500">No members booked this class.</p>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div id="reader" className="w-full max-w-sm"></div>
                            {scanResult && (
                                <div className={`mt-4 p-3 rounded text-sm font-medium w-full text-center ${scanResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {scanResult.message}
                                </div>
                            )}
                            <p className="text-xs text-gray-500 mt-4 text-center">
                                Allow camera access to scan member QR codes.
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                    <button onClick={onClose} className="btn-secondary">Close</button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceModal;
