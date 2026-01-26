const express = require('express');
const router = express.Router();
const diamondController = require('../controllers/diamondController');

router.post('/search', diamondController.searchDiamonds);
router.post('/hold', diamondController.holdDiamonds);
router.post('/unhold', diamondController.unholdDiamonds);
router.get('/held', diamondController.getHeldDiamonds);

// Basket routes
router.post('/basket/add', diamondController.addToBasket);
router.get('/basket', diamondController.getBasket);
router.post('/basket/remove', diamondController.removeFromBasket);

// Admin routes
const auth = require('../middleware/authMiddleware');
router.get('/admin/held', auth, diamondController.getAllHeldDiamonds);
router.post('/admin/release', auth, diamondController.adminReleaseDiamond);

// Order routes
router.post('/order/confirm', auth, diamondController.confirmOrder);
router.post('/order/cancel', auth, diamondController.cancelOrders);
router.get('/orders', auth, diamondController.getUserOrders);

// Admin Order Routes
router.get('/admin/orders', auth, diamondController.getAllOrders);
router.post('/admin/orders/update-status', auth, diamondController.adminUpdateOrderStatus);
router.post('/admin/orders/update-payment', auth, diamondController.adminUpdatePayment);
// Dashboard Stats
router.get('/admin/stats', auth, diamondController.getDashboardStats);

// Admin: Manage Diamond List
router.get('/admin/list', auth, diamondController.getAdminDiamonds);
router.post('/admin/create', auth, diamondController.createDiamond);
router.put('/admin/update/:id', auth, diamondController.updateDiamond);
router.delete('/admin/delete/:id', auth, diamondController.deleteDiamond);
router.post('/admin/bulk-upload-csv', auth, diamondController.bulkUploadCSV);
router.post('/admin/bulk-delete', auth, diamondController.bulkDeleteDiamonds);

module.exports = router;
