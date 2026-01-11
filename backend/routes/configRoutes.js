const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // Assuming you have file upload middleware

// Get Config (Authenticated users)
router.get('/', auth, configController.getDashboardConfig);

// Update Video (Admin Only - simplified to Auth for now, frontend handles role check)
// Ensure upload middleware handles 'video' field
router.post('/video', auth, upload.single('video'), configController.updateDashboardVideo);

module.exports = router;
