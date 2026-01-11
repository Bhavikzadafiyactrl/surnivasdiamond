const mongoose = require('mongoose');
require('dotenv').config();

const diamondSchema = new mongoose.Schema({
    Status: String,
    HeldBy: String,
    HeldAt: Date
}, { collection: 'surnivasdiamondlist' });

const Diamond = mongoose.model('Diamond', diamondSchema);

async function checkHeldDiamonds() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const heldCount = await Diamond.countDocuments({ Status: 'hold' });
        console.log(`Total diamonds with Status='hold': ${heldCount}`);

        const heldWithUserCount = await Diamond.countDocuments({ Status: 'hold', HeldBy: { $exists: true, $ne: null } });
        console.log(`Total diamonds with Status='hold' AND HeldBy set: ${heldWithUserCount}`);

        if (heldCount > 0) {
            const sample = await Diamond.findOne({ Status: 'hold' }).lean();
            console.log("Sample held diamond:", JSON.stringify(sample, null, 2));
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

checkHeldDiamonds();
