import React, { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';

const ManageMembershipPlans = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        interval: 'month',
        classesPerMonth: 0,
        features: ''
    });

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const data = await adminService.getSubscriptionPlans();
            setPlans(data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch plans", error);
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const planData = {
            ...formData,
            price: Number(formData.price),
            classesPerMonth: Number(formData.classesPerMonth),
            features: formData.features.split(',').map(f => f.trim()).filter(f => f)
        };

        try {
            if (editingPlan) {
                await adminService.updateSubscriptionPlan(editingPlan._id, planData);
                alert("Plan updated successfully!");
            } else {
                await adminService.createSubscriptionPlan(planData);
                alert("Plan created successfully!");
            }
            setIsModalOpen(false);
            setEditingPlan(null);
            setFormData({ name: '', description: '', price: '', interval: 'month', classesPerMonth: 0, features: '' });
            fetchPlans();
        } catch (error) {
            console.error("Failed to save plan", error);
            alert("Failed to save plan: " + (error.response?.data?.message || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to deactivate this plan?")) return;
        try {
            await adminService.deleteSubscriptionPlan(id);
            alert("Plan deactivated");
            fetchPlans();
        } catch (error) {
            alert("Failed to deactivate plan");
        }
    };

    const openEditModal = (plan) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            description: plan.description,
            price: plan.price / 100,
            interval: plan.interval,
            classesPerMonth: plan.classesPerMonth,
            features: plan.features.join(', ')
        });
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Gym Membership Plans</h2>
                <button
                    onClick={() => {
                        setEditingPlan(null);
                        setFormData({ name: '', description: '', price: '', interval: 'month', classesPerMonth: 0, features: '' });
                        setIsModalOpen(true);
                    }}
                    className="btn-primary"
                >
                    + Create New Plan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <div key={plan._id} className={`card ${!plan.isActive ? 'opacity-75 bg-gray-50' : ''}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                                <p className="text-primary-600 font-bold text-lg mt-1">
                                    Rs. {plan.price / 100} / {plan.interval}
                                </p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${plan.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {plan.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <p className="text-gray-600 text-sm mt-3">{plan.description}</p>

                        <div className="mt-4 space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase">Features</p>
                            <ul className="text-sm space-y-1">
                                {plan.features.map((f, i) => (
                                    <li key={i} className="flex items-center gap-2 text-gray-700">
                                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                        {f}
                                    </li>
                                ))}
                                <li className="flex items-center gap-2 text-gray-700">
                                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    {plan.classesPerMonth === 0 ? 'Unlimited Classes' : `${plan.classesPerMonth} Classes/Month`}
                                </li>
                            </ul>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
                            <button onClick={() => openEditModal(plan)} className="flex-1 btn-secondary text-sm">Edit</button>
                            {plan.isActive && (
                                <button onClick={() => handleDelete(plan._id)} className="flex-1 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors">Deactivate</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" onClick={() => setIsModalOpen(false)}>
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <h3 className="text-lg font-medium text-gray-900">{editingPlan ? 'Edit Plan' : 'Create New Membership Plan'}</h3>

                                <div>
                                    <label className="label">Plan Name</label>
                                    <input type="text" className="input-field" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Gold Membership" />
                                </div>

                                <div>
                                    <label className="label">Description</label>
                                    <textarea className="input-field" required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Short description..." />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Price (in PKR)</label>
                                        <input type="number" className="input-field" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="e.g. 5000" />
                                        <p className="text-xs text-gray-500 mt-1">Amount in Rupees</p>
                                    </div>
                                    <div>
                                        <label className="label">Interval</label>
                                        <select className="input-field" value={formData.interval} onChange={e => setFormData({ ...formData, interval: e.target.value })}>
                                            <option value="month">Monthly</option>
                                            <option value="year">Yearly</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="label">Classes/Month (0 for Unlimited)</label>
                                    <input type="number" className="input-field" value={formData.classesPerMonth} onChange={e => setFormData({ ...formData, classesPerMonth: e.target.value })} />
                                </div>

                                <div>
                                    <label className="label">Features (comma separated)</label>
                                    <textarea className="input-field" value={formData.features} onChange={e => setFormData({ ...formData, features: e.target.value })} placeholder="Access to gym, Free towel, etc." />
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                                    <button type="submit" className="btn-primary">{editingPlan ? 'Update Plan' : 'Create Plan'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageMembershipPlans;
