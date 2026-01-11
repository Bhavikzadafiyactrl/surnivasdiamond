// OTP Rate Limiter - Tracks OTP attempts by device fingerprint
// Limits to 3 OTP sends per device per 24 hours

const otpAttempts = new Map(); // { deviceId: { count, timestamp } }

/**
 * Generate device fingerprint from IP and User-Agent
 */
function getDeviceFingerprint(req) {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0];
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Create a simple hash-like fingerprint
    return `${ip}_${userAgent.substring(0, 50)}`; // Limit UA length to prevent huge keys
}

/**
 * Check if device can send OTP
 * Returns: { canSend: boolean, remaining: number, resetTime: Date }
 */
function checkOtpLimit(deviceId) {
    const record = otpAttempts.get(deviceId);
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    // No record or record is older than 24 hours - allow
    if (!record || (now - record.timestamp) > ONE_DAY) {
        return {
            canSend: true,
            remaining: 3,
            resetTime: new Date(now + ONE_DAY)
        };
    }

    // Check if limit exceeded
    if (record.count >= 3) {
        return {
            canSend: false,
            remaining: 0,
            resetTime: new Date(record.timestamp + ONE_DAY)
        };
    }

    // Can send, but some attempts used
    return {
        canSend: true,
        remaining: 3 - record.count,
        resetTime: new Date(record.timestamp + ONE_DAY)
    };
}

/**
 * Increment OTP count for device
 */
function incrementOtpCount(deviceId) {
    const record = otpAttempts.get(deviceId);
    const now = Date.now();

    if (!record || (now - record.timestamp) > 24 * 60 * 60 * 1000) {
        // New record or expired - start fresh
        otpAttempts.set(deviceId, { count: 1, timestamp: now });
    } else {
        // Increment existing
        record.count++;
        otpAttempts.set(deviceId, record);
    }
}

/**
 * Get current stats for device (for debugging/admin)
 */
function getDeviceStats(deviceId) {
    const record = otpAttempts.get(deviceId);
    if (!record) {
        return { count: 0, timestamp: null };
    }
    return record;
}

/**
 * Cleanup old entries (run periodically)
 * Removes entries older than 24 hours to prevent memory bloat
 */
function cleanupOldEntries() {
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    let cleaned = 0;

    for (const [key, value] of otpAttempts.entries()) {
        if (now - value.timestamp > ONE_DAY) {
            otpAttempts.delete(key);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`[OTP Rate Limiter] Cleaned ${cleaned} old entries. Current size: ${otpAttempts.size}`);
    }
}

// Run cleanup every hour
setInterval(cleanupOldEntries, 60 * 60 * 1000);

module.exports = {
    getDeviceFingerprint,
    checkOtpLimit,
    incrementOtpCount,
    getDeviceStats
};
