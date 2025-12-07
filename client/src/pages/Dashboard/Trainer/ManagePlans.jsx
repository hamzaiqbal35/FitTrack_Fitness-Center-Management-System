import React, { useState, useEffect } from 'react';
import { trainingPlanService } from '../../../services/trainingPlanService';

const ManagePlans = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('workout'); // 'workout' or 'diet'
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [uploading, setUploading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficultyLevel: 'Intermediate', // For workout
        goal: 'Weight Loss', // For workout
        dietType: 'Balanced', // For diet
        calories: 2000, // For diet
        visibility: 'members_only',
        file: null
    });

    useEffect(() => {
        loadPlans();
    }, [activeTab]);

    const loadPlans = async () => {
        setLoading(true);
        try {
            let data;
            if (activeTab === 'workout') {
                data = await trainingPlanService.getWorkoutPlans();
            } else {
                data = await trainingPlanService.getDietPlans();
            }
            setPlans(data);
        } catch (error) {
            console.error("Failed to load plans", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        try {
            const data = new FormData();
            data.append('title', formData.title);
            data.append('description', formData.description);
            data.append('visibility', formData.visibility);

            if (formData.file) {
                data.append('file', formData.file);
            }

            if (activeTab === 'workout') {
                data.append('difficultyLevel', formData.difficultyLevel);
                data.append('goal', formData.goal);
                await trainingPlanService.uploadWorkoutPlan(data);
            } else {
                data.append('dietType', formData.dietType);
                data.append('calories', formData.calories);
                await trainingPlanService.uploadDietPlan(data);
            }

            setIsModalOpen(false);
            setFormData({
                title: '', description: '', difficultyLevel: 'Intermediate',
                goal: 'Weight Loss', dietType: 'Balanced', calories: 2000,
                visibility: 'members_only', file: null
            });
            loadPlans();
            alert('Plan uploaded successfully!');
        } catch (error) {
            console.error("Upload failed", error);
            alert(error.response?.data?.message || 'Failed to upload plan');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this plan?')) return;
        try {
            if (activeTab === 'workout') {
                await trainingPlanService.deleteWorkoutPlan(id);
            } else {
                await trainingPlanService.deleteDietPlan(id);
            }
            loadPlans();
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                    {activeTab === 'workout' ? 'Workout Plans' : 'Diet Plans'} Management
                </h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary"
                >
                    Upload New Plan
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('workout')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'workout'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Workout Plans
                    </button>
                    <button
                        onClick={() => setActiveTab('diet')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'diet'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Diet Plans
                    </button>
                </nav>
            </div>

            {/* List */}
            {loading ? <p>Loading...</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div key={plan._id} className="card hover:shadow-md transition-shadow">
                            <h3 className="font-bold text-lg text-gray-900">{plan.title}</h3>
                            <p className="text-xs text-primary-600 font-medium mb-1">
                                By {plan.trainerId?.name || 'Unknown Trainer'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{plan.description}</p>

                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium`}>
                                    {plan.visibility.replace('_', ' ')}
                                </span>
                                {activeTab === 'workout' ? (
                                    <>
                                        <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">{plan.difficultyLevel}</span>
                                        <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700">{plan.goal}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700">{plan.dietType}</span>
                                        <span className="text-xs px-2 py-1 rounded-full bg-gray-50 text-gray-700">{plan.calories} kcal</span>
                                    </>
                                )}
                            </div>

                            <div className="mt-4 flex justify-between items-center">
                                <a
                                    href={plan.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-600 hover:text-primary-800 text-sm font-medium hover:underline"
                                >
                                    Download PDF
                                </a>
                                <button
                                    onClick={() => handleDelete(plan._id)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                    {plans.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                            No plans found. Upload one to get started.
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold mb-4">Upload {activeTab === 'workout' ? 'Workout' : 'Diet'} Plan</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Title</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field mt-1"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    className="input-field mt-1"
                                    rows="3"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Visibility</label>
                                    <select
                                        className="input-field mt-1"
                                        value={formData.visibility}
                                        onChange={e => setFormData({ ...formData, visibility: e.target.value })}
                                    >
                                        <option value="public">Public (Everyone)</option>
                                        <option value="members_only">Members Only (Gym Members)</option>
                                    </select>
                                </div>



                                {activeTab === 'workout' ? (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Difficulty</label>
                                            <select
                                                className="input-field mt-1"
                                                value={formData.difficultyLevel}
                                                onChange={e => setFormData({ ...formData, difficultyLevel: e.target.value })}
                                            >
                                                <option value="Beginner">Beginner</option>
                                                <option value="Intermediate">Intermediate</option>
                                                <option value="Advanced">Advanced</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700">Goal</label>
                                            <input
                                                type="text"
                                                className="input-field mt-1"
                                                value={formData.goal}
                                                onChange={e => setFormData({ ...formData, goal: e.target.value })}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Calories</label>
                                            <input
                                                type="number"
                                                className="input-field mt-1"
                                                value={formData.calories}
                                                onChange={e => setFormData({ ...formData, calories: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700">Diet Type</label>
                                            <select
                                                className="input-field mt-1"
                                                value={formData.dietType}
                                                onChange={e => setFormData({ ...formData, dietType: e.target.value })}
                                            >
                                                <option value="Balanced">Balanced</option>
                                                <option value="Keto">Keto</option>
                                                <option value="Vegan">Vegan</option>
                                                <option value="Vegetarian">Vegetarian</option>
                                                <option value="Low-Carb">Low-Carb</option>
                                                <option value="High-Protein">High-Protein</option>
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">PDF File</label>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    required
                                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                    onChange={e => setFormData({ ...formData, file: e.target.files[0] })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn-secondary"
                                    disabled={uploading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary flex items-center gap-2"
                                    disabled={uploading}
                                >
                                    {uploading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Uploading...
                                        </>
                                    ) : (
                                        'Upload Plan'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagePlans;
