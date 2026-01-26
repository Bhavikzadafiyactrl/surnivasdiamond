const mongoose = require('mongoose');

const diamondSchema = new mongoose.Schema({
    Location: String,
    StockID: { type: String, unique: true, required: true },
    "Report No": { type: String, sparse: true },
    Shape: String,
    Carats: Number,
    Color: String,
    Clarity: String,
    Cut: String,
    Polish: String,
    Sym: String,
    Flour: String,
    Measurement: String,
    "Diameter (MM)": String, // User mentioned ignoring this, but we keep it in schema
    "Depth %": Number,
    "Table %": Number,
    "Key To Symbols": String,
    BGM: String,
    Lab: String,
    "Amount$": Number, // Price field
    Status: { type: String, default: 'available' }, // 'available', 'hold', 'reviewing', 'confirmed', 'sold'
    HeldBy: String, // User ID who held the diamond
    HeldAt: Date, // Timestamp when it was held
    InBasketBy: String, // User ID who added to basket
    InBasketAt: Date, // Timestamp when added to basket
    GIALINK: String, // Link to certificate
    videoLink: String // Link to diamond video
}, { collection: 'surnivasdiamondlist' }); // Explicitly bind to 'surnivasdiamondlist' collection

// Add index for common search fields
diamondSchema.index({ Shape: 1, Carats: 1, Color: 1, Clarity: 1 });

module.exports = mongoose.model('Diamond', diamondSchema);
