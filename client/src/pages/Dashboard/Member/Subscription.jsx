import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionService } from '../../../services/subscriptionService';
import { paymentService } from '../../../services/paymentService';

const Subscription = () => {
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    useEffect(() => {
        // Check for session_id in URL (Stripe redirect)
        const queryParams = new URLSearchParams(window.location.search);
        const sessionId = queryParams.get('session_id');

        if (sessionId) {
            // Clear URL param
            window.history.replaceState({}, document.title, window.location.pathname);

            setLoading(true);

            // Sync subscription with backend
            const sync = async () => {
                try {
                    await subscriptionService.syncSubscription(sessionId);
                    // loadSubscription(); // No need to reload here if we redirect
                    alert("Payment successful! Your subscription is now active.");
                    navigate('/dashboard'); // <--- Redirect to Dashboard
                } catch (error) {
                    console.error("Failed to sync subscription", error);
                    alert("Payment requires verification. Please wait for confirmation.");
                    loadSubscription();
                }
            };

            sync();
        } else {
            loadSubscription();
        }
    }, [navigate]);

    const loadSubscription = async () => {
        try {
            const subs = await subscriptionService.getMySubscriptions();
            const active = subs.find(s => ['active', 'trialing', 'past_due'].includes(s.status));
            setSubscription(active || null);
        } catch (error) {
            console.error("Failed to load subscription", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!window.confirm('Are you sure you want to cancel your subscription? You will lose access at the end of the billing period.')) return;

        try {
            await subscriptionService.cancelSubscription(subscription._id);
            alert('Subscription cancelled. You retain access until period end.');
            loadSubscription(); // Refresh
        } catch (error) {
            console.error("Cancellation failed", error);
            alert('Failed to cancel subscription');
        }
    };

    const [availablePlans, setAvailablePlans] = useState([]);
    const [payments, setPayments] = useState([]);

    useEffect(() => {
        loadSubscription();
        loadPlans();
        loadPayments();
    }, []);

    const loadPlans = async () => {
        try {
            const data = await subscriptionService.getPlans();
            setAvailablePlans(data);
        } catch (error) {
            console.error("Failed to fetch plans", error);
        }
    };

    const loadPayments = async () => {
        try {
            const data = await paymentService.getMyPayments();
            setPayments(data);
        } catch (error) {
            console.error("Failed to load payments", error);
        }
    };

    const handleSubscribe = async (planId) => {
        try {
            const { url } = await subscriptionService.createCheckoutSession(planId);
            window.location.href = url;
        } catch (error) {
            console.error("Failed to start subscription flow", error);
            alert("Failed to initialize payment. Please try again.");
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;

    if (!subscription) {
        return (
            <div className="space-y-8 animate-fade-in">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-900">Choose Your Membership</h2>
                    <p className="mt-4 text-lg text-gray-600">Select a plan to unlock full access to features and classes.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {availablePlans.map((plan) => (
                        <div key={plan._id} className="card hover:shadow-xl transition-shadow border-t-4 border-primary-500 relative flex flex-col">
                            {plan.features.includes('Best Value') && (
                                <span className="absolute top-0 right-0 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">BEST VALUE</span>
                            )}
                            <div className="p-6 flex-grow">
                                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                                <div className="mt-4 flex items-baseline">
                                    <span className="text-4xl font-extrabold text-gray-900">Rs. {plan.price / 100}</span>
                                    <span className="ml-1 text-xl text-gray-500">/{plan.interval}</span>
                                </div>
                                <p className="mt-4 text-gray-500">{plan.description}</p>

                                <ul className="mt-6 space-y-4">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-start">
                                            <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span className="ml-3 text-base text-gray-700">{feature}</span>
                                        </li>
                                    ))}
                                    <li className="flex items-start">
                                        <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span className="ml-3 text-base text-gray-700">{plan.classesPerMonth === 0 ? 'Unlimited Classes' : `${plan.classesPerMonth} Classes/Month`}</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="p-6 pt-0 mt-auto">
                                <button
                                    onClick={() => handleSubscribe(plan._id)}
                                    className="btn-primary w-full text-lg shadow-lg"
                                >
                                    Select {plan.name}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Integration of Payment History */}
                <div className="mt-12">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Payment History</h3>
                    <div className="card overflow-hidden">
                        {payments.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {payments.map(payment => (
                                            <tr key={payment._id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {new Date(payment.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    Rs. {payment.amount / 100}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${payment.status === 'succeeded' || payment.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {payment.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="p-4 text-gray-500 text-center">No payment history found.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900">My Subscription</h2>

            <div className="card">
                <div className="border-b border-gray-200 pb-4 mb-4 flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{subscription.planId.name}</h3>
                        <p className="text-gray-500 text-sm">
                            Status: <span className={`font-medium capitalize ${subscription.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                                {subscription.status}
                            </span>
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">Rs. {subscription.planId.price}</p>
                        <p className="text-gray-500 text-xs">/{subscription.planId.interval}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase">Start Date</p>
                        <p className="font-medium text-gray-900">{new Date(subscription.currentPeriodStart).toLocaleDateString()}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase">Next Billing / Expiry</p>
                        <p className="font-medium text-gray-900">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                    </div>
                </div>

                {subscription.cancelAtPeriodEnd ? (
                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm mb-4">
                        Your subscription is set to cancel on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                        You can continue using features until then.
                    </div>
                ) : (
                    <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                        <button
                            onClick={handleCancel}
                            className="text-red-600 hover:text-red-800 font-medium text-sm px-4 py-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            Cancel Subscription
                        </button>
                    </div>
                )}
            </div>

            <div className="card bg-blue-50 border-blue-100">
                <h4 className="font-semibold text-blue-900 mb-2">Member Benefits</h4>
                <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                    <li>Unlimited Class Bookings</li>
                    <li>Access to Premium Workout Plans</li>
                    <li>Diet Plan Recommendations</li>
                    <li>Priority Support</li>
                </ul>
            </div>
        </div>
    );
};

export default Subscription;
