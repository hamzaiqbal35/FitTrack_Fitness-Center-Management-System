import React, { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';

const ManageMembers = () => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchMembers = async () => {
        try {
            // Get all users via admin endpoint
            const response = await adminService.getUsers();
            // Handle both array (legacy) and object response formats
            const allUsers = response.users || (Array.isArray(response) ? response : []);
            // Filter only members
            const onlyMembers = allUsers.filter(u => u.role === 'member');
            setMembers(onlyMembers);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch members", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleToggleStatus = async (user) => {
        const action = user.isActive ? 'Suspend' : 'Activate';
        if (!window.confirm(`Are you sure you want to ${action} this member?`)) return;

        try {
            if (user.isActive) {
                await adminService.suspendUser(user._id);
            } else {
                await adminService.activateUser(user._id);
            }
            fetchMembers();
        } catch (error) {
            console.error("Failed to update status", error);
        }
    }



    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900">Manage Members</h2>

            <div className="card overflow-hidden">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Member Directory</h3>
                {loading ? <p>Loading...</p> : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {members.map((member) => (
                                    <tr key={member._id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center gap-3">
                                            {member.avatar ? (
                                                <img src={member.avatar} alt={member.name} className="h-8 w-8 rounded-full object-cover" />
                                            ) : (
                                                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xs">
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            {member.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(member.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${member.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {member.isActive ? 'Active' : 'Suspended'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleToggleStatus(member)}
                                                className={`${member.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                                            >
                                                {member.isActive ? 'Suspend' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {members.length === 0 && <p className="p-4 text-center text-gray-500">No members found.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageMembers;
