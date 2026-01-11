require('dotenv').config();
const mongoose = require('mongoose');
const Diamond = require('./models/Diamond');

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB.");

        // 1. Query Mongo for ROUND
        // Note: My controller maps input 'ROUND' to query { Shape: { $in: ['ROUND'] } } (if simple map)

        console.log("Querying { Shape: 'ROUND' }...");
        const docs = await Diamond.find({ Shape: 'ROUND' }).limit(15000);
        console.log(`Found ${docs.length} ROUND diamonds.`);

        // 2. Filter for L=5.45 (User's example length)
        const targetL = 5.45;
        console.log(`Filtering for Length ~ ${targetL}...`);

        const matches = docs.filter(d => {
            if (!d.Measurement) return false;
            const parts = d.Measurement.split(/[x\-\*]/).map(s => parseFloat(s.trim()));
            if (parts.length < 2) return false;
            const L = parts[0];
            // Allow small epsilon
            return Math.abs(L - targetL) < 0.01;
        });

        console.log(`Found ${matches.length} match(es) in ROUND subset.`);

        if (matches.length > 0) {
            console.log("Sample Match:", matches[0].Measurement, "| Shape:", matches[0].Shape);
        } else {
            console.log("Checking if the diamond exists in the FULL database (ignoring Shape filter)...");
            const all = await Diamond.find({}).limit(15000);
            const ANY = all.filter(d => {
                if (!d.Measurement) return false;
                const parts = d.Measurement.split(/[x\-\*]/).map(s => parseFloat(s.trim()));
                return parts.length >= 1 && Math.abs(parts[0] - targetL) < 0.01;
            });

            console.log(`In Full DB: Found ${ANY.length} diamonds with L=${targetL}.`);
            if (ANY.length > 0) {
                const d = ANY[0];
                console.log("Found candidate!");
                console.log("Measurement:", d.Measurement);
                console.log("Shape Value:", `"${d.Shape}"`);
                console.log("Is Shape === 'ROUND'?", d.Shape === 'ROUND');
                console.log("Character codes:", d.Shape.split('').map(c => c.charCodeAt(0)));
            } else {
                console.log("Could not find ANY diamond with this length in DB. Maybe user input is different?");
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
test();
