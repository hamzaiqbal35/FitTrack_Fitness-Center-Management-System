import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { attendanceService } from '../../../services/attendanceService';

const AttendanceModal = ({ classId, onClose, classDetails }) => {
    const [attendees, setAttendees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('roster'); // Default to roster (list view)
    const [scanResult, setScanResult] = useState(null); // { success: boolean, message: string, memberName?: string }
    const scannerRef = useRef(null);
    const isProcessing = useRef(false);

    useEffect(() => {
        loadData();
    }, [classId]);

    // Handle Scanner Lifecycle
    useEffect(() => {
        if (view === 'scanner') {
            const timeoutId = setTimeout(() => {
                const element = document.getElementById("reader");
                if (element && !scannerRef.current) {
                    try {
                        const scanner = new Html5QrcodeScanner(
                            "reader",
                            {
                                fps: 15,
                                qrbox: { width: 280, height: 280 }, // Layout fix
                                aspectRatio: 1.0,
                                disableFlip: true,
                                supportedScanTypes: [],
                                rememberLastUsedCamera: true
                            },
                            false
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
                    const memberId = member._id || 'unknown';

                    return {
                        _id: memberId,
                        bookingId: booking._id,
                        name: member.name || 'Unknown',
                        email: member.email || 'N/A',
                        avatar: member.avatar,
                        checkedIn: checkedInMap.has(memberId) || booking.status === 'checked_in',
                        checkInTime: checkedInMap.get(memberId) || booking.updatedAt
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
        if (isProcessing.current) return;

        isProcessing.current = true;

        try {
            const data = JSON.parse(decodedText);
            const bookingId = data.b;
            const token = data.t;

            if (!bookingId || !token) throw new Error("Invalid QR Code format");

            // Optimistic check for name
            const matchedAttendee = attendees.find(a => a.bookingId === bookingId);
            const memberName = matchedAttendee ? matchedAttendee.name : "Member";

            await attendanceService.checkInWithQR(bookingId, token);

            // Success Feedback
            setScanResult({
                success: true,
                message: "Check-in Successful!",
                memberName: memberName
            });

            await loadData();

            setTimeout(() => {
                setScanResult(null);
                isProcessing.current = false;
            }, 2500);

        } catch (error) {
            console.error("Scan failed", error);
            setScanResult({
                success: false,
                message: error.response?.data?.message || error.message || "Invalid QR Code"
            });

            setTimeout(() => {
                setScanResult(null);
                isProcessing.current = false;
            }, 2500);
        }
    };

    const handleScanFailure = (error) => {
        // console.warn(`Code scan error = ${error}`);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-white p-5 border-b border-gray-100 flex justify-between items-center z-10 sticky top-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            Attendance Manager
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            {classDetails.name} • {new Date(classDetails.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 bg-gray-50 gap-2">
                    <button
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${view === 'roster' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-600 hover:bg-white hover:text-primary-600'}`}
                        onClick={() => setView('roster')}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            Roster ({attendees.filter(a => a.checkedIn).length}/{attendees.length})
                        </div>
                    </button>
                    <button
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${view === 'scanner' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-600 hover:bg-white hover:text-primary-600'}`}
                        onClick={() => setView('scanner')}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Scan QR
                        </div>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative bg-gray-50 flex flex-col min-h-[500px]">
                    {view === 'roster' ? (
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
                                    <p className="text-gray-500 text-sm">Loading roster...</p>
                                </div>
                            ) : attendees.length > 0 ? (
                                attendees.map(member => (
                                    <div key={member.bookingId || member._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow">
                                        <div className="flex items-center">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-inner overflow-hidden ${member.checkedIn ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                {member.avatar ? (
                                                    <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    member.name?.charAt(0) || '?'
                                                )}
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm font-bold text-gray-900">{member.name}</p>
                                                <p className="text-xs text-gray-500">{member.email}</p>
                                            </div>
                                        </div>
                                        <div>
                                            {member.checkedIn ? (
                                                <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    <span className="text-xs font-bold">Done</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleCheckIn(member._id)}
                                                    className="text-xs font-semibold bg-white border border-primary-600 text-primary-600 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
                                                >
                                                    Mark Present
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                                    <p className="text-gray-500">No members booked.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center relative bg-black">
                            {/* Scanner Viewfinder Overlay */}
                            <div className="absolute inset-0 z-0 overflow-hidden">
                                <div id="reader" className="w-full h-full object-cover opacity-80"></div>
                            </div>

                            {/* Custom Overlay UI on top of camera */}
                            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
                                <div className="w-64 h-64 border-2 border-white/50 rounded-3xl relative">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-xl"></div>
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-500 rounded-tr-xl"></div>
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-500 rounded-bl-xl"></div>
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-xl"></div>

                                    {/* Scanning Line Animation */}
                                    <div className="absolute top-0 left-0 w-full h-1 bg-primary-400 bg-opacity-50 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-[scan_2s_infinite]"></div>
                                </div>
                                <p className="text-white/80 mt-8 text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
                                    Position QR code within frame
                                </p>
                            </div>

                            {/* SUCCESS / ERROR OVERLAY */}
                            {scanResult && (
                                <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-md transition-all duration-300 ${scanResult.success ? 'bg-green-500/90' : 'bg-red-500/90'}`}>
                                    <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center max-w-[80%] text-center animate-scale-in">
                                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${scanResult.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {scanResult.success ? (
                                                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            )}
                                        </div>

                                        <h4 className={`text-2xl font-bold mb-1 ${scanResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                            {scanResult.success ? 'Verified!' : 'Failed!'}
                                        </h4>

                                        {scanResult.success && scanResult.memberName && (
                                            <p className="text-lg font-medium text-gray-800 mb-1">{scanResult.memberName}</p>
                                        )}

                                        <p className="text-sm text-gray-500">{scanResult.message}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Inline Styles for custom animations not in standard Tailwind */}
            <style jsx>{`
                @keyframes scan {
                    0% { top: 10%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }
                .animate-scale-in {
                    animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                @keyframes scaleIn {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default AttendanceModal;
