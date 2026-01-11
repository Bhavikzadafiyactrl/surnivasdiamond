const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    country: {
        type: String,
        required: true,
        trim: true
    },
    zipCode: {
        type: String,
        required: true,
        trim: true
    },
    otp: {
        type: String
    },
    otpExpires: {
        type: Date
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verifiedByOwners: {
        type: Boolean,
        default: false
    },
    profileOtp: {
        type: String
    },
    profileOtpExpires: {
        type: Date
    },
    role: {
        type: String,
        enum: ['client', 'owner', 'employee'],
        default: 'client'
    },
    managedBy: {
        type: String,
        enum: ['none', 'bhavik', 'nikul'],
        default: 'none'
    },
    otpSentCount: { type: Number, default: 0 },
    otpSentDate: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { collection: 'user_surnivas' });

module.exports = mongoose.model('User', userSchema);
