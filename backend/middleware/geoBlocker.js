const geoip = require('geoip-lite');

const geoBlocker = (req, res, next) => {
    // 0. ADMIN BYPASS: Check for secret key in Query or Cookie
    const BYPASS_KEY = 's1u2r3n4i5v6a7s8d9i10a11m12o13n14d'; // Secret Key

    // If query has key, set cookie and allow
    if (req.query.bypass === BYPASS_KEY) {
        // Set cookie valid for 30 days
        res.cookie('geo_bypass', BYPASS_KEY, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 Days
            sameSite: 'Lax',
            secure: false // Set to true if HTTPS
        });
        return next();
    }

    // If cookie already exists, allow
    if (req.cookies && req.cookies.geo_bypass === BYPASS_KEY) {
        return next();
    }

    // 1. Get Client IP
    // Handling X-Forwarded-For is crucial when behind Nginx/Cloudflare
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || req.ip;

    // 2. Allow Localhost (Development)
    //   if (ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1')) {
    //     return next();
    //  }
    //
    // 3. Lookup Geo Location
    // geoip.lookup might return null for private/local IPs
    const geo = geoip.lookup(ip);

    // 4. Check Country
    // STRICT MODE: Block if geo is null (unknown/local) OR country is not VN
    if (!geo || geo.country !== 'VN') {
        // console.warn(`[GeoBlock] Blocked access from IP: ${ip}, Country: ${geo ? geo.country : 'Unknown/Local'}`);
        return res.status(403).json({
            message: 'Access Restricted: This website is only available in Vietnam.',
            country: geo ? geo.country : 'Unknown'
        });
    }

    // Optional: Log allowed access
    if (geo) {
        // console.log(`[GeoBlock] Allowed access from ${geo.country}`);
    }

    next();
};

module.exports = geoBlocker;
