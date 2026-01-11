const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGO_URI;

async function checkDb() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to:', uri);

        const cols = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections in default DB:', cols.map(c => c.name));

        for (const col of cols) {
            const count = await mongoose.connection.db.collection(col.name).countDocuments();
            console.log(`  ${col.name}: ${count} docs`);

            if (col.name === 'surnivasdiamondlist') {
                const sample = await mongoose.connection.db.collection(col.name).findOne();
                console.log('Sample Doc:', JSON.stringify(sample, null, 2));
            }
        }

        // Also check 'test' db just in case
        // output: 'Done'
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkDb();
