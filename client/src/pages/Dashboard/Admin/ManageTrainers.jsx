import React, { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import AvailabilityModal from '../../Dashboard/Trainer/AvailabilityModal';
// Using inline SVG icons to avoid external dependency issues if react-icons is not installed
// If the user has react-icons, we could switch, but SVGs are safer for immediate 'wow' without install steps.

const ManageTrainers = () => {
    const [trainers, setTrainers] = useState([]);
    const [filteredTrainers, setFilteredTrainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTrainerId, setCurrentTrainerId] = useState(null);
    const [availabilityTrainer, setAvailabilityTrainer] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        specialization: '',
        experience: 0
    });

    useEffect(() => {
        fetchTrainers();
    }, []);

    useEffect(() => {
        const results = trainers.filter(trainer =>
            trainer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trainer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (trainer.specialization && trainer.specialization.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setFilteredTrainers(results);
    }, [searchTerm, trainers]);

    const fetchTrainers = async () => {
        try {
            const data = await adminService.getUsers();
            const users = Array.isArray(data) ? data : (data.users || []);
            const trainerList = users.filter(u => u.role === 'trainer');
            setTrainers(trainerList);
            setFilteredTrainers(trainerList);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch trainers", error);
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', email: '', password: '', specialization: '', experience: 0 });
        setIsEditing(false);
        setCurrentTrainerId(null);
    };

    const handleCreateOrUpdateTrainer = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                const updateData = { ...formData };
                if (!updateData.password) delete updateData.password;
                await adminService.updateUser(currentTrainerId, updateData);
                // alert('Trainer updated successfully'); // Removed for cleaner UX
            } else {
                await adminService.createTrainer(formData);
                // alert('Trainer created successfully'); // Removed for cleaner UX
            }
            setIsModalOpen(false);
            resetForm();
            fetchTrainers();
        } catch (error) {
            console.error(isEditing ? "Failed to update" : "Failed to create", error);
            alert(error.response?.data?.message || "Operation failed");
        }
    };

    const handleEditClick = (trainer) => {
        setFormData({
            name: trainer.name,
            email: trainer.email,
            password: '',
            specialization: trainer.specialization || '',
            experience: trainer.experience || 0
        });
        setCurrentTrainerId(trainer._id);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id) => {
        if (!window.confirm('Are you sure you want to PERMANENTLY DELETE this trainer? (Irreversible)')) return;
        try {
            await adminService.deleteUser(id);
            fetchTrainers();
        } catch (error) {
            alert('Failed to delete trainer');
        }
    };

    const handleToggleStatus = async (user) => {
        const action = user.isActive ? 'suspend' : 'activate';
        // Simpler confirm
        if (!window.confirm(`Confirm ${action} for ${user.name}?`)) return;

        try {
            if (user.isActive) {
                await adminService.suspendUser(user._id);
            } else {
                await adminService.activateUser(user._id);
            }
            fetchTrainers();
        } catch (error) {
            alert('Failed to update status');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in relative min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600">
                        Manage Trainers
                    </h2>
                    <p className="text-gray-500 mt-1">Oversee your fitness experts and their status.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            name="search"
                            id="search-trainers"
                            aria-label="Search trainers"
                            placeholder="Search trainers..."
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-full focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none shadow-sm transition-all w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <button
                        onClick={() => {
                            resetForm();
                            setIsModalOpen(true);
                        }}
                        className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-500/30 hover:shadow-primary-600/40 transform hover:-translate-y-0.5 transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Trainer
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>
                    ))}
                </div>
            ) : filteredTrainers.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <div className="text-gray-400 mb-4 inline-block p-4 bg-white rounded-full shadow-sm">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No trainers found</h3>
                    <p className="text-gray-500">Try adjusting your search or add a new trainer.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTrainers.map((trainer) => (
                        <div key={trainer._id} className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 relative overflow-hidden">
                            {/* Status Indicator Stripe */}
                            <div className={`absolute top-0 left-0 w-full h-1 ${trainer.isActive ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-orange-500'}`}></div>

                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg overflow-hidden ${trainer.isActive ? 'bg-gradient-to-br from-primary-500 to-indigo-600' : 'bg-gray-400'}`}>
                                        {trainer.avatar ? (
                                            <img src={trainer.avatar} alt={trainer.name} className="h-full w-full object-cover" />
                                        ) : (
                                            trainer.name.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg group-hover:text-primary-600 transition-colors">{trainer.name}</h3>
                                        <p className="text-gray-500 text-sm">{trainer.email}</p>
                                    </div>
                                </div>
                                <div className="">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${trainer.isActive ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                        {trainer.isActive ? 'Active' : 'Suspended'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                    <svg className="w-4 h-4 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span className="font-medium">Spec:</span>
                                    <span className="ml-2 truncate">{trainer.specialization || 'General Fitness'}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                    <svg className="w-4 h-4 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-medium">Exp:</span>
                                    <span className="ml-2">{trainer.experience || 0} Years</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => handleEditClick(trainer)}
                                    className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-primary-600 transition-colors flex items-center justify-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                    Edit
                                </button>
                                <div className="w-px h-6 bg-gray-200"></div>
                                <button
                                    onClick={() => setAvailabilityTrainer(trainer)}
                                    className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors flex items-center justify-center gap-1"
                                    title="View Availability"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    Schedule
                                </button>
                                <div className="w-px h-6 bg-gray-200"></div>
                                <button
                                    onClick={() => handleToggleStatus(trainer)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors ${trainer.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                                >
                                    {trainer.isActive ? (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                                            Suspend
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            Activate
                                        </>
                                    )}
                                </button>
                                <div className="w-px h-6 bg-gray-200"></div>
                                <button
                                    onClick={() => handleDeleteClick(trainer._id)}
                                    className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                                    title="Permanent Delete"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )
            }

            {/* Modal - Modernized */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            {/* Background overlay */}
                            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity backdrop-filter backdrop-blur-sm" aria-hidden="true" onClick={() => setIsModalOpen(false)}></div>

                            {/* Modal panel */}
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full border border-gray-100">
                                <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-gray-900" id="modal-title">
                                        {isEditing ? 'Edit Trainer Profile' : 'Add New Trainer'}
                                    </h3>
                                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>

                                <form onSubmit={handleCreateOrUpdateTrainer} className="px-8 py-6 space-y-5">
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="name" className="label">Full Name</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                                </div>
                                                <input type="text" id="name" name="name" required className="input-field pl-10" placeholder="e.g. John Doe" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="email" className="label">Email Address</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path></svg>
                                                </div>
                                                <input type="email" id="email" name="email" required className="input-field pl-10" placeholder="e.g. john@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="password" className="label">Password <span className="text-gray-400 font-normal text-xs">{isEditing ? '(Leave blank to stay)' : '(Required)'}</span></label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                                </div>
                                                <input type="password" id="password" name="password" required={!isEditing} className="input-field pl-10" placeholder={isEditing ? "••••••••" : "Choose a secure password"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="specialization" className="label">Specialization</label>
                                                <input type="text" id="specialization" name="specialization" className="input-field" placeholder="e.g. Yoga" value={formData.specialization} onChange={e => setFormData({ ...formData, specialization: e.target.value })} />
                                            </div>
                                            <div>
                                                <label htmlFor="experience" className="label">Experience (Yrs)</label>
                                                <input type="number" id="experience" name="experience" className="input-field" placeholder="e.g. 5" value={formData.experience} onChange={e => setFormData({ ...formData, experience: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex items-center gap-3">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn-secondary py-3">Cancel</button>
                                        <button type="submit" className="flex-1 btn-primary py-3 shadow-lg shadow-primary-500/30">
                                            {isEditing ? 'Save Changes' : 'Create Account'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Availability Modal */}
            {availabilityTrainer && (
                <AvailabilityModal
                    currentAvailability={availabilityTrainer.availability}
                    readOnly={true}
                    onClose={() => setAvailabilityTrainer(null)}
                />
            )}

        </div >
    );
};

export default ManageTrainers;
