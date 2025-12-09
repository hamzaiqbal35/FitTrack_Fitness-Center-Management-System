import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

const Profile = () => {
    const { user, login, logout } = useAuth(); // login is used to update local user state
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', content: '' });

    // Password Visibility State
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Avatar
    const fileInputRef = useRef(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);

    // Delete Account Modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [activePlanWarning, setActivePlanWarning] = useState(null);
    const [hasActiveSub, setHasActiveSub] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        currentPassword: '',
        password: '',
        confirmPassword: '',
        phoneNumber: '',
        // Member specific
        age: '',
        gender: '',
        goals: '',
        healthConditions: '',
        // Trainer specific
        specialization: '',
        experience: '',
    });

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || '',
                email: user.email || '',
                phoneNumber: user.phoneNumber || '',
                // Flatten nested profile object for form
                age: user.profile?.age || '',
                gender: user.profile?.gender || '',
                goals: user.profile?.goals || '',
                healthConditions: user.profile?.healthConditions || '',
                // Trainer fields
                specialization: user.specialization || '',
                experience: user.experience || '',
            }));
            setAvatarPreview(user.avatar);
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const triggerFileInput = () => {
        if (isEditing) {
            fileInputRef.current.click();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', content: '' });

        if (formData.password && formData.password !== formData.confirmPassword) {
            setMessage({ type: 'error', content: 'Passwords do not match' });
            return;
        }

        if ((formData.password || formData.email !== user.email) && !formData.currentPassword) {
            setMessage({ type: 'error', content: 'Current password is required to save changes' });
            return;
        }

        setLoading(true);
        try {
            const data = new FormData();

            // Append basic fields based on role permissions
            // Admin: Name, Email, Phone
            // Trainer: Phone
            // Member: Phone (Email disabled)

            if (user.role === 'admin') {
                data.append('name', formData.name);
                data.append('email', formData.email);
            }
            // All roles can edit phone
            data.append('phoneNumber', formData.phoneNumber);

            if (formData.password) {
                data.append('password', formData.password);
                data.append('currentPassword', formData.currentPassword);
            }

            if (avatarFile) {
                data.append('avatar', avatarFile);
            }

            // Role specific data
            if (user.role === 'member') {
                const profileData = {
                    age: formData.age,
                    gender: formData.gender,
                    goals: formData.goals,
                    healthConditions: formData.healthConditions,
                };
                data.append('profile', JSON.stringify(profileData));
            }

            // Trainer updates (if allowed to edit details?)
            // Requirement: "should be able to see his professional details... but should not be able to edit or change them."
            // So we DO NOT append specialization/experience for Trainer.
            // Admin CAN edit everything for himself? "Should be able to change or edit his everthing"
            if (user.role === 'admin') {
                // If admin has these fields? Usually Admin doesn't have trainer fields, but if `updateUserProfile` handles `specialization`...
                // The backend User model has them top-level. 
                // Let's assume Admin just updates basic info unless he is also a trainer?
                // Current admin user seed likely doesn't have specialization.
                // We will skip for now unless needed.
            }


            const response = await api.put('/users/profile', data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
            }

            setMessage({ type: 'success', content: 'Profile updated successfully' });
            setIsEditing(false);
            setAvatarFile(null);

            // Reload to refresh context
            window.location.reload();

        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', content: error.response?.data?.message || 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = async () => {
        // Check for active subscriptions if member
        if (user.role === 'member') {
            try {
                const { data } = await api.get('/subscriptions/my-subscriptions');
                const active = data.some(sub => sub.status === 'active' || sub.status === 'trialing');
                setHasActiveSub(active);
            } catch (e) {
                console.error("Failed to fetch subscriptions", e);
                // Fallback: default to false (no warning about sub, but generic warning remains)
            }
        }
        setShowDeleteModal(true);
        setDeletePassword('');
        setDeleteError('');
    };

    const confirmDelete = async () => {
        if (!deletePassword) {
            setDeleteError('Password is required');
            return;
        }
        setDeleteLoading(true);
        try {
            await api.delete('/users/profile', {
                data: { currentPassword: deletePassword } // Axios DELETE body
            });
            // Logout
            logout();
        } catch (error) {
            setDeleteError(error.response?.data?.message || 'Failed to delete account');
            setDeleteLoading(false);
        }
    };

    const canEditName = user?.role === 'admin';
    const canEditEmail = user?.role === 'admin';
    // Member cannot edit email (req 1). Trainer cannot edit email (req 1). Admin can.

    // Trainer Details: Read Only
    // Member Details: Editable

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>

            {message.content && (
                <div className={`p-4 rounded-xl ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {message.content}
                </div>
            )}

            <div className="card">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar / Avatar Section */}
                    <div className="w-full md:w-1/3 flex flex-col items-center space-y-4">
                        <div
                            className={`relative h-40 w-40 rounded-full flex items-center justify-center text-white text-5xl font-bold shadow-lg overflow-hidden ${isEditing ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                            onClick={triggerFileInput}
                        >
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Profile" className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </div>
                            )}

                            {isEditing && (
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-sm font-medium opacity-0 hover:opacity-100 transition-opacity">
                                    Change Photo
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*"
                        />

                        <div className="text-center">
                            <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                            <p className="text-sm font-medium text-gray-500 capitalize">{user?.role}</p>
                            <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
                        </div>

                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="w-full btn-primary"
                            >
                                Edit Profile
                            </button>
                        )}

                        {/* Delete Account Button (Member Only - with warning, Admin/Trainer Disabled) */}
                        {/* Requirement: 
                             Admin: Disable delete account.
                             Trainer: Disable delete account.
                             Member: Enable delete account.
                         */}
                        {user?.role === 'member' && !isEditing && (
                            <button
                                onClick={handleDeleteClick}
                                className="w-full btn-secondary text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 mt-4"
                            >
                                Delete Account
                            </button>
                        )}
                        {(user?.role === 'admin' || user?.role === 'trainer') && !isEditing && (
                            <button
                                disabled
                                className="w-full btn-secondary text-gray-400 cursor-not-allowed mt-4"
                                title="Account deletion is disabled for this role"
                            >
                                Delete Account (Disabled)
                            </button>
                        )}

                    </div>

                    {/* Main Content Form */}
                    <div className="w-full md:w-2/3">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Full Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            disabled={!isEditing || !canEditName}
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="input-field disabled:bg-gray-50 disabled:text-gray-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Email Address</label>
                                        <input
                                            type="email"
                                            name="email"
                                            disabled={!isEditing || !canEditEmail}
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="input-field disabled:bg-gray-50 disabled:text-gray-500"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="label">Phone Number</label>
                                        <input
                                            type="tel"
                                            name="phoneNumber"
                                            disabled={!isEditing}
                                            value={formData.phoneNumber}
                                            onChange={handleChange}
                                            className="input-field disabled:bg-gray-50 disabled:text-gray-500"
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Role Specific Fields */}
                            {user?.role === 'member' && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 pt-4">Fitness Profile</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Age</label>
                                            <input
                                                type="number"
                                                name="age"
                                                disabled={!isEditing}
                                                value={formData.age}
                                                onChange={handleChange}
                                                className="input-field disabled:bg-gray-50 disabled:text-gray-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Gender</label>
                                            <select
                                                name="gender"
                                                disabled={!isEditing}
                                                value={formData.gender}
                                                onChange={handleChange}
                                                className="input-field disabled:bg-gray-50 disabled:text-gray-500"
                                            >
                                                <option value="">Select Gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="label">Fitness Goals</label>
                                            <textarea
                                                name="goals"
                                                disabled={!isEditing}
                                                value={formData.goals}
                                                onChange={handleChange}
                                                className="input-field disabled:bg-gray-50 disabled:text-gray-500"
                                                rows="3"
                                                placeholder="What do you want to achieve?"
                                            ></textarea>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="label">Health Conditions</label>
                                            <textarea
                                                name="healthConditions"
                                                disabled={!isEditing}
                                                value={formData.healthConditions}
                                                onChange={handleChange}
                                                className="input-field disabled:bg-gray-50 disabled:text-gray-500"
                                                rows="2"
                                                placeholder="Any allergies or injuries?"
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {user?.role === 'trainer' && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 pt-4">Professional Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Specialization</label>
                                            <input
                                                type="text"
                                                name="specialization"
                                                disabled={true} // Trainer cannot edit
                                                value={formData.specialization}
                                                className="input-field disabled:bg-gray-50 disabled:text-gray-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Experience (Years)</label>
                                            <input
                                                type="number"
                                                name="experience"
                                                disabled={true} // Trainer cannot edit
                                                value={formData.experience}
                                                className="input-field disabled:bg-gray-50 disabled:text-gray-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Password Section (Only in Edit Mode) */}
                            {isEditing && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 pt-4">Security</h3>

                                    {/* Current Password - Required for any major change */}
                                    <div className="relative">
                                        <label className="label">Current Password <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <input
                                                type={showCurrentPassword ? "text" : "password"}
                                                name="currentPassword"
                                                value={formData.currentPassword}
                                                onChange={handleChange}
                                                className="input-field pr-10"
                                                placeholder="Required to save changes"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                                            >
                                                {showCurrentPassword ? (
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                ) : (
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="relative">
                                            <label className="label">New Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showNewPassword ? "text" : "password"}
                                                    name="password"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    className="input-field pr-10"
                                                    placeholder="Leave blank to keep current"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                                                >
                                                    {showNewPassword ? (
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                    ) : (
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <label className="label">Confirm New Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    name="confirmPassword"
                                                    value={formData.confirmPassword}
                                                    onChange={handleChange}
                                                    className="input-field pr-10"
                                                    placeholder="Confirm new password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                                                >
                                                    {showConfirmPassword ? (
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                    ) : (
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            {isEditing && (
                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setMessage({ type: '', content: '' });
                                            // Reset to initial state
                                            window.location.reload();
                                        }}
                                        className="btn-secondary"
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={loading}
                                    >
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            )}

                        </form>
                    </div>
                </div>
            </div>

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Account</h3>
                        {hasActiveSub && (
                            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">
                                <p className="font-semibold">Warning: You have active subscriptions!</p>
                                <p className="mt-1">They will be cancelled, but please ensure you want to proceed. This action is irreversible.</p>
                            </div>
                        )}
                        {!hasActiveSub && (
                            <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm mb-4">
                                <p>This action is irreversible. All your data will be removed.</p>
                            </div>
                        )}

                        <p className="text-gray-600 mb-4 text-sm">
                            Please enter your current password to confirm deletion.
                        </p>

                        {deleteError && (
                            <div className="text-red-500 text-sm mb-3">
                                {deleteError}
                            </div>
                        )}

                        <div className="space-y-3">
                            <input
                                type="password"
                                className="input-field"
                                placeholder="Current Password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="btn-secondary"
                                disabled={deleteLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium shadow-sm hover:shadow-red-500/30"
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
