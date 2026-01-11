// Script to drop the unique index on Report No field using Mongoose
require('dotenv').config();
const mongoose = require('mongoose');

async function dropReportNoIndex() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('surnivasdiamondlist');

        // List all indexes
        const indexes = await collection.indexes();
        console.log('\n📋 Current indexes:');
        indexes.forEach(idx => console.log(`  - ${idx.name}`));

        // Drop the Report No unique index
        try {
            await collection.dropIndex('Report No_1');
            console.log('\n✅ Successfully dropped "Report No_1" index');
        } catch (err) {
            if (err.code === 27) {
                console.log('\n⚠️  Index "Report No_1" does not exist (already dropped)');
            } else {
                throw err;
            }
        }

        // Verify indexes after drop
        const updatedIndexes = await collection.indexes();
        console.log('\n📋 Updated indexes:');
        updatedIndexes.forEach(idx => console.log(`  - ${idx.name}`));

        console.log('\n✅ Done! You can now save diamonds with duplicate Report Numbers.');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Connection closed');
        process.exit(0);
    }
}

dropReportNoIndex();
