import React, { useState, useEffect } from 'react';
import { trainingPlanService } from '../../../services/trainingPlanService';

const MyPlans = () => {
    const [workoutPlans, setWorkoutPlans] = useState([]);
    const [dietPlans, setDietPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMyPlans = async () => {
            try {
                const [workouts, diets] = await Promise.all([
                    trainingPlanService.getWorkoutPlans(),
                    trainingPlanService.getDietPlans()
                ]);
                setWorkoutPlans(workouts || []);
                setDietPlans(diets || []);
            } catch (error) {
                console.error("Failed to fetch plans", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMyPlans();
    }, []);

    const PlanCard = ({ plan, type }) => (
        <div key={plan._id} className="card hover:shadow-md transition-shadow flex flex-col">
            <h3 className="text-lg font-bold text-gray-900">{plan.title}</h3>
            {type === 'workout' ? (
                <div className="flex gap-2 my-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">{plan.difficultyLevel}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700">{plan.goal}</span>
                </div>
            ) : (
                <div className="flex gap-2 my-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700">{plan.dietType}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-50 text-gray-700">{plan.calories} kcal</span>
                </div>
            )}
            <p className="text-gray-600 text-sm mb-4 line-clamp-3">{plan.description}</p>

            <div className="mt-auto flex justify-between items-center pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-500">By {plan.trainerId?.name || 'Trainer'}</span>
                <a
                    href={plan.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-xs px-3 py-1"
                >
                    Download PDF
                </a>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900">My Plans</h2>

            {loading ? <p>Loading plans...</p> : (
                <>
                    {/* Workout Plans Section */}
                    <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            Workout Plans
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {workoutPlans.map(plan => <PlanCard key={plan._id} plan={plan} type="workout" />)}
                            {workoutPlans.length === 0 && <p className="col-span-full text-gray-500 italic">No workout plans available.</p>}
                        </div>
                    </section>

                    {/* Diet Plans Section */}
                    <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Diet Plans
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {dietPlans.map(plan => <PlanCard key={plan._id} plan={plan} type="diet" />)}
                            {dietPlans.length === 0 && <p className="col-span-full text-gray-500 italic">No diet plans available.</p>}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default MyPlans;
