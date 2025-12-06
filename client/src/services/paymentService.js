import api from './api';

export const paymentService = {
    // Create Payment Intent
    createPaymentIntent: async (amount, currency = 'pkr') => {
        const response = await api.post('/payments/create-intent', { amount, currency });
        return response.data;
    },

    // Record Payment
    recordPayment: async (paymentData) => {
        const response = await api.post('/payments/record', paymentData);
        return response.data;
    },

    // Get My Payments
    getMyPayments: async () => {
        const response = await api.get('/payments/my-payments');
        return response.data;
    },

    // Get All Payments (Admin)
    getAllPayments: async () => {
        const response = await api.get('/payments');
        return response.data;
    }
};
