const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOtpEmail } = require('../utils/emailService');
const { logSecurityEvent } = require('../utils/logger');
const SecurityLog = require('../models/SecurityLog');
const { getDeviceFingerprint, checkOtpLimit, incrementOtpCount } = require('../utils/otpRateLimiter');

// Helper: Send Verify OTP (Email)
const sendVerifyOtp = async (user, email) => {
    if (!email) return false;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to user
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    console.log(`[OTP] Generated OTP ${otp} for ${email}`);

    // Send via Email
    return await sendOtpEmail(email, otp);
};

// Signup
exports.signup = async (req, res) => {
    try {
        let { name, email, password, mobile, companyName, address, city, country, zipCode, turnstileToken } = req.body;

        // Turnstile verification removed as per user request

        // Normalize email
        if (email) email = email.toLowerCase().trim();

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user && user.isVerified) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Check if mobile is already used by a verified user
        const existingMobileUser = await User.findOne({ mobile });
        if (existingMobileUser && existingMobileUser.isVerified) {
            return res.status(400).json({ message: 'Mobile number already registered' });
        }

        // Mobile is mandatory for SMS Verify
        if (!mobile) {
            return res.status(400).json({ message: 'Mobile number is required for verification.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        if (user && !user.isVerified) {
            // Update existing unverified user
            user.name = name;
            user.password = hashedPassword;
            user.mobile = mobile;
            user.companyName = companyName;
            user.address = address;
            user.city = city;
            user.country = country;
            user.zipCode = zipCode;

            // Clear old legacy OTP fields
            user.otp = undefined;
            user.otpExpires = undefined;

            await user.save();
        } else {
            // Create new user
            user = new User({
                name,
                email,
                password: hashedPassword,
                mobile,
                companyName: companyName || '',
                address: address || '',
                city: city || '',
                country: country || '',
                zipCode: zipCode || ''
                // No otp/otpExpires stored
            });
            await user.save();
        }

        // --- DEVICE-BASED OTP RATE LIMITING ---
        const deviceId = getDeviceFingerprint(req);
        const limitCheck = checkOtpLimit(deviceId);

        if (!limitCheck.canSend) {
            const resetTime = new Date(limitCheck.resetTime).toLocaleString();
            return res.status(429).json({
                message: `OTP limit reached. Maximum 3 OTPs per device per day. Try again after ${resetTime}`,
                remainingAttempts: 0
            });
        }

        console.log(`[OTP] Device ${deviceId.substring(0, 20)}... has ${limitCheck.remaining} attempts remaining`);
        // -------------------------

        // Send OTP via Email
        const sent = await sendVerifyOtp(user, email);

        if (sent) {
            // Increment device counter on successful send
            incrementOtpCount(deviceId);
        }

        // Emit socket regardless of SMS result (user created)
        const io = req.app.get('io');
        if (io) {
            io.emit('user:registered', { userId: user._id, name: user.name });
        }

        if (!sent) {
            // If Email fails, we might warn user but usually we want to block or fallback.
            return res.status(500).json({ message: 'Account created but failed to send Email OTP. Please contact support or try login to Resend.', userId: user._id });
        }

        res.status(200).json({ message: 'OTP sent to your Email.', userId: user._id });

    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


// Verify OTP
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'User already verified' });
        }

        if (!user.mobile) {
            return res.status(400).json({ message: 'User has no mobile number linked.' });
        }

        // Verify with Database OTP
        console.log(`[OTP Verify] Attempting to verify OTP for user: ${email}, OTP: ${otp}`);

        if (!user.otp || user.otp !== otp) {
            console.log(`[OTP Verify] FAILED - Invalid OTP for user: ${email}`);
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (user.otpExpires && user.otpExpires < Date.now()) {
            console.log(`[OTP Verify] FAILED - Expired OTP for user: ${email}`);
            return res.status(400).json({ message: 'OTP has expired' });
        }

        console.log(`[OTP Verify] SUCCESS - OTP verified for user: ${email}`);

        // Verify user logic
        user.isVerified = true;
        // Clean up any legacy fields
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        if (!user.verifiedByOwners) {
            return res.status(200).json({
                message: 'Email Verified. Account pending User Approval.',
                pendingApproval: true,
                userId: user._id
            });
        }

        // Generate JWT Token
        const payload = {
            user: {
                id: user._id,
                role: user.role || 'client'
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '30d' },
            (err, token) => {
                if (err) throw err;

                // Send HttpOnly Cookie
                const isProduction = process.env.NODE_ENV === 'production';
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: isProduction,
                    sameSite: isProduction ? 'none' : 'lax',
                    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                    path: '/'
                });

                // Do not send token in JSON
                res.json({ user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile, role: user.role || 'client' } });
            }
        );

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { email, password, turnstileToken } = req.body;

        // Turnstile verification removed

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if account is locked
        if (user.lockUntil && user.lockUntil > Date.now()) {
            const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000); // minutes
            return res.status(423).json({
                message: `Account locked due to too many failed login attempts. Try again in ${remainingTime} minute(s).`,
                locked: true,
                lockUntil: user.lockUntil
            });
        }

        if (!user.isVerified) {
            return res.status(400).json({ message: 'Please verify your email first', unverified: true });
        }

        if (!user.verifiedByOwners) {
            return res.status(403).json({ message: 'Account pending User Approval.', pendingApproval: true });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Increment login attempts
            user.loginAttempts = (user.loginAttempts || 0) + 1;

            // Lock account after 5 failed attempts
            const MAX_LOGIN_ATTEMPTS = 5;
            const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

            if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
                user.lockUntil = new Date(Date.now() + LOCK_TIME);
                await user.save();
                return res.status(423).json({
                    message: 'Account locked due to too many failed login attempts. Try again in 15 minutes.',
                    locked: true
                });
            }

            await user.save();
            const attemptsLeft = MAX_LOGIN_ATTEMPTS - user.loginAttempts;
            return res.status(400).json({
                message: `Invalid credentials. ${attemptsLeft} attempt(s) remaining before account lock.`
            });
        }

        // Reset login attempts on successful login
        if (user.loginAttempts > 0 || user.lockUntil) {
            user.loginAttempts = 0;
            user.lockUntil = undefined;
            await user.save();
        }

        // Return JWT
        const payload = {
            user: {
                id: user._id,
                role: user.role || 'client'
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '30d' },
            (err, token) => {
                if (err) throw err;

                // Send HttpOnly Cookie
                // Use SameSite: None for production to allow cross-site/cross-domain usage if needed
                // But Secure MUST be true for SameSite: None
                const isProduction = process.env.NODE_ENV === 'production';

                res.cookie('token', token, {
                    httpOnly: true,
                    secure: isProduction, // Secure is required for SameSite: None
                    sameSite: isProduction ? 'none' : 'lax',
                    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                    path: '/'
                });

                res.json({ user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile, role: user.role || 'client' } });
            }
        );

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Logout
exports.logout = (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';

    // Helper to clear cookie with various options
    const paths = ['/', '/api', '/api/auth', '/api/auth/'];
    const domains = [
        undefined, // Current host (default)
        '.surnivasdiamond.com',
        'surnivasdiamond.com',
        'www.surnivasdiamond.com',
        req.hostname,
        `.${req.hostname}`
    ];

    // Unique domains
    const uniqueDomains = [...new Set(domains)];

    paths.forEach(path => {
        uniqueDomains.forEach(domain => {
            // Try clearing with SameSite: None (Secure)
            if (isProduction) {
                res.clearCookie('token', {
                    path,
                    domain,
                    secure: true,
                    sameSite: 'none',
                    httpOnly: true
                });
            }

            // Try clearing with SameSite: Lax (Legacy/Default)
            res.clearCookie('token', {
                path,
                domain,
                secure: isProduction,
                sameSite: 'lax',
                httpOnly: true
            });

            // Try clearing without specific options (minimal)
            res.clearCookie('token', { path, domain });
        });
    });

    res.json({ message: 'Logged out successfully' });
};



