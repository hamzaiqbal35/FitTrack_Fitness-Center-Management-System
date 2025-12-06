const Stripe = require('stripe');
const Payment = require('../models/Payment');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key');

// @desc    Create payment intent
// @route   POST /api/payments/create-intent
// @access  Private
const createPaymentIntent = async (req, res) => {
    const { amount, currency } = req.body;

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: currency || 'pkr',
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Record payment success
// @route   POST /api/payments/record
// @access  Private
const recordPayment = async (req, res) => {
    const { paymentIntentId, amount, status } = req.body;

    const payment = await Payment.create({
        userId: req.user._id, // Fixed: match schema
        amount,
        stripePaymentIntentId: paymentIntentId, // Fixed: match schema
        status: status || 'paid', // 'succeeded' or 'paid'
    });

    if (payment) {
        res.status(201).json(payment);
    } else {
        res.status(400).json({ message: 'Invalid payment data' });
    }
};

// @desc    Get my payment history
// @route   GET /api/payments/my-payments
// @access  Private
const getMyPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payments' });
    }
};

// @desc    Get all payments (Admin)
// @route   GET /api/payments
// @access  Private/Admin
const getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find({})
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payments' });
    }
};

module.exports = { createPaymentIntent, recordPayment, getMyPayments, getAllPayments };
