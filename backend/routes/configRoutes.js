const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Multer Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, 'dashboard-video-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /mp4|mov|avi|webm/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Videos Only!');
        }
    }
});

router.get('/', configController.getConfig);
router.post('/video', auth, upload.single('video'), configController.uploadDashboardVideo);

module.exports = router;
