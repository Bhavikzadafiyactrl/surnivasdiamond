const Diamond = require('../models/Diamond');
const Order = require('../models/Order');
const mongoose = require('mongoose');
const fs = require('fs');

// Helper to release expired holds (older than 48 hours)
const releaseExpiredHolds = async () => {
    try {
        // PERMANENT: const expirationTime = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const expirationTime = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
        const result = await Diamond.updateMany(
            { Status: 'hold', HeldAt: { $lt: expirationTime } },
            {
                $set: {
                    Status: 'available',
                    HeldBy: null,
                    HeldAt: null
                }
            }
        );
        if (result.modifiedCount > 0) {
            console.log(`[Auto-Release] Released ${result.modifiedCount} expired held diamonds.`);
        }
    } catch (error) {
        console.error('[Auto-Release] Error releasing expired holds:', error);
    }
};

exports.searchDiamonds = async (req, res) => {
    try {
        // 1. Release expired holds before searching
        await releaseExpiredHolds();

        const filters = req.body;
        fs.appendFileSync('backend_debug.log', `\n[${new Date().toISOString()}] Request Hit. Filters: ${JSON.stringify(filters)}\n`);

        const query = {};

        // Status: Hide 'sold' and 'reviewing' from search
        query.Status = { $nin: ['sold', 'reviewing'] };

        // --- Text Search (Stone No / Report No) ---
        if (filters.search && filters.search.trim() !== "") {
            const searchTerm = filters.search.trim();
            query.$or = [
                { StockID: { $regex: searchTerm, $options: 'i' } },
                { 'Report No': { $regex: searchTerm, $options: 'i' } }
            ];
        }

        // --- Shape Filter ---
        if (filters.shape && filters.shape.length > 0) {
            const standardShapes = ['ROUND', 'PRINCESS', 'CUSHION', 'OVAL', 'EMERALD', 'PEAR', 'RADIANT', 'MARQUISE', 'HEART'];
            const hasOther = filters.shape.includes('OTHER');
            const regularShapes = filters.shape.filter(s => s !== 'OTHER').map(s => s.toUpperCase());

            if (hasOther && regularShapes.length > 0) {
                // User selected OTHER + some standard shapes
                query.$or = [
                    { Shape: { $in: regularShapes } },
                    { Shape: { $nin: standardShapes } }
                ];
            } else if (hasOther) {
                // User selected ONLY OTHER
                query.Shape = { $nin: standardShapes };
            } else {
                // User selected only standard shapes
                query.Shape = { $in: regularShapes };
            }
        }

        // --- Carat Filter ---
        if (filters.carat) {
            if (filters.carat.min) {
                query.Carats = { ...query.Carats, $gte: Number(filters.carat.min) };
            }
            if (filters.carat.max) {
                query.Carats = { ...query.Carats, $lte: Number(filters.carat.max) };
            }
        }

        // --- Color Filter ---
        if (filters.color && filters.color.length > 0) {
            query.Color = { $in: filters.color };
        }

        // --- Clarity Filter ---
        if (filters.clarity && filters.clarity.length > 0) {
            query.Clarity = { $in: filters.clarity };
        }

        // --- Finishing (Cut) Filter ---
        // --- Finishing Filter (3EX / 3VG+) ---        
        // 3EX => Cut: EX, Polish: EX, Sym: EX
        // 3VG+ => All three must be EX or VG (any combination)
        // IMPORTANT: Cut only applies to ROUND diamonds, not fancy shapes
        if (filters.finishing && filters.finishing.length > 0) {
            const finishingConditions = [];

            // Check if search is limited to Fancy Shapes only (No Round)
            const isFancyShapeOnly = filters.shape && filters.shape.length > 0 && !filters.shape.some(s => s.toUpperCase() === 'ROUND');
            const hasRound = filters.shape && filters.shape.some(s => s.toUpperCase() === 'ROUND');
            const hasFancy = filters.shape && filters.shape.some(s => s.toUpperCase() !== 'ROUND' && s.toUpperCase() !== 'OTHER');

            if (filters.finishing.includes('3EX')) {
                if (isFancyShapeOnly) {
                    // For Fancy Shapes ONLY: 3EX means Polish=EX and Sym=EX (Ignore Cut)
                    finishingConditions.push({
                        Polish: 'EX',
                        Sym: 'EX'
                    });
                } else if (hasRound && hasFancy) {
                    // Mixed shapes (ROUND + Fancy): Need to handle separately
                    // For ROUND: Cut=EX, Polish=EX, Sym=EX
                    // For Fancy: Only Polish=EX, Sym=EX
                    finishingConditions.push({
                        $or: [
                            { Shape: 'ROUND', Cut: 'EX', Polish: 'EX', Sym: 'EX' },
                            { Shape: { $ne: 'ROUND' }, Polish: 'EX', Sym: 'EX' }
                        ]
                    });
                } else {
                    // For Round only (or All): 3EX means Cut=EX, Polish=EX, Sym=EX
                    finishingConditions.push({
                        Cut: 'EX',
                        Polish: 'EX',
                        Sym: 'EX'
                    });
                }
            }

            if (filters.finishing.includes('3VG+')) {
                const vgOrEx = ['VG', 'EX'];
                if (isFancyShapeOnly) {
                    // For Fancy ONLY: 3VG+ -> Polish & Sym are VG or EX
                    finishingConditions.push({
                        Polish: { $in: vgOrEx },
                        Sym: { $in: vgOrEx }
                    });
                } else if (hasRound && hasFancy) {
                    // Mixed shapes: Handle separately
                    finishingConditions.push({
                        $or: [
                            { Shape: 'ROUND', Cut: { $in: vgOrEx }, Polish: { $in: vgOrEx }, Sym: { $in: vgOrEx } },
                            { Shape: { $ne: 'ROUND' }, Polish: { $in: vgOrEx }, Sym: { $in: vgOrEx } }
                        ]
                    });
                } else {
                    // For Round only: All three must be VG or EX
                    finishingConditions.push({
                        Cut: { $in: vgOrEx },
                        Polish: { $in: vgOrEx },
                        Sym: { $in: vgOrEx }
                    });
                }
            }

            if (finishingConditions.length > 0) {
                query.$and = query.$and || [];
                query.$and.push({ $or: finishingConditions });
            }
        }

        // --- Individual Cut Filter ---
        // Cut should only apply to ROUND diamonds when mixed shapes are selected
        if (filters.cut && filters.cut.length > 0) {
            const hasRound = filters.shape && filters.shape.some(s => s.toUpperCase() === 'ROUND');
            const hasFancy = filters.shape && filters.shape.some(s => s.toUpperCase() !== 'ROUND' && s.toUpperCase() !== 'OTHER');

            if (hasRound && hasFancy) {
                // Mixed shapes: Cut only applies to ROUND
                query.$and = query.$and || [];
                query.$and.push({
                    $or: [
                        { Shape: 'ROUND', Cut: { $in: filters.cut } },
                        { Shape: { $ne: 'ROUND' } }
                    ]
                });
            } else if (!hasFancy || hasRound) {
                // ROUND only or no shape filter: apply Cut normally
                query.Cut = { $in: filters.cut };
            }
            // If fancy shapes only, don't apply Cut filter at all
        }

        // --- Individual Polish Filter ---
        if (filters.polish && filters.polish.length > 0) {
            query.Polish = { $in: filters.polish };
        }

        // --- Individual Symmetry Filter ---
        if (filters.symmetry && filters.symmetry.length > 0) {
            query.Sym = { $in: filters.symmetry };
        }
        // if (filters.certificate && filters.certificate.length > 0) query['Report No'] = { $exists: true }; // Approx? Or check Lab field if exists. Actually skip cert for now or strictly map if user has 'Lab' field. (User didn't show Lab field, showed Report No). I'll skip cert or just log it.


        // --- Fluorescence Filter ---
        // Frontend now sends: NON, FNT, MED, STG, VST
        if (filters.fluorescence && filters.fluorescence.length > 0) {
            query.Flour = { $in: filters.fluorescence };
        }

        // --- Certificate/Lab Filter ---
        if (filters.certificate && filters.certificate.length > 0) {
            query.Lab = { $in: filters.certificate };
        }

        // --- Location Filter ---
        // Frontend now sends: INDIA, HONG KONG, VIETNAM
        if (filters.location && filters.location.length > 0) {
            query.Location = { $in: filters.location };
        }

        // --- Price (Amount$) Filter ---
        if (filters.price) {
            if (filters.price.min !== undefined && filters.price.min !== '') {
                query['Amount$'] = { ...query['Amount$'], $gte: Number(filters.price.min) };
            }
            if (filters.price.max !== undefined && filters.price.max !== '') {
                query['Amount$'] = { ...query['Amount$'], $lte: Number(filters.price.max) };
            }
        }

        // --- Exact Diameter Filter (Mongo Level) ---
        // Using Regex to handle string number variations (e.g. "13.8" matches "13.80")
        if (filters.diameter) {
            const val = String(filters.diameter).trim();
            // Regex to match value with optional trailing zeros
            // e.g. "13.8" -> /^13\.80*$/
            const escaped = val.replace('.', '\\.');
            query['Diameter (MM)'] = { $regex: new RegExp(`^${escaped}0*$`), $options: 'i' };
        }

        console.log("Filters Received:", JSON.stringify(filters));
        console.log("Diameter Filter Value:", filters.diameter);
        console.log("Constructed Mongo Query:", JSON.stringify(query));

        // --- Fetch Initial Results ---
        // We execute the Mongo query first, then filter Measurements in memory
        // 🚀 OPTIMIZATION: Limit to 500 immediately and sort by price
        // BUT: Don't limit if measurement filters are active (they run in-memory after DB query)
        const hasMeasurementFilter = filters.length?.min || filters.length?.max || filters.width?.min || filters.width?.max || filters.diameter;

        let diamondQuery = Diamond.find(query).sort({ 'Amount$': 1 });

        if (!hasMeasurementFilter) {
            diamondQuery = diamondQuery.limit(500);
        }

        let diamonds = await diamondQuery.lean();
        console.log("Docs fetched from DB:", diamonds.length);

        // --- Measurement Filtering (In-Memory) ---
        // Format: "Length - Width * Depth" e.g., "5.45-5.47*3.20"
        // Filter fields: length (min/max), width (min/max), diameter (specific from 'Diameter (MM)')

        if (filters.length?.min || filters.length?.max || filters.width?.min || filters.width?.max || filters.diameter) {
            console.log("===== MEASUREMENT FILTER DEBUG =====");
            console.log("Length filter:", filters.length);
            console.log("Width filter:", filters.width);
            console.log("Diameter filter:", filters.diameter);

            diamonds = diamonds.filter((d, i) => {
                try {
                    let L = 0, W = 0;

                    // Parse Measurement String for Length and Width
                    if (d.Measurement) {
                        const parts = d.Measurement.split(/[x\-\*]/).map(s => parseFloat(s.trim()));
                        if (parts.length >= 2) {
                            L = parts[0];
                            W = parts[1];
                        }

                        // Debug first 5 diamonds
                        if (i < 5) {
                            console.log(`Diamond ${i}: Measurement="${d.Measurement}", Parsed L=${L}, W=${W}`);
                        }
                    }

                    // Check Length
                    if (filters.length?.min && L < parseFloat(filters.length.min)) {
                        if (i < 5) console.log(`  -> Rejected: Length ${L} < ${filters.length.min}`);
                        return false;
                    }
                    if (filters.length?.max && L > parseFloat(filters.length.max)) {
                        if (i < 5) console.log(`  -> Rejected: Length ${L} > ${filters.length.max}`);
                        return false;
                    }

                    // Check Width
                    if (filters.width?.min && W < parseFloat(filters.width.min)) {
                        if (i < 5) console.log(`  -> Rejected: Width ${W} < ${filters.width.min}`);
                        return false;
                    }
                    if (filters.width?.max && W > parseFloat(filters.width.max)) {
                        if (i < 5) console.log(`  -> Rejected: Width ${W} > ${filters.width.max}`);
                        return false;
                    }

                    // Check Diameter (Specific from 'Diameter (MM)')
                    // Handled in Mongo Query now
                    // if (filters.diameter) { ... }

                    if (i < 5) console.log(`  -> Accepted!`);
                    return true;
                } catch (err) {
                    fs.appendFileSync('backend_debug.log', `Error in filter item ${i}: ${err.message}\n`);
                    return false;
                }
            });

            console.log(`After measurement filter: ${diamonds.length} diamonds`);
            console.log("===== END MEASUREMENT FILTER DEBUG =====");
        }

        // --- Sort by Price Ascending ---
        diamonds.sort((a, b) => (a['Amount$'] || 0) - (b['Amount$'] || 0));

        // --- Limit Results to 500 ---
        // If measurement filters were used, we didn't limit at DB level, so limit here
        diamonds = diamonds.slice(0, 500);

        // --- Add isInMyBasket field based on userId from query/body ---
        const userId = req.body.userId || req.query.userId;
        const enrichedDiamonds = diamonds.map(diamond => ({
            ...diamond,
            isInMyBasket: userId && diamond.InBasketBy === userId
        }));

        res.status(200).json({ success: true, count: enrichedDiamonds.length, data: enrichedDiamonds });

    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

exports.holdDiamonds = async (req, res) => {
    try {
        const { diamondIds, userId } = req.body;

        if (!diamondIds || !Array.isArray(diamondIds) || diamondIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No diamond IDs provided' });
        }

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required to hold diamonds' });
        }

        // 1. Release expired holds to ensure accurate availability
        await releaseExpiredHolds();

        // 2. Try to hold diamonds EXPERIMENTALLY (Exclusive Check)
        // Only update if Status is 'available' OR Status does not exist (legacy data)
        const result = await Diamond.updateMany(
            {
                _id: { $in: diamondIds },
                $or: [
                    { Status: 'available' },
                    { Status: { $exists: false } },
                    { Status: null }
                ]
            },
            {
                $set: {
                    Status: 'hold',
                    HeldBy: userId,
                    HeldAt: new Date(),
                    InBasketBy: null,
                    InBasketAt: null
                }
            }
        );

        // Broadcast update to all connected clients
        const io = req.app.get('io');
        if (io) {
            diamondIds.forEach(id => {
                io.emit('diamond:update', { id, status: 'hold', heldBy: userId });
            });
        }

        res.json({
            success: true,
            message: `${result.modifiedCount} diamonds put on hold`,
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error('Hold error:', error);
        res.status(500).json({ success: false, message: 'Server error putting diamonds on hold' });
    }
};

exports.getHeldDiamonds = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        // 1. Release expired holds first
        await releaseExpiredHolds();

        const diamonds = await Diamond.find({ Status: 'hold', HeldBy: userId }).lean();

        // Add id field for frontend compatibility if needed, though _id usually works
        const formattedDiamonds = diamonds.map(d => ({
            ...d,
            id: d._id.toString()
        }));

        res.json({ success: true, data: formattedDiamonds });
    } catch (error) {
        console.error("Get held diamonds error:", error);
        res.status(500).json({ success: false, message: "Server Error fetching held diamonds" });
    }
};

exports.unholdDiamonds = async (req, res) => {
    try {
        const { diamondIds, userId } = req.body;

        if (!diamondIds || !Array.isArray(diamondIds) || diamondIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No diamond IDs provided' });
        }

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        // Release diamonds - only if they were held by this user
        const result = await Diamond.updateMany(
            { _id: { $in: diamondIds }, HeldBy: userId },
            {
                $set: {
                    Status: 'available',
                    HeldBy: null,
                    HeldAt: null
                }
            }
        );
        res.json({ success: true, message: 'Diamonds unheld successfully' });

    } catch (error) {
        console.error('Unhold error:', error);
        res.status(500).json({ success: false, message: 'Server error releasing diamonds' });
    }
};

exports.getDiamondSummary = async (req, res) => {
    try {
        const summary = await Diamond.aggregate([
            {
                $facet: {
                    // Overall Stats
                    overall: [
                        {
                            $group: {
                                _id: null,
                                totalPcs: { $sum: 1 },
                                totalCts: { $sum: "$Carats" },
                                availablePcs: {
                                    $sum: { $cond: [{ $eq: ["$Status", "available"] }, 1, 0] }
                                },
                                availableCts: {
                                    $sum: { $cond: [{ $eq: ["$Status", "available"] }, "$Carats", 0] }
                                },
                                soldPcs: {
                                    $sum: { $cond: [{ $eq: ["$Status", "sold"] }, 1, 0] }
                                },
                                soldCts: {
                                    $sum: { $cond: [{ $eq: ["$Status", "sold"] }, "$Carats", 0] }
                                }
                            }
                        }
                    ],
                    // By Shape
                    byShape: [
                        {
                            $group: {
                                _id: "$Shape",
                                totalPcs: { $sum: 1 },
                                totalCts: { $sum: "$Carats" },
                                availablePcs: { $sum: { $cond: [{ $eq: ["$Status", "available"] }, 1, 0] } },
                                availableCts: { $sum: { $cond: [{ $eq: ["$Status", "available"] }, "$Carats", 0] } },
                                soldPcs: { $sum: { $cond: [{ $eq: ["$Status", "sold"] }, 1, 0] } },
                                soldCts: { $sum: { $cond: [{ $eq: ["$Status", "sold"] }, "$Carats", 0] } }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ],
                    // By Color
                    byColor: [
                        {
                            $group: {
                                _id: "$Color",
                                totalPcs: { $sum: 1 },
                                totalCts: { $sum: "$Carats" },
                                availablePcs: { $sum: { $cond: [{ $eq: ["$Status", "available"] }, 1, 0] } },
                                availableCts: { $sum: { $cond: [{ $eq: ["$Status", "available"] }, "$Carats", 0] } },
                                soldPcs: { $sum: { $cond: [{ $eq: ["$Status", "sold"] }, 1, 0] } },
                                soldCts: { $sum: { $cond: [{ $eq: ["$Status", "sold"] }, "$Carats", 0] } }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ],
                    // By Clarity
                    byClarity: [
                        {
                            $group: {
                                _id: "$Clarity",
                                totalPcs: { $sum: 1 },
                                totalCts: { $sum: "$Carats" },
                                availablePcs: { $sum: { $cond: [{ $eq: ["$Status", "available"] }, 1, 0] } },
                                availableCts: { $sum: { $cond: [{ $eq: ["$Status", "available"] }, "$Carats", 0] } },
                                soldPcs: { $sum: { $cond: [{ $eq: ["$Status", "sold"] }, 1, 0] } },
                                soldCts: { $sum: { $cond: [{ $eq: ["$Status", "sold"] }, "$Carats", 0] } }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ],
                    // By Location
                    byLocation: [
                        {
                            $group: {
                                _id: "$Location",
                                totalPcs: { $sum: 1 },
                                totalCts: { $sum: "$Carats" },
                                availablePcs: { $sum: { $cond: [{ $eq: ["$Status", "available"] }, 1, 0] } },
                                availableCts: { $sum: { $cond: [{ $eq: ["$Status", "available"] }, "$Carats", 0] } },
                                soldPcs: { $sum: { $cond: [{ $eq: ["$Status", "sold"] }, 1, 0] } },
                                soldCts: { $sum: { $cond: [{ $eq: ["$Status", "sold"] }, "$Carats", 0] } }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ]
                }
            }
        ]);

        res.json({ success: true, data: summary[0] });

    } catch (error) {
        console.error('Summary error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching summary' });
    }
};

// ==================== BASKET FUNCTIONS ====================

exports.addToBasket = async (req, res) => {
    try {
        const { diamondIds, userId } = req.body;

        if (!diamondIds || !Array.isArray(diamondIds) || diamondIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No diamond IDs provided' });
        }

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        // Add diamonds to user's basket
        // SAFETY FIX: Only allow adding if Available (prevents stealing held diamonds)
        const result = await Diamond.updateMany(
            {
                _id: { $in: diamondIds },
                $or: [
                    { Status: 'available' },
                    { Status: { $exists: false } }, // legacy
                    { Status: null },
                    { Status: 'hold', HeldBy: userId } // ALLOW SELF-HELD DIAMONDS
                ]
            },
            {
                $set: {
                    InBasketBy: userId,
                    InBasketAt: new Date(),
                    Status: 'available', // Ensure it stays available
                    HeldBy: null,
                    HeldAt: null
                }
            }
        );

        // Broadcast update to all connected clients (minimal payload)
        const io = req.app.get('io');
        if (io) {
            diamondIds.forEach(id => {
                io.emit('diamond:update', { id, status: 'in_basket', inBasketBy: userId });
            });
        }

        res.json({
            success: true,
            message: `${result.modifiedCount} diamond(s) added to basket`,
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error('Add to basket error:', error);
        res.status(500).json({ success: false, message: 'Server error adding diamonds to basket' });
    }
};

exports.getBasket = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const diamonds = await Diamond.find({ InBasketBy: userId }).lean();

        const formattedDiamonds = diamonds.map(d => ({
            ...d,
            id: d._id.toString()
        }));

        res.json({ success: true, data: formattedDiamonds });
    } catch (error) {
        console.error("Get basket error:", error);
        res.status(500).json({ success: false, message: "Server Error fetching basket" });
    }
};

exports.removeFromBasket = async (req, res) => {
    try {
        const { diamondIds, userId } = req.body;

        if (!diamondIds || !Array.isArray(diamondIds) || diamondIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No diamond IDs provided' });
        }

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        // Remove from basket - only if they were added by this user
        const result = await Diamond.updateMany(
            { _id: { $in: diamondIds }, InBasketBy: userId },
            {
                $set: {
                    InBasketBy: null,
                    InBasketAt: null
                }
            }
        );

        res.json({
            success: true,
            message: `${result.modifiedCount} diamond(s) removed from basket`,
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error('Remove from basket error:', error);
        res.status(500).json({ success: false, message: 'Server error removing diamonds from basket' });
    }
};



// Get ALL held diamonds for Admin
exports.getAllHeldDiamonds = async (req, res) => {
    try {
        // 1. Release expired holds first
        await releaseExpiredHolds();

        // 2. Fetch all diamonds with Status 'hold'
        const diamonds = await Diamond.find({ Status: 'hold' }).lean();

        if (diamonds.length === 0) {
            return res.json({ success: true, count: 0, data: [] });
        }

        // 3. Extract User IDs
        const userIds = [...new Set(diamonds.map(d => d.HeldBy).filter(id => id))];

        // 4. Fetch User Details
        const User = require('../models/User');
        const users = await User.find({ _id: { $in: userIds } }, 'name email mobile').lean();

        // Create a map for quick lookup
        const userMap = {};
        users.forEach(u => {
            userMap[u._id.toString()] = u;
        });

        // 5. Combine Data
        const enrichedDiamonds = diamonds.map(d => {
            const user = d.HeldBy ? userMap[d.HeldBy.toString()] : null;
            return {
                ...d,
                holderDetails: user || { name: 'Unknown', email: 'N/A', mobile: 'N/A' }
            };
        });

        res.json({ success: true, count: enrichedDiamonds.length, data: enrichedDiamonds });

    } catch (error) {
        console.error("Get all held diamonds error:", error);
        res.status(500).json({ success: false, message: "Server Error fetching held diamonds" });
    }
};

// Admin: Force Release a Held Diamond
exports.adminReleaseDiamond = async (req, res) => {
    try {
        const { diamondId, diamondIds } = req.body;

        if (!diamondId && (!diamondIds || diamondIds.length === 0)) {
            return res.status(400).json({ success: false, message: 'Diamond ID(s) required' });
        }

        let result;
        if (diamondIds && diamondIds.length > 0) {
            // Bulk Release
            result = await Diamond.updateMany(
                { _id: { $in: diamondIds } },
                {
                    $set: {
                        Status: 'available',
                        HeldBy: null,
                        HeldAt: null
                    }
                }
            );
        } else {
            // Single Release
            result = await Diamond.findByIdAndUpdate(
                diamondId,
                {
                    $set: {
                        Status: 'available',
                        HeldBy: null,
                        HeldAt: null
                    }
                },
                { new: true }
            );
        }

        if (!result) {
            return res.status(404).json({ success: false, message: 'Diamond(s) not found' });
        }

        if (!result) {
            return res.status(404).json({ success: false, message: 'Diamond not found' });
        }

        // Broadcast update
        const io = req.app.get('io');
        if (io) {
            if (diamondIds && diamondIds.length > 0) {
                diamondIds.forEach(id => io.emit('diamond:update', { id, status: 'available', heldBy: null }));
            } else if (diamondId) {
                io.emit('diamond:update', { id: diamondId, status: 'available', heldBy: null });
            }
        }

        res.json({
            success: true,
            message: 'Diamond released successfully',
            data: result
        });

    } catch (error) {
        console.error("Admin Release Error:", error);
        res.status(500).json({ success: false, message: "Server Error releasing diamond" });
    }
};

// Order Confirmation System

// Confirm Order (Create Order)
exports.confirmOrder = async (req, res) => {
    try {
        const { diamondIds, userId } = req.body;

        if (!diamondIds || !Array.isArray(diamondIds) || diamondIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No diamonds selected' });
        }

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        // Create orders for each diamond and update Diamond status
        const orders = diamondIds.map(async (dId) => {
            // Find diamond to get price
            // Find diamond to get price AND verify availability
            const diamond = await Diamond.findOne({
                _id: dId,
                $or: [
                    { Status: 'available' },
                    { Status: { $exists: false } }, // legacy
                    { Status: null },
                    { Status: 'hold', HeldBy: userId } // Allow if held by SELF
                ]
            });

            if (!diamond) return null; // Skip if sold or held by someone else

            // Update Diamond Status to 'reviewing' to hide from search
            // Use findOneAndUpdate to ensure atomicity
            const updatedDiamond = await Diamond.findOneAndUpdate(
                {
                    _id: dId,
                    $or: [
                        { Status: 'available' },
                        { Status: { $exists: false } },
                        { Status: null },
                        { Status: 'hold', HeldBy: userId }
                    ]
                },
                {
                    Status: 'reviewing',
                    HeldBy: null,
                    HeldAt: null,
                    InBasketBy: null,
                    InBasketAt: null
                }
            );

            if (!updatedDiamond) return null; // Race condition catch

            return new Order({
                userId: userId,
                diamondId: dId,
                status: 'pending',
                totalAmount: diamond['Amount$'] || 0 // Save price at time of order
            }).save();
        });

        const results = await Promise.all(orders);
        const confirmedOrders = results.filter(order => order !== null);

        // Broadcast update: Mark as reviewing (hidden)
        const io = req.app.get('io');
        if (io && confirmedOrders.length > 0) {
            confirmedOrders.forEach(order => {
                io.emit('diamond:update', { id: order.diamondId, status: 'reviewing', heldBy: null });
            });
            // Emit order update for dashboard stats
            io.emit('orderUpdated');
        }

        if (confirmedOrders.length === 0) {
            return res.status(409).json({
                success: false,
                message: 'Selected diamonds are no longer available (Sold or Held by another user).'
            });
        }

        if (confirmedOrders.length < diamondIds.length) {
            return res.status(200).json({
                success: true,
                message: `Order confirmed for ${confirmedOrders.length} diamond(s). Some items were no longer available.`,
                count: confirmedOrders.length,
                partial: true
            });
        }

        res.json({
            success: true,
            message: 'Orders confirmed successfully. Our executive will contact you shortly.',
            count: confirmedOrders.length
        });

    } catch (error) {
        console.error("Confirm Order Error:", error);
        res.status(500).json({ success: false, message: "Server Error confirming order" });
    }
};

// Get User Orders
exports.getUserOrders = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const orders = await Order.find({ userId })
            .populate('diamondId') // Get full diamond details
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: orders.length,
            data: orders
        });

    } catch (error) {
        console.error("Get User Orders Error:", error);
        res.status(500).json({ success: false, message: "Server Error fetching orders" });
    }
};

// Admin: Get All Orders
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('userId', 'name email mobile companyName managedBy')
            .populate('diamondId')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error("Get All Orders Error:", error);
        res.status(500).json({ success: false, message: "Server Error fetching all orders" });
    }
};

// Admin: Update Order Status (Confirm/Reject)
exports.adminUpdateOrderStatus = async (req, res) => {
    try {
        const { orderIds, status } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No orders selected' });
        }

        if (!['confirmed', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const orders = await Order.find({ _id: { $in: orderIds } }).populate('diamondId');

        const broadcasts = [];

        const updates = orders.map(async (order) => {
            // Update Order Status
            order.status = status;
            await order.save();

            // Update Diamond Status based on Order Status
            if (status === 'confirmed') {
                await Diamond.findByIdAndUpdate(order.diamondId._id, { Status: 'confirmed' });
                broadcasts.push({ id: order.diamondId._id, status: 'confirmed', heldBy: null });
            } else if (status === 'rejected') {
                // When rejected, always return diamond to available (regardless of current status)
                // This handles: pending->rejected, confirmed->rejected, even paid->rejected
                await Diamond.findByIdAndUpdate(order.diamondId._id, {
                    Status: 'available',
                    HeldBy: null,
                    HeldAt: null,
                    InBasketBy: null,
                    InBasketAt: null
                });
                broadcasts.push({ id: order.diamondId._id, status: 'available', heldBy: null });
            }
        });

        await Promise.all(updates);

        // Broadcast updates
        const io = req.app.get('io');
        if (io) {
            // 1. Broadcast Diamond Updates
            if (broadcasts.length > 0) {
                broadcasts.forEach(b => io.emit('diamond:update', b));
            }

            // 2. Broadcast Order Update (to update Confirmation page)
            io.emit('order:updated', {
                orderIds: orderIds,
                status: status
            });

            // 3. Dashboard stats update
            io.emit('orderUpdated');
        }

        res.json({
            success: true,
            message: `Orders ${status} successfully`,
            count: updates.length
        });

    } catch (error) {
        console.error("Admin Update Order Status Error:", error);
        res.status(500).json({ success: false, message: "Server Error updating order status" });
    }
};

// User: Cancel Orders
exports.cancelOrders = async (req, res) => {
    try {
        const { orderIds } = req.body;
        const userId = req.user.id;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No orders selected' });
        }

        // Find orders ensuring they belong to user and are pending
        const orders = await Order.find({
            _id: { $in: orderIds },
            userId: userId,
            status: 'pending'
        }).populate('diamondId');

        if (orders.length === 0) {
            return res.status(400).json({ success: false, message: 'No pending orders found to cancel' });
        }

        const broadcasts = [];
        const deletedIds = [];

        const updates = orders.map(async (order) => {
            // Delete the order
            await Order.findByIdAndDelete(order._id);
            deletedIds.push(order._id);

            if (order.diamondId) {
                // Restore Diamond to Available
                await Diamond.findByIdAndUpdate(order.diamondId._id, {
                    Status: 'available',
                    HeldBy: null,
                    HeldAt: null,
                    InBasketBy: null,
                    InBasketAt: null
                });
                broadcasts.push({ id: order.diamondId._id, status: 'available', heldBy: null });
            }
        });

        await Promise.all(updates);

        // Broadcast to admin to remove from list
        const io = req.app.get('io');
        if (io && broadcasts.length > 0) {
            broadcasts.forEach(b => io.emit('diamond:update', b));
        }

        res.json({
            success: true,
            message: `${deletedIds.length} order(s) cancelled successfully`,
            cancelledIds: deletedIds
        });

    } catch (error) {
        console.error("Cancel Orders Error:", error);
        res.status(500).json({ success: false, message: "Server Error cancelling orders" });
    }
};

// Analytics: Get Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        const { id, role } = req.user;
        console.log(`DASHBOARD STATS REQ: UserID=${id}, Role=${role}`);


        let matchStage = {};
        // If NOT owner (client/employee), restrict to their data
        if (role !== 'owner') {
            matchStage = { userId: new mongoose.Types.ObjectId(id) };
        }

        const stats = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    // Count Metrics
                    totalOrders: { $sum: 1 },
                    confirmed: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$status", "confirmed"] },
                                        { $ne: ["$paymentStatus", "paid"] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    rejected: {
                        $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
                    },
                    allDone: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$paymentStatus", "paid"] },
                                        { $eq: ["$status", "confirmed"] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },

                    // Financial Metrics (Only for CONFIRMED orders)
                    // We exclude 'pending' (not yet approved) and 'rejected' (cancelled)
                    totalPaid: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", "confirmed"] },
                                { $ifNull: ["$paidAmount", 0] },
                                0
                            ]
                        }
                    },
                    totalDiscount: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", "confirmed"] },
                                { $ifNull: ["$discount", 0] },
                                0
                            ]
                        }
                    },
                    totalValue: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", "confirmed"] },
                                { $ifNull: ["$totalAmount", 0] },
                                0
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalOrders: 1,
                    confirmed: 1,
                    rejected: 1,
                    allDone: 1,
                    totalPaid: 1,
                    totalDiscount: 1,
                    // Due = Confirmed Value - Paid - Discount
                    totalDue: { $subtract: [{ $subtract: ["$totalValue", "$totalPaid"] }, "$totalDiscount"] }
                }
            }
        ]);

        const result = stats.length > 0 ? stats[0] : {
            totalOrders: 0, confirmed: 0, rejected: 0, allDone: 0, totalPaid: 0, totalDiscount: 0, totalDue: 0
        };

        // Fetch Basket & Hold Counts
        let basketQuery = { InBasketBy: { $ne: null } };
        let holdQuery = { Status: 'hold' };

        if (role !== 'owner') {
            basketQuery = { InBasketBy: new mongoose.Types.ObjectId(id) };
            holdQuery = { Status: 'hold', HeldBy: new mongoose.Types.ObjectId(id) };
        }

        const basketCount = await Diamond.countDocuments(basketQuery);
        const holdCount = await Diamond.countDocuments(holdQuery);

        result.basketCount = basketCount;
        result.holdCount = holdCount;

        res.json({ success: true, data: result });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ success: false, message: "Server Error fetching stats" });
    }
};

