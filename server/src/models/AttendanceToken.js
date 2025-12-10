const mongoose = require('mongoose');

const attendanceTokenSchema = new mongoose.Schema({
    tokenHash: {
        type: String,
        required: true,
        unique: true,
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true,
    },
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    issuedAt: {
        type: Date,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    used: {
        type: Boolean,
        default: false,
    },
    usedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});

// Unique index on token hash (handled by schema definition)

// TTL index for automatic deletion of expired tokens
attendanceTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for finding tokens by booking
attendanceTokenSchema.index({ bookingId: 1 });

const AttendanceToken = mongoose.model('AttendanceToken', attendanceTokenSchema);

module.exports = AttendanceToken;
