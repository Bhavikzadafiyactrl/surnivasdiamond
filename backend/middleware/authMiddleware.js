const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Get token from cookie (new only) OR header
    const token = req.cookies.session_token || req.header('x-auth-token');

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
