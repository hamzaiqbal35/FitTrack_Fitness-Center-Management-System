const mongoose = require('mongoose');

const memberProgressSchema = new mongoose.Schema({
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    trainerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    weight: {
        type: Number,
        required: true
    },
    bodyFat: {
        type: Number
    },
    notes: {
        type: String
    }
}, {
    timestamps: true
});

// Index for efficient querying by member and sorting by date
memberProgressSchema.index({ memberId: 1, date: -1 });

const MemberProgress = mongoose.model('MemberProgress', memberProgressSchema);

module.exports = MemberProgress;
