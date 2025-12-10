const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan',
        required: true,
    },
    stripeCustomerId: {
        type: String,
        required: true,
    },
    stripeSubscriptionId: {
        type: String,
        required: true,
        unique: true,
    },
    status: {
        type: String,
        enum: ['trialing', 'active', 'past_due', 'cancelled', 'incomplete'],
        default: 'incomplete',
    },
    currentPeriodStart: {
        type: Date,
        required: true,
    },
    currentPeriodEnd: {
        type: Date,
        required: true,
    },
    cancelAtPeriodEnd: {
        type: Boolean,
        default: false,
    },
    cancelledAt: {
        type: Date,
    },
    metadata: {
        type: Object,
        default: {},
    },
}, {
    timestamps: true,
});

// Indexes for efficient queries
subscriptionSchema.index({ userId: 1, status: 1 });


const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
