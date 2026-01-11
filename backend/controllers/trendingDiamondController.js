const TrendingDiamond = require('../models/TrendingDiamond');
const Diamond = require('../models/Diamond');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/trending');

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'diamond-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for videos
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|webm|avi/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = /^(image|video)\//.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image and video files are allowed!'));
        }
    }
}).array('images', 5); // Allow up to 5 images/videos

// Helper to get image URLs (handling legacy single string)
const getImageUrls = (trending) => {
    if (trending.imageUrls && trending.imageUrls.length > 0) {
        return trending.imageUrls;
    }
    if (trending.imageUrl) {
        return [trending.imageUrl];
    }
    return [];
};

// Get all trending diamonds (for clients - only active)
exports.getTrendingDiamonds = async (req, res) => {
    try {
        const trendingDiamonds = await TrendingDiamond.find({ isActive: true })
            .sort({ order: 1, createdAt: -1 });

        // Populate diamond details from Diamond collection
        const populatedDiamonds = await Promise.all(
            trendingDiamonds.map(async (trending) => {
                const diamond = await Diamond.findOne({ "Report No": trending.reportNo });

                if (!diamond || diamond.Status !== 'available') {
                    return null; // Skip if diamond not found or not available
                }

                // Normalizing images
                const images = getImageUrls(trending);

                return {
                    _id: trending._id,
                    imageUrls: images,
                    imageUrl: images[0] || '', // Backwards compatibility for frontend basic view
                    stoneId: diamond["Stone No"],
                    reportNo: diamond["Report No"],
                    shape: diamond.Shape,
                    carats: diamond.Carats,
                    color: diamond.Color,
                    clarity: diamond.Clarity,
                    cut: diamond.Cut,
                    polish: diamond.Polish,
                    symmetry: diamond.Sym,
                    fluorescence: diamond.Flour,
                    measurement: diamond.Measurement,
                    diameter: diamond["Diameter (MM)"],
                    depth: diamond["Depth %"],
                    table: diamond["Table %"],
                    cert: diamond.Lab,
                    price: diamond["Amount$"],
                    giaLink: diamond.GIALINK,
                    order: trending.order
                };
            })
        );

        // Filter out null values
        const validDiamonds = populatedDiamonds.filter(d => d !== null);

        res.json({ success: true, data: validDiamonds });
    } catch (error) {
        console.error('Get Trending Diamonds Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get all trending diamonds (for admin - all diamonds)
exports.getAllTrendingDiamonds = async (req, res) => {
    try {
        const trendingDiamonds = await TrendingDiamond.find()
            .sort({ order: 1, createdAt: -1 });

        // Populate diamond details
        const populatedDiamonds = await Promise.all(
            trendingDiamonds.map(async (trending) => {
                const diamond = await Diamond.findOne({ "Report No": trending.reportNo });
                const images = getImageUrls(trending);

                return {
                    _id: trending._id,
                    imageUrls: images,
                    imageUrl: images[0] || '',
                    reportNo: trending.reportNo,
                    stoneId: diamond ? diamond["Stone No"] : 'Not Found',
                    shape: diamond ? diamond.Shape : '-',
                    carats: diamond ? diamond.Carats : '-',
                    color: diamond ? diamond.Color : '-',
                    clarity: diamond ? diamond.Clarity : '-',
                    cut: diamond ? diamond.Cut : '-',
                    polish: diamond ? diamond.Polish : '-',
                    symmetry: diamond ? diamond.Sym : '-',
                    fluorescence: diamond ? diamond.Flour : '-',
                    measurement: diamond ? diamond.Measurement : '-',
                    depth: diamond ? diamond["Depth %"] : '-',
                    table: diamond ? diamond["Table %"] : '-',
                    cert: diamond ? diamond.Lab : '-',
                    price: diamond ? diamond["Amount$"] : '-',
                    giaLink: diamond ? diamond.GIALINK : '',
                    order: trending.order,
                    isActive: trending.isActive,
                    status: diamond ? diamond.Status : '-',
                    createdAt: trending.createdAt
                };
            })
        );

        res.json({ success: true, data: populatedDiamonds });
    } catch (error) {
        console.error('Get All Trending Diamonds Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Create trending diamond
exports.createTrendingDiamond = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        try {
            const { reportNo, order } = req.body;

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ success: false, message: 'At least one image is required' });
            }

            if (!reportNo) {
                return res.status(400).json({ success: false, message: 'Report No is required' });
            }

            // Check if diamond with this Report No exists
            const diamondExists = await Diamond.findOne({ "Report No": reportNo });
            if (!diamondExists) {
                return res.status(404).json({ success: false, message: 'Diamond with this Report No not found in inventory' });
            }

            const imageUrls = req.files.map(f => `/uploads/trending/${f.filename}`);

            const trending = new TrendingDiamond({
                reportNo,
                imageUrls: imageUrls,
                order: order ? parseInt(order) : 0
            });

            await trending.save();

            const io = req.app.get('io');
            if (io) {
                io.emit('trendingDiamondUpdated');
            }

            res.status(201).json({ success: true, message: 'Trending diamond created', data: trending });
        } catch (error) {
            console.error('Create Trending Diamond Error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });
};

// Update trending diamond
exports.updateTrendingDiamond = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        try {
            const { id } = req.params;
            const { reportNo, order, isActive } = req.body;

            const trending = await TrendingDiamond.findById(id);
            if (!trending) {
                return res.status(404).json({ success: false, message: 'Trending diamond not found' });
            }

            if (reportNo) {
                const diamondExists = await Diamond.findOne({ "Report No": reportNo });
                if (!diamondExists) {
                    return res.status(404).json({ success: false, message: 'Diamond with this Report No not found in inventory' });
                }
                trending.reportNo = reportNo;
            }
            if (order !== undefined) trending.order = parseInt(order);
            if (isActive !== undefined) trending.isActive = isActive === 'true' || isActive === true;

            // Handle new images (APPEND them)
            if (req.files && req.files.length > 0) {
                const newImageUrls = req.files.map(f => `/uploads/trending/${f.filename}`);

                // If moving from legacy imageUrl to imageUrls
                if (!trending.imageUrls || trending.imageUrls.length === 0) {
                    if (trending.imageUrl) {
                        trending.imageUrls = [trending.imageUrl];
                        trending.imageUrl = undefined; // clear legacy
                    } else {
                        trending.imageUrls = [];
                    }
                }

                trending.imageUrls = [...trending.imageUrls, ...newImageUrls];
            }

            await trending.save();

            const io = req.app.get('io');
            if (io) {
                io.emit('trendingDiamondUpdated');
            }

            res.json({ success: true, message: 'Trending diamond updated', data: trending });
        } catch (error) {
            console.error('Update Trending Diamond Error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });
};

// Delete trending diamond
exports.deleteTrendingDiamond = async (req, res) => {
    try {
        const { id } = req.params;

        const diamond = await TrendingDiamond.findById(id);
        if (!diamond) {
            return res.status(404).json({ success: false, message: 'Diamond not found' });
        }

        // Delete all images
        const imagesToDelete = getImageUrls(diamond);
        imagesToDelete.forEach(imgUrl => {
            const imagePath = path.join(__dirname, '..', imgUrl);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        });

        await TrendingDiamond.findByIdAndDelete(id);

        const io = req.app.get('io');
        if (io) {
            io.emit('trendingDiamondUpdated');
        }

        res.json({ success: true, message: 'Trending diamond deleted' });
    } catch (error) {
        console.error('Delete Trending Diamond Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Toggle active status
exports.toggleActive = async (req, res) => {
    try {
        const { id } = req.params;

        const diamond = await TrendingDiamond.findById(id);
        if (!diamond) {
            return res.status(404).json({ success: false, message: 'Diamond not found' });
        }

        diamond.isActive = !diamond.isActive;
        await diamond.save();

        const io = req.app.get('io');
        if (io) {
            io.emit('trendingDiamondUpdated');
        }

        res.json({ success: true, message: 'Status updated', data: diamond });
    } catch (error) {
        console.error('Toggle Active Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete Specific Image from Trending Diamond
exports.deleteTrendingDiamondImage = async (req, res) => {
    try {
        const { id } = req.params;
        const { imageUrl } = req.body; // URL to delete

        const diamond = await TrendingDiamond.findById(id);
        if (!diamond) {
            return res.status(404).json({ success: false, message: 'Diamond not found' });
        }

        // If legacy string matches
        if (diamond.imageUrl === imageUrl) {
            diamond.imageUrl = undefined;
        }

        // Remove from array
        if (diamond.imageUrls && diamond.imageUrls.includes(imageUrl)) {
            diamond.imageUrls = diamond.imageUrls.filter(url => url !== imageUrl);

            // Delete file
            const imagePath = path.join(__dirname, '..', imageUrl);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await diamond.save();

        const io = req.app.get('io');
        if (io) {
            io.emit('trendingDiamondUpdated');
        }

        res.json({ success: true, message: 'Image deleted', data: diamond });

    } catch (error) {
        console.error('Delete Image Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
