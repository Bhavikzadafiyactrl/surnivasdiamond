const Config = require('../models/Config');
const fs = require('fs');

// Get Dashboard Config
exports.getDashboardConfig = async (req, res) => {
    try {
        // We use a single document with key 'general' for now
        let config = await Config.findOne({ key: 'general' });

        if (!config) {
            // Create default if not exists
            config = new Config({ key: 'general', dashboardVideoUrl: '' });
            await config.save();
        }

        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Get Config Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Update Dashboard Video
exports.updateDashboardVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No video file uploaded' });
        }

        const videoUrl = `/uploads/${req.file.filename}`;

        let config = await Config.findOne({ key: 'general' });
        if (!config) {
            config = new Config({ key: 'general' });
        }

        // Optional: Delete old video if exists to save space (advanced)
        // if (config.dashboardVideoUrl && fs.existsSync(`.${config.dashboardVideoUrl}`)) {
        //     fs.unlinkSync(`.${config.dashboardVideoUrl}`);
        // }

        config.dashboardVideoUrl = videoUrl;
        config.updatedAt = Date.now();
        await config.save();

        res.json({ success: true, message: 'Dashboard video updated', data: config });

    } catch (error) {
        console.error('Update Config Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