// Resend OTP
exports.resendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'User already verified' });
        }

        if (!user.mobile) {
            return res.status(400).json({ message: 'Mobile number required.' });
        }

        // --- DEVICE-BASED OTP RATE LIMITING ---
        const deviceId = getDeviceFingerprint(req);
        const limitCheck = checkOtpLimit(deviceId);

        if (!limitCheck.canSend) {
            const resetTime = new Date(limitCheck.resetTime).toLocaleString();
            return res.status(429).json({
                message: `OTP limit reached. Maximum 3 OTPs per device per day. Try again after ${resetTime}`,
                remainingAttempts: 0
            });
        }

        console.log(`[OTP Resend] Device ${deviceId.substring(0, 20)}... has ${limitCheck.remaining} attempts remaining`);
        // -------------------------

        // Send OTP via Email
        const sent = await sendVerifyOtp(user, user.email);

        if (sent) {
            // Increment device counter on successful send
            incrementOtpCount(deviceId);
        }

        if (!sent) {
            return res.status(500).json({ message: 'Error sending Email.' });
        }

        res.status(200).json({ message: 'New OTP sent to your Email' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get Profile
exports.getProfile = async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const user = await User.findById(req.user.id).select('-password -otp -otpExpires');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Send OTP for Profile Update
exports.sendProfileOtp = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP to user (valid for 10 mins)
        user.profileOtp = otp;
        user.profileOtpExpires = Date.now() + 10 * 60 * 1000;

        await user.save();

        // Send Email via Nodemailer
        const sent = await sendOtpEmail(user.email, otp);
        if (!sent) {
            return res.status(500).json({ message: 'Failed to send OTP email.' });
        }

        res.json({ message: 'OTP sent to your email.' });
    } catch (error) {
        console.error("Send Profile OTP Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Verify OTP and Update Profile
exports.verifyProfileUpdate = async (req, res) => {
    try {
        const { otp, updateData } = req.body;
        const { companyName, address, city, country, zipCode } = updateData;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify OTP
        if (!user.profileOtp || user.profileOtp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (user.profileOtpExpires < Date.now()) {
            return res.status(400).json({ message: 'OTP has expired' });
        }

        // Update Allowed Fields
        if (companyName) user.companyName = companyName;
        if (address) user.address = address;
        if (city) user.city = city;
        if (country) user.country = country;
        if (zipCode) user.zipCode = zipCode;

        // Note: Name and Mobile are NOT updated here as per requirements

        // Clear OTP
        user.profileOtp = undefined;
        user.profileOtpExpires = undefined;

        await user.save();

        res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error("Verify Profile Update Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Legacy Update Profile (Kept for compatibility if needed, but UI will use above)
exports.updateProfile = async (req, res) => {
    try {
        const { name, mobile, address, companyName, city, country, zipCode } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Allow all updates in legacy route (or restrict if strict)
        if (name) user.name = name;
        if (mobile) user.mobile = mobile;
        if (address) user.address = address;
        if (companyName) user.companyName = companyName;
        if (city) user.city = city;
        if (country) user.country = country;
        if (zipCode) user.zipCode = zipCode;

        await user.save();

        res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get All Users (Admin)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password -otp -otpExpires').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error("Get All Users Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin Update User
exports.adminUpdateUser = async (req, res) => {
    try {
        const { userId, ...updateData } = req.body;

        // Remove sensitive fields if present
        delete updateData.password;
        delete updateData.otp;

        // Validate managedBy if provided
        if (updateData.managedBy && !['none', 'bhavik', 'nikul'].includes(updateData.managedBy)) {
            return res.status(400).json({ message: 'Invalid managedBy value' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true }
        ).select('-password -otp -otpExpires');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Socket IO - Emit user updated event
        const io = req.app.get('io');
        if (io) {
            io.emit('user:updated', {
                userId: user._id,
                updatedBy: req.user.id,
                updates: {
                    role: user.role,
                    isVerified: user.isVerified,
                    verifiedByOwners: user.verifiedByOwners,
                    managedBy: user.managedBy
                }
            });
        }

        res.json({ success: true, message: 'User updated successfully', data: user });
    } catch (error) {
        console.error("Admin Update User Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin Delete User
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Socket IO - Emit user deleted event
        const io = req.app.get('io');
        if (io) {
            io.emit('user:deleted', { userId });
        }

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error("Delete User Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Change Password with OTP Verification
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, otp } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword || !otp) {
            return res.status(400).json({ message: 'Current password, new password, and OTP are required' });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            console.log('Change Password Failed: Incorrect current password');
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        console.log(`Verifying OTP for user ${userId}. Stored: ${user.profileOtp}, Received: ${otp}`);

        // Verify OTP (using the same stored OTP from sendProfileOtp)
        if (!user.profileOtp || !user.profileOtpExpires) {
            console.log('Change Password Failed: No OTP found in DB');
            return res.status(400).json({ message: 'No OTP found. Please request a new one.' });
        }

        if (user.profileOtp !== otp) {
            console.log(`Change Password Failed: OTP mismatch. Stored: ${user.profileOtp}, Received: ${otp}`);
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (Date.now() > user.profileOtpExpires) {
            console.log('Change Password Failed: OTP expired');
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Clear OTP fields
        user.profileOtp = undefined;
        user.profileOtpExpires = undefined;

        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Forgot Password - Send OTP
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User with this email does not exist' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP to profileOtp (reusing this field for password reset verification)
        user.profileOtp = otp;
        user.profileOtpExpires = Date.now() + 10 * 60 * 1000; // 10 mins

        await user.save();

        // Send Email
        const sent = await sendOtpEmail(user.email, otp);
        if (!sent) {
            return res.status(500).json({ message: 'Failed to send OTP email.' });
        }

        res.json({ message: 'OTP sent to your email.' });
    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Verify Reset OTP
exports.verifyResetOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.profileOtp || user.profileOtp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (user.profileOtpExpires < Date.now()) {
            return res.status(400).json({ message: 'OTP has expired' });
        }

        res.json({ message: 'OTP Verified' });
    } catch (error) {
        console.error("Verify Reset OTP Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify OTP again for security
        if (!user.profileOtp || user.profileOtp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (user.profileOtpExpires < Date.now()) {
            return res.status(400).json({ message: 'OTP has expired' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Clear OTP
        user.profileOtp = undefined;
        user.profileOtpExpires = undefined;

        await user.save();

        res.json({ message: 'Password reset successfully. You can now login.' });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};
