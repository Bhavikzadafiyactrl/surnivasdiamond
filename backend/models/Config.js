const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true, // e.g., 'dashboard_video'
        default: 'general'
    },
    dashboardVideoUrl: {
        type: String,
        default: ''
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { collection: 'app_config' });

module.exports = mongoose.model('Config', configSchema);
