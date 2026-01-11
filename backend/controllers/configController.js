const Config = require('../models/Config');
const path = require('path');
const fs = require('fs');

// Get Config
exports.getConfig = async (req, res) => {
    try {
        // Find default config or create it
        let config = await Config.findOne({ key: 'general' });
        if (!config) {
            config = new Config({ key: 'general' });
            await config.save();
        }
        res.json({ success: true, data: config });
    } catch (error) {
        console.error("Get Config Error:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Upload Dashboard Video
exports.uploadDashboardVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No video file provided' });
        }

        const videoUrl = `/uploads/${req.file.filename}`;

        let config = await Config.findOne({ key: 'general' });
        if (!config) {
            config = new Config({ key: 'general' });
        }

        config.dashboardVideoUrl = videoUrl;
        await config.save();

        res.json({ success: true, data: config });
    } catch (error) {
        console.error("Upload Video Error:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