// Admin: Update Payment Details
exports.adminUpdatePayment = async (req, res) => {
    try {
        const { orderId, paidAmount, action } = req.body; // action: 'update' or 'settle'

        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Order ID is required' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Action: Settle (All Done / Discount)
        if (action === 'settle') {
            const currentPaid = paidAmount !== undefined ? Number(paidAmount) : order.paidAmount;
            order.paidAmount = currentPaid;
            order.discount = order.totalAmount - currentPaid;
            if (order.discount < 0) order.discount = 0; // Should not happen if logic is correct
            order.paymentStatus = 'paid';
        }
        // Action: Update (Normal Payment Entry)
        else {
            if (paidAmount !== undefined) {
                order.paidAmount = Number(paidAmount);
            }

            // Reset discount if manually updating amounts (unless we want to persist it, but manual update implies recalc)
            order.discount = 0;

            // Auto-calculate Payment Status
            if (order.paidAmount >= order.totalAmount) {
                order.paymentStatus = 'paid';
            } else if (order.paidAmount > 0) {
                order.paymentStatus = 'partial';
            } else {
                order.paymentStatus = 'pending';
            }
        }

        await order.save();

        // If payment is now complete, mark diamond as SOLD and set completedAt
        if (order.paymentStatus === 'paid' && order.diamondId) {
            await Diamond.findByIdAndUpdate(order.diamondId, { Status: 'sold' });

            // Set completedAt if not already set
            if (!order.completedAt) {
                order.completedAt = new Date();
                await order.save();
            }
        }

        // Broadcast Update
        const io = req.app.get('io');
        if (io) {
            io.emit('order:updated', {
                orderIds: [order._id],
                status: order.status,
                paymentStatus: order.paymentStatus,
                paidAmount: order.paidAmount,
                discount: order.discount
            });

            // Dashboard stats update
            io.emit('orderUpdated');
        }

        res.json({
            success: true,
            message: action === 'settle' ? 'Order settled with discount' : 'Payment updated successfully',
            data: order
        });

    } catch (error) {
        console.error("Admin Update Payment Error:", error);
        res.status(500).json({ success: false, message: "Server Error updating payment" });
    }
};

