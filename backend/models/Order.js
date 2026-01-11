const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    diamondId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Diamond',
        required: true
    },
    status: {
        type: String,
        default: 'pending', // 'pending', 'confirmed', 'rejected'
        enum: ['pending', 'confirmed', 'rejected']
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    paymentStatus: {
        type: String, // 'pending', 'partial', 'paid', 'settled'
        default: 'pending',
        enum: ['pending', 'partial', 'paid', 'settled']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
    }
}, { collection: 'diamond_orders', timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
