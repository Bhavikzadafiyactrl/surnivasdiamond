const express = require('express');
const router = express.Router();
const trendingDiamondController = require('../controllers/trendingDiamondController');
const auth = require('../middleware/authMiddleware');

// Public route - get active trending diamonds
router.get('/', trendingDiamondController.getTrendingDiamonds);

// Admin routes - require authentication
router.get('/admin', auth, trendingDiamondController.getAllTrendingDiamonds);
router.post('/', auth, trendingDiamondController.createTrendingDiamond);
router.put('/:id', auth, trendingDiamondController.updateTrendingDiamond);
router.delete('/:id', auth, trendingDiamondController.deleteTrendingDiamond);
router.patch('/:id/toggle', auth, trendingDiamondController.toggleActive);

module.exports = router;
