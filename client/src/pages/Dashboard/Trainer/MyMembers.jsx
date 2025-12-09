import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';

const MyMembers = () => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [selectedMember, setSelectedMember] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [openDropdownId, setOpenDropdownId] = useState(null);

    // Details Data State
    const [memberDetails, setMemberDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Progress Form State
    const [progressForm, setProgressForm] = useState({
        weight: '',
        bodyFat: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const response = await api.get('/users/my-members');
            // Transform data if needed
            const realMembers = response.data.map(m => ({
                _id: m._id,
                name: m.name,
                email: m.email,
                avatar: m.avatar,
                plan: m.plan || 'No Plan',
                progress: 'Active' // Placeholder status
            }));
            setMembers(realMembers);
        } catch (error) {
            console.error("Failed to fetch members", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (memberId) => {
        setOpenDropdownId(null);
        setSelectedMember(members.find(m => m._id === memberId));
        setShowDetailsModal(true);
        setLoadingDetails(true);
        try {
            const response = await api.get(`/users/${memberId}/details`);
            setMemberDetails(response.data);
        } catch (error) {
            console.error("Error fetching details", error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleAddProgressClick = (memberId) => {
        setOpenDropdownId(null);
        setSelectedMember(members.find(m => m._id === memberId));
        setShowProgressModal(true);
        setProgressForm({
            weight: '',
            bodyFat: '',
            notes: '',
            date: new Date().toISOString().split('T')[0]
        });
    };

    const handleProgressSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/users/progress', {
                memberId: selectedMember._id,
                ...progressForm
            });
            alert('Progress recorded successfully!');
            setShowProgressModal(false);
        } catch (error) {
            console.error("Error saving progress", error);
            alert('Failed to save progress');
        }
    };

    // View Progress State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [progressHistory, setProgressHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const handleViewHistory = async (memberId) => {
        setOpenDropdownId(null);
        setSelectedMember(members.find(m => m._id === memberId));
        setShowHistoryModal(true);
        setLoadingHistory(true);
        try {
            const response = await api.get(`/users/${memberId}/progress`);
            setProgressHistory(response.data);
        } catch (error) {
            console.error("Error fetching progress history", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.actions-dropdown-container')) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);


    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900">My Members</h2>
            <div className="card">
                <div className="overflow-x-visible"> {/* overflow-visible for dropdowns */}
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name & Contact</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {members.map((member) => (
                                <tr key={member._id} className="hover:bg-gray-50/50 transition-colors duration-150">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {member.avatar ? (
                                                <img src={member.avatar} alt={member.name} className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
                                            ) : (
                                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-primary-100 to-blue-100 flex items-center justify-center text-primary-700 font-bold">
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="ml-4">
                                                <div className="text-sm font-semibold text-gray-900">{member.name}</div>
                                                <div className="text-xs text-gray-500">{member.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                            {member.plan}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${member.progress === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {member.progress}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative actions-dropdown-container">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenDropdownId(openDropdownId === member._id ? null : member._id);
                                            }}
                                            className="text-gray-400 hover:text-gray-600 focus:outline-none p-2 rounded-full hover:bg-gray-100"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                            </svg>
                                        </button>

                                        {/* Dropdown Menu */}
                                        {openDropdownId === member._id && (
                                            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 transform origin-top-right transition-all">
                                                <div className="py-1" role="menu">
                                                    <button
                                                        onClick={() => handleViewDetails(member._id)}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        View Details
                                                    </button>
                                                    <button
                                                        onClick={() => handleAddProgressClick(member._id)}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                                        Add Progress Note
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewHistory(member._id)}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                                        View Progress History
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Details Modal */}
            {showDetailsModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" onClick={() => setShowDetailsModal(false)}>
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start w-full">
                                    <div className="w-full">
                                        <div className="flex justify-between items-center mb-5">
                                            <h3 className="text-xl leading-6 font-bold text-gray-900">Member Details</h3>
                                            <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-500">
                                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>

                                        {loadingDetails ? (
                                            <div className="flex justify-center py-10">
                                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                                            </div>
                                        ) : memberDetails ? (
                                            <div className="space-y-6">
                                                {/* Basic Info */}
                                                <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-xl">
                                                    {memberDetails.member.avatar ? (
                                                        <img src={memberDetails.member.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-2xl">
                                                            {memberDetails.member.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h4 className="text-lg font-bold text-gray-900">{memberDetails.member.name}</h4>
                                                        <p className="text-sm text-gray-500">{memberDetails.member.email}</p>
                                                        <p className="text-sm text-gray-500">{memberDetails.member.phoneNumber || 'No phone'}</p>
                                                    </div>
                                                </div>

                                                {/* Fitness Profile (NEW) */}
                                                {memberDetails.member.profile && (
                                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                                        <h4 className="font-semibold text-blue-900 mb-2">Fitness Profile</h4>
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                                            <div>
                                                                <p className="text-blue-500 text-xs uppercase font-bold">Age</p>
                                                                <p className="font-medium text-blue-900">{memberDetails.member.profile.age || 'N/A'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-blue-500 text-xs uppercase font-bold">Gender</p>
                                                                <p className="font-medium text-blue-900 capitalize">{memberDetails.member.profile.gender || 'N/A'}</p>
                                                            </div>
                                                            <div className="col-span-2">
                                                                <p className="text-blue-500 text-xs uppercase font-bold">Goals</p>
                                                                <p className="font-medium text-blue-900">{memberDetails.member.profile.goals || 'No specific goals'}</p>
                                                            </div>
                                                            <div className="col-span-2 sm:col-span-4">
                                                                <p className="text-blue-500 text-xs uppercase font-bold">Health Conditions</p>
                                                                <p className="font-medium text-blue-900">{memberDetails.member.profile.healthConditions || 'None reported'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {/* Membership Info */}
                                                    <div className="border rounded-xl p-4">
                                                        <h4 className="font-semibold text-gray-900 mb-2 border-b pb-2">Membership</h4>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">Plan:</span>
                                                                <span className="font-medium">{memberDetails.membership?.planName || 'None'}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">Status:</span>
                                                                <span className={`font-medium capitalize ${memberDetails.membership?.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
                                                                    {memberDetails.membership?.status || 'N/A'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">Expires:</span>
                                                                <span className="font-medium">
                                                                    {memberDetails.membership?.expiry ? new Date(memberDetails.membership.expiry).toLocaleDateString() : 'N/A'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Attendance Stats */}
                                                    <div className="border rounded-xl p-4">
                                                        <h4 className="font-semibold text-gray-900 mb-2 border-b pb-2">Attendance</h4>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-500">Total Classes:</span>
                                                            <span className="text-2xl font-bold text-primary-600">{memberDetails.attendanceStats?.totalClasses || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Class History */}
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 mb-3">Recent Class History</h4>
                                                    {memberDetails.classHistory && memberDetails.classHistory.length > 0 ? (
                                                        <div className="bg-gray-50 rounded-xl overflow-hidden">
                                                            <table className="min-w-full text-sm">
                                                                <thead className="bg-gray-100 text-gray-500">
                                                                    <tr>
                                                                        <th className="px-4 py-2 text-left font-medium">Class</th>
                                                                        <th className="px-4 py-2 text-right font-medium">Date</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-200">
                                                                    {memberDetails.classHistory.map((item, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className="px-4 py-2 font-medium text-gray-900">{item.classId?.name || 'Unknown Class'}</td>
                                                                            <td className="px-4 py-2 text-right text-gray-500">
                                                                                {new Date(item.classId?.startTime).toLocaleDateString()}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-500 italic">No recent classes found.</p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-center text-gray-500">No details available.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setShowDetailsModal(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Progress Modal */}
            {showProgressModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" onClick={() => setShowProgressModal(false)}>
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <form onSubmit={handleProgressSubmit}>
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="w-full">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Add Progress Note</h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Date Recorded</label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={progressForm.date}
                                                        onChange={(e) => setProgressForm({ ...progressForm, date: e.target.value })}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            required
                                                            value={progressForm.weight}
                                                            onChange={(e) => setProgressForm({ ...progressForm, weight: e.target.value })}
                                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Body Fat (%)</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={progressForm.bodyFat}
                                                            onChange={(e) => setProgressForm({ ...progressForm, bodyFat: e.target.value })}
                                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                                                    <textarea
                                                        rows="3"
                                                        value={progressForm.notes}
                                                        onChange={(e) => setProgressForm({ ...progressForm, notes: e.target.value })}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                                        placeholder="Weekly progress summary..."
                                                    ></textarea>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="submit"
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Save Progress
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                        onClick={() => setShowProgressModal(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}


            {/* View Progress History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" onClick={() => setShowHistoryModal(false)}>
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start w-full">
                                    <div className="w-full">
                                        <div className="flex justify-between items-center mb-5">
                                            <h3 className="text-xl leading-6 font-bold text-gray-900">
                                                {selectedMember?.name}'s Progress
                                            </h3>
                                            <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-500">
                                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>

                                        {loadingHistory ? (
                                            <div className="flex justify-center py-10">
                                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                                            </div>
                                        ) : progressHistory.length > 0 ? (
                                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                                                <table className="min-w-full divide-y divide-gray-300">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Date</th>
                                                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Weight</th>
                                                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Body Fat</th>
                                                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Notes</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 bg-white">
                                                        {progressHistory.map((entry) => (
                                                            <tr key={entry._id}>
                                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                                                                    {new Date(entry.date).toLocaleDateString()}
                                                                </td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                                    {entry.weight} kg
                                                                </td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                                    {entry.bodyFat ? `${entry.bodyFat}%` : '-'}
                                                                </td>
                                                                <td className="px-3 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                                    {entry.notes || '-'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                                <p className="text-gray-500">No progress records found for this member.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setShowHistoryModal(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyMembers;
