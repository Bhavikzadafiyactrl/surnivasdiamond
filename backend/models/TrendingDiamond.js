const mongoose = require('mongoose');

const trendingDiamondSchema = new mongoose.Schema({
    reportNo: {
        type: String,
        required: true,
        trim: true
    },
    imageUrls: {
        type: [String],
        default: []
    },
    isActive: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('TrendingDiamond', trendingDiamondSchema);