// ==================== ADMIN MANAGE DIAMOND LIST ====================

// Admin: Create New Diamond
exports.createDiamond = async (req, res) => {
    try {
        const diamondData = req.body;

        // Basic validation
        if (!diamondData.StockID || !diamondData["Amount$"]) {
            return res.status(400).json({ success: false, message: "StockID and Amount$ are required" });
        }

        // Check if StockID already exists
        const existing = await Diamond.findOne({ StockID: diamondData.StockID });
        if (existing) {
            return res.status(400).json({ success: false, message: "Diamond with this Stock ID already exists" });
        }

        const newDiamond = new Diamond(diamondData);
        await newDiamond.save();

        res.status(201).json({ success: true, message: "Diamond created successfully", data: newDiamond });
    } catch (error) {
        console.error("Create Diamond Error:", error);
        res.status(500).json({ success: false, message: "Server Error creating diamond" });
    }
};

// Admin: Update Diamond
exports.updateDiamond = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const diamond = await Diamond.findByIdAndUpdate(id, updates, { new: true });

        if (!diamond) {
            return res.status(404).json({ success: false, message: "Diamond not found" });
        }

        res.json({ success: true, message: "Diamond updated successfully", data: diamond });
    } catch (error) {
        console.error("Update Diamond Error:", error);
        res.status(500).json({ success: false, message: "Server Error updating diamond" });
    }
};

