const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const auth = require('../middleware/authMiddleware');

// @route   POST /api/contact
// @desc    Submit contact form
// @access  Public
router.post('/', contactController.submitContact);

// @route   GET /api/contact
// @desc    Get all contact messages (admin)
// @access  Private
router.get('/', auth, contactController.getAllContacts);

// @route   PUT /api/contact/:id/status
// @desc    Update contact message status (admin)
// @access  Private
router.put('/:id/status', auth, contactController.updateContactStatus);

// @route   DELETE /api/contact/:id
// @desc    Delete contact message (admin)
// @access  Private
router.delete('/:id', auth, contactController.deleteContact);

// @route   POST /api/contact/bulk-delete
// @desc    Bulk delete contact messages (admin)
// @access  Private
router.post('/bulk-delete', auth, contactController.bulkDeleteContacts);

module.exports = router;
