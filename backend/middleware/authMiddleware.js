const jwt = require('jsonwebtoken');

const User = require('../models/User');

module.exports = async function (req, res, next) {
    // Get token from cookie (new V3 only) OR header
    const token = req.cookies.surnivash_auth_v3 || req.header('x-auth-token');

    // Check if not token
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if token version matches user version in DB (for invalidation)
        const user = await User.findById(decoded.user.id).select('tokenVersion');

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Compare versions (default 0 if undefined)
        const tokenVersion = decoded.user.tokenVersion || 0;
        const userVersion = user.tokenVersion || 0;

        if (tokenVersion !== userVersion) {
            console.log(`[AUTH FAIL] Version Mismatch. User: ${user._id}, Token: ${tokenVersion}, DB: ${userVersion}`);
            return res.status(401).json({ message: 'Session expired/invalidated' });
        }

        console.log(`[AUTH SUCCESS] User: ${user._id}, Version: ${tokenVersion}`);
        req.user = decoded.user;
        next();
    } catch (err) {
        console.error("Auth Middleware Error:", err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};