// Admin: Delete Diamond
exports.deleteDiamond = async (req, res) => {
    try {
        const { id } = req.params;
        const diamond = await Diamond.findByIdAndDelete(id);

        if (!diamond) {
            return res.status(404).json({ success: false, message: "Diamond not found" });
        }

        res.json({ success: true, message: "Diamond deleted successfully" });
    } catch (error) {
        console.error("Delete Diamond Error:", error);
        res.status(500).json({ success: false, message: "Server Error deleting diamond" });
    }
};

// Admin: Get All Diamonds (Paginated & Search)
exports.getAdminDiamonds = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';

        // Extract filter parameters
        const { shape, color, clarity, cut, polish, symmetry, fluorescence, location, status, caratMin, caratMax } = req.query;

        let query = {};

        // Search by Stone No or Report No
        if (search) {
            query.$or = [
                { StockID: { $regex: search, $options: 'i' } },
                { "Report No": { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by Shape
        if (shape) {
            try {
                const shapeArray = JSON.parse(shape);
                if (shapeArray.length > 0) {
                    query.Shape = { $in: shapeArray };
                }
            } catch (e) {
                console.error('Invalid shape filter:', e);
            }
        }

        // Filter by Color
        if (color) {
            try {
                const colorArray = JSON.parse(color);
                if (colorArray.length > 0) {
                    query.Color = { $in: colorArray };
                }
            } catch (e) {
                console.error('Invalid color filter:', e);
            }
        }

        // Filter by Clarity
        if (clarity) {
            try {
                const clarityArray = JSON.parse(clarity);
                if (clarityArray.length > 0) {
                    query.Clarity = { $in: clarityArray };
                }
            } catch (e) {
                console.error('Invalid clarity filter:', e);
            }
        }

        // Filter by Cut
        if (cut) {
            try {
                const cutArray = JSON.parse(cut);
                if (cutArray.length > 0) {
                    query.Cut = { $in: cutArray };
                }
            } catch (e) {
                console.error('Invalid cut filter:', e);
            }
        }

        // Filter by Polish
        if (polish) {
            try {
                const polishArray = JSON.parse(polish);
                if (polishArray.length > 0) {
                    query.Polish = { $in: polishArray };
                }
            } catch (e) {
                console.error('Invalid polish filter:', e);
            }
        }

        // Filter by Symmetry
        if (symmetry) {
            try {
                const symArray = JSON.parse(symmetry);
                if (symArray.length > 0) {
                    query.Sym = { $in: symArray };
                }
            } catch (e) {
                console.error('Invalid symmetry filter:', e);
            }
        }

        // Filter by Fluorescence
        if (fluorescence) {
            try {
                const flourArray = JSON.parse(fluorescence);
                if (flourArray.length > 0) {
                    query.Flour = { $in: flourArray };
                }
            } catch (e) {
                console.error('Invalid fluorescence filter:', e);
            }
        }

        // Filter by Location
        if (location) {
            try {
                const locationArray = JSON.parse(location);
                if (locationArray.length > 0) {
                    query.Location = { $in: locationArray };
                }
            } catch (e) {
                console.error('Invalid location filter:', e);
            }
        }

        // Filter by Status
        if (status) {
            try {
                const statusArray = JSON.parse(status);
                if (statusArray.length > 0) {
                    query.Status = { $in: statusArray };
                }
            } catch (e) {
                console.error('Invalid status filter:', e);
            }
        }

        // Filter by Carat range
        if (caratMin || caratMax) {
            query.Carats = {};
            if (caratMin) query.Carats.$gte = Number(caratMin);
            if (caratMax) query.Carats.$lte = Number(caratMax);
        }

        // Filter by Date Added (createdAt)
        const { dateFrom, dateTo } = req.query;
        if (dateFrom || dateTo) {
            console.log('===== DATE FILTER DEBUG =====');
            console.log('dateFrom (raw):', dateFrom);
            console.log('dateTo (raw):', dateTo);

            query.createdAt = {};
            if (dateFrom) {
                const fromDate = new Date(dateFrom);
                console.log('dateFrom (parsed):', fromDate);
                console.log('dateFrom (ISO):', fromDate.toISOString());
                query.createdAt.$gte = fromDate;
            }
            if (dateTo) {
                const toDate = new Date(dateTo);
                console.log('dateTo (parsed):', toDate);
                console.log('dateTo (ISO):', toDate.toISOString());
                query.createdAt.$lte = toDate;
            }
            console.log('createdAt query:', query.createdAt);
            console.log('===== END DATE FILTER DEBUG =====');
        }

        const total = await Diamond.countDocuments(query);
        const diamonds = await Diamond.find(query)
            .sort({ _id: -1 }) // Newest first (by ObjectId)
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({
            success: true,
            data: diamonds,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Get Admin Diamonds Error:", error);
        res.status(500).json({ success: false, message: "Server Error fetching diamonds" });
    }
};

// Bulk Upload Diamonds from CSV
exports.bulkUploadCSV = async (req, res) => {
    const csv = require('csv-parser');
    const fs = require('fs');
    const multer = require('multer');
    const path = require('path');

    // Configure multer for CSV upload
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = path.join(__dirname, '../uploads/csv');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            cb(null, `diamonds_${Date.now()}.csv`);
        }
    });

    const upload = multer({
        storage,
        fileFilter: (req, file, cb) => {
            if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
                cb(null, true);
            } else {
                cb(new Error('Only CSV files are allowed'));
            }
        }
    }).single('csvFile');

    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: `Upload Error: ${err.message}` });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
        }

        const filePath = req.file.path;
        let diamonds = [];
        const errors = [];
        let lineNumber = 0;
        let headers = [];

        try {
            // Parse CSV with header normalization
            await new Promise((resolve, reject) => {
                const stream = fs.createReadStream(filePath);
                stream.on('error', (ioErr) => reject(new Error(`File Read Error: ${ioErr.message}`)));

                stream.pipe(csv({
                    mapHeaders: ({ header }) => {
                        // Normalize headers: lowercase, remove non-alphanumeric chars
                        // e.g. "Stock ID" -> "stockid", "Amount$" -> "amount"
                        const h = header.trim().replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (lineNumber === 0) headers.push(h); // Collect headers for debug
                        return h;
                    }
                }))
                    .on('data', (row) => {
                        lineNumber++;

                        // Helper to safely get value from multiple possible keys
                        const getVal = (keys) => {
                            for (const k of keys) {
                                if (row[k] !== undefined && row[k] !== '') return row[k];
                            }
                            return undefined;
                        };

                        // Helper to safely parse numbers
                        const parseNum = (val) => {
                            if (!val) return 0;
                            const cleaner = String(val).replace(/,/g, '').replace(/[^0-9.-]/g, '');
                            return parseFloat(cleaner) || 0;
                        };

                        // Validation: Stock ID is mandatory
                        // keys are now lowercased and stripped: "Stock ID" -> "stockid"
                        const stockId = getVal(['stockid', 'stoneno', 'refno', 'stockno']);

                        if (!stockId) {
                            errors.push({ line: lineNumber, error: 'Missing Stock ID' });
                            return;
                        }

                        // Diameter cleaning
                        let rawDiam = getVal(['diametermm', 'diam', 'measurements', 'diameter']);
                        let cleanDiam = rawDiam ? String(rawDiam).trim() : null;

                        const diamond = {
                            StockID: stockId,
                            'Report No': getVal(['reportno', 'certno', 'report']) || '',
                            'Shape': (getVal(['shape']) || '').toUpperCase(),
                            'Carats': parseNum(getVal(['carats', 'weight', 'cts', 'size'])),
                            'Color': (getVal(['color']) || '').toUpperCase(),
                            'Clarity': (getVal(['clarity']) || '').toUpperCase(),
                            'Cut': (getVal(['cut']) || '').toUpperCase(),
                            'Polish': (getVal(['polish', 'pol']) || '').toUpperCase(),
                            'Sym': (getVal(['sym', 'symmetry']) || '').toUpperCase(),
                            'Flour': (getVal(['flour', 'fluor', 'fluorescence']) || '').toUpperCase(),
                            'Measurement': getVal(['measurement', 'measurements']) || '',
                            'Diameter (MM)': cleanDiam,
                            'Depth %': parseNum(getVal(['depth', 'depth%'])),
                            'Table %': parseNum(getVal(['table', 'table%'])),
                            'Lab': (getVal(['lab', 'cert']) || '').toUpperCase(),
                            'Amount$': parseNum(getVal(['amount', 'price', 'amount$', 'price$', 'total'])),
                            'GIALINK': getVal(['gialink', 'certlink', 'link', 'url']) || '',
                            'videoLink': getVal(['videolink', 'video', 'v360']) || '',
                            'Location': (getVal(['location', 'loc', 'city']) || '').toUpperCase(),
                            'Key To Symbols': getVal(['keytosymbols', 'keytosymbol', 'symboldescription']) || '',
                            'BGM': (getVal(['bgm']) || '').toUpperCase(),
                            'Status': 'available'
                        };

                        diamonds.push(diamond);
                    })
                    .on('end', resolve)
                    .on('error', (parseErr) => reject(new Error(`CSV Parsing Failed: ${parseErr.message}`)));
            });

            // If no diamonds parsed
            if (diamonds.length === 0) {
                const msg = errors.length > 0 ? `Found ${errors.length} validation errors` : 'No valid data found in CSV. Check if headers match expected format.';
                return res.status(400).json({
                    success: false,
                    message: msg,
                    debugHeaders: headers,
                    errors: errors.slice(0, 5)
                });
            }

            // Check for duplicate StockID in CSV
            const stockIds = diamonds.map(d => d.StockID);
            const duplicatesInCSV = stockIds.filter((item, index) => stockIds.indexOf(item) !== index);

            if (duplicatesInCSV.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Duplicate Stock IDs found inside the CSV: ${duplicatesInCSV.slice(0, 5).join(', ')}...`,
                });
            }

            // Check for existing StockID in database (Batch Check)
            const BATCH_SIZE = 1000;
            const existingStockIds = [];

            for (let i = 0; i < stockIds.length; i += BATCH_SIZE) {
                const chunk = stockIds.slice(i, i + BATCH_SIZE);
                const existing = await Diamond.find({ StockID: { $in: chunk } }).select('StockID').lean();
                existingStockIds.push(...existing.map(d => d.StockID));
            }

            // Filter out duplicates instead of rejecting entire upload
            const originalCount = diamonds.length;
            const newDiamonds = diamonds.filter(d => !existingStockIds.includes(d.StockID));
            const skippedCount = originalCount - newDiamonds.length;

            // If all diamonds are duplicates, inform the user
            if (newDiamonds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `All ${originalCount} diamond(s) already exist in the database. No new diamonds to upload.`,
                    totalInCSV: originalCount,
                    skippedDuplicates: skippedCount,
                    duplicateStockIds: existingStockIds.slice(0, 20)
                });
            }

            // Continue with only new diamonds
            diamonds = newDiamonds;

            // Bulk Insert with Error Capture
            // Bulk Insert with Partial Success Handling
            let insertedCount = 0;
            let writeErrors = [];

            try {
                const result = await Diamond.insertMany(diamonds, { ordered: false });
                insertedCount = result.length;
            } catch (insertError) {
                if (insertError.insertedDocs) {
                    insertedCount = insertError.insertedDocs.length;
                } else if (insertError.result && insertError.result.nInserted) {
                    insertedCount = insertError.result.nInserted;
                }

                if (insertError.writeErrors) {
                    writeErrors = insertError.writeErrors.map(e => ({
                        code: e.code,
                        msg: e.errmsg,
                        key: e.keyValue
                    }));
                } else {
                    // Critical failure (not write error)
                    throw insertError;
                }
            }

            // Cleanup
            try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }

            if (insertedCount > 0) {
                // Success or Partial Success
                let msg = `Successfully imported ${insertedCount} new diamond(s).`;
                if (skippedCount > 0) {
                    msg += ` Skipped ${skippedCount} duplicate(s).`;
                }
                if (writeErrors.length > 0) {
                    msg += ` WARNING: ${writeErrors.length} item(s) had insertion errors.`;
                    // Log details to server log
                    fs.appendFileSync('csv_error.log', `[${new Date().toISOString()}] Partial Success. Skipped: ${JSON.stringify(writeErrors)}\n`);
                } else {
                    fs.appendFileSync('csv_upload.log', `[${new Date().toISOString()}] Success: Imported ${insertedCount} diamonds, Skipped ${skippedCount} duplicates\n`);
                }

                // Broadcast
                const io = req.app.get('io');
                if (io) io.emit('diamondsUpdated');

                return res.status(200).json({
                    success: true,
                    message: msg,
                    inserted: insertedCount,
                    skippedDuplicates: skippedCount,
                    totalInCSV: originalCount,
                    duplicateStockIds: existingStockIds.slice(0, 20),
                    warnings: writeErrors.slice(0, 10) // Limit output
                });

            } else {
                // Total failure
                const duplicates = writeErrors.filter(e => e.code === 11000).map(e => e.key?.StockID || 'unknown').join(', ');
                const msg = duplicates ? `All items failed. Duplicates found: ${duplicates}` : `Failed to insert any diamonds. Errors: ${writeErrors[0]?.msg}`;

                return res.status(400).json({
                    success: false,
                    message: msg,
                    errors: writeErrors
                });
            }

        } catch (error) {
            // Cleanup on error
            try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }

            // Log full error
            const errorDetails = error.stack || error.message;
            try { fs.appendFileSync('csv_error.log', `[${new Date().toISOString()}] CRITICAL ERROR: ${errorDetails}\n`); } catch (e) { }

            console.error('CSV Upload Error:', error);

            res.status(500).json({
                success: false,
                message: `Server Error: ${error.message}`,
                error: errorDetails
            });
        }
    });
};

// Admin: Bulk Delete Diamonds
exports.bulkDeleteDiamonds = async (req, res) => {
    try {
        const { diamondIds } = req.body;

        if (!diamondIds || !Array.isArray(diamondIds) || diamondIds.length === 0) {
            return res.status(400).json({ success: false, message: "No diamond IDs provided for deletion" });
        }

        const result = await Diamond.deleteMany({ _id: { $in: diamondIds } });

        res.json({
            success: true,
            message: `${result.deletedCount} diamonds deleted successfully`
        });
    } catch (error) {
        console.error("Bulk Delete Error:", error);
        res.status(500).json({ success: false, message: "Server Error deleting diamonds" });
    }
};

