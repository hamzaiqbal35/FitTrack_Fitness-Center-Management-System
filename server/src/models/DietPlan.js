const mongoose = require('mongoose');

const dietPlanSchema = new mongoose.Schema({
    trainerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    fileUrl: {
        type: String,
        required: true,
    },
    fileType: {
        type: String,
        required: true,
    },
    calories: {
        type: Number,
        default: 0
    },
    visibility: {
        type: String,
        enum: ['public', 'members_only'],
        default: 'members_only',
    },
    tags: {
        type: [String],
        default: [],
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// Indexes for filtering and searching
dietPlanSchema.index({ trainerId: 1 });
dietPlanSchema.index({ visibility: 1 });
dietPlanSchema.index({ tags: 1 });
dietPlanSchema.index({ uploadedAt: -1 });

const DietPlan = mongoose.model('DietPlan', dietPlanSchema);

module.exports = DietPlan;
