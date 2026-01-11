const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Get token from cookie OR header (fallback for backward compat or apps)
    const token = req.cookies.token || req.header('x-auth-token');

    // Check if not token

    // Check if not token
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};
