const mongoose = require('mongoose');
const Diamond = require('./models/Diamond');
require('dotenv').config();

const checkDiamonds = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const diamonds = await Diamond.find().sort({ _id: -1 }).limit(10).lean();

        console.log('--- LAST 10 DIAMONDS ---');
        diamonds.forEach(d => {
            console.log(`ID: ${d._id}`);
            console.log(`Stone No: ${d['Stone No']}`);
            console.log(`GIALINK: ${d.GIALINK || '(empty)'}`);
            console.log(`videoLink: ${d.videoLink || '(empty)'}`);
            console.log('-----------------------');
        });

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkDiamonds();
