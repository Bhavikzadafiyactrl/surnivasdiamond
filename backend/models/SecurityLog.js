const mongoose = require('mongoose');

const SecurityLogSchema = new mongoose.Schema({
    event: {
        type: String,
        required: true,
        enum: [
            'LOGIN_SUCCESS',
            'LOGIN_FAILED',
            'LOGIN_LOCKED',
            'SIGNUP',
            'OTP_SENT',
            'OTP_VERIFIED',
            'PASSWORD_RESET',
            'PASSWORD_CHANGED',
            'ROLE_CHANGED',
            'ACCOUNT_DELETED',
            'SUSPICIOUS_ACTIVITY'
        ]
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    email: String,
    ip: String,
    userAgent: String,
    details: mongoose.Schema.Types.Mixed,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
SecurityLogSchema.index({ userId: 1, timestamp: -1 });
SecurityLogSchema.index({ event: 1, timestamp: -1 });
SecurityLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('SecurityLog', SecurityLogSchema);
