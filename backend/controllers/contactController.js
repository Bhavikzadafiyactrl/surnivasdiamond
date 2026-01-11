const Contact = require('../models/Contact');

// Submit contact form
exports.submitContact = async (req, res) => {
    try {
        const { name, email, mobile, subject, message, userId } = req.body;

        // Validate required fields
        if (!name || !email || !mobile || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Create new contact message
        const contact = new Contact({
            name,
            email,
            mobile,
            subject,
            message,
            userId: userId || null
        });

        await contact.save();

        // Broadcast to admin
        const io = req.app.get('io');
        if (io) {
            io.emit('message:new', contact);
        }

        res.status(201).json({
            success: true,
            message: 'Your message has been submitted successfully. We will get back to you soon.',
            data: contact
        });

    } catch (error) {
        console.error('Contact submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.',
            error: error.message
        });
    }
};

// Get all contact messages (admin)
// Get all contact messages (admin)
exports.getAllContacts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const field = req.query.field || 'all'; // 'all', 'name', 'mobile', 'email', 'content'
        const skip = (page - 1) * limit;

        let query = {};

        if (search) {
            const regex = new RegExp(search, 'i');

            if (field === 'name') {
                query = { name: regex };
            } else if (field === 'mobile') {
                query = { mobile: regex };
            } else if (field === 'email') {
                query = { email: regex };
            } else if (field === 'content') {
                // Search in subject or message (covers Stone ID / Report No)
                query = {
                    $or: [
                        { subject: regex },
                        { message: regex }
                    ]
                };
            } else {
                // 'all'
                query = {
                    $or: [
                        { name: regex },
                        { email: regex },
                        { mobile: regex },
                        { subject: regex },
                        { message: regex }
                    ]
                };
            }
        }

        const total = await Contact.countDocuments(query);
        const contacts = await Contact.find(query)
            .populate('userId', 'name email mobile')
            .sort({ createdAt: -1 }) // Latest first
            .skip(skip)
            .limit(limit);

        res.json({
            success: true,
            count: contacts.length,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalMessages: total,
            data: contacts
        });

    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Update contact status (admin)
exports.updateContactStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'in-progress', 'resolved'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const contact = await Contact.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact message not found'
            });
        }

        // Broadcast update
        const io = req.app.get('io');
        if (io) {
            io.emit('message:update', contact);
        }

        res.json({
            success: true,
            message: 'Status updated successfully',
            data: contact
        });

    } catch (error) {
        console.error('Update contact status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Delete contact message (admin)
exports.deleteContact = async (req, res) => {
    try {
        const { id } = req.params;

        const contact = await Contact.findByIdAndDelete(id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact message not found'
            });
        }

        res.json({
            success: true,
            message: 'Message deleted successfully'
        });

        // Broadcast delete
        const io = req.app.get('io');
        if (io) {
            io.emit('message:delete', { id });
        }

    } catch (error) {
        console.error('Delete contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Bulk delete contact messages (admin)
exports.bulkDeleteContacts = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No message IDs provided'
            });
        }

        const result = await Contact.deleteMany({ _id: { $in: ids } });

        res.json({
            success: true,
            message: `${result.deletedCount} messages deleted successfully`,
            deletedCount: result.deletedCount
        });

        // Broadcast delete
        const io = req.app.get('io');
        if (io) {
            io.emit('message:bulk-delete', { ids });
        }

    } catch (error) {
        console.error('Bulk delete contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};
