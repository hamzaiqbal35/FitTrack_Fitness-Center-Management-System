const mongoose = require('mongoose');

const workoutPlanSchema = new mongoose.Schema({
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
    price: {
        type: Number,
        default: 0, // 0 = free
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
workoutPlanSchema.index({ trainerId: 1 });
workoutPlanSchema.index({ visibility: 1 });
workoutPlanSchema.index({ tags: 1 });
workoutPlanSchema.index({ uploadedAt: -1 });

const WorkoutPlan = mongoose.model('WorkoutPlan', workoutPlanSchema);

module.exports = WorkoutPlan;
