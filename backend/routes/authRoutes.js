const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {
    signupValidation,
    loginValidation,
    verifyOtpValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    handleValidationErrors
} = require('../middleware/validationMiddleware');

// @route   POST api/auth/signup
// @desc    Register user & get OTP
// @access  Public
router.post('/signup', signupValidation, handleValidationErrors, authController.signup);

// @route   POST api/auth/verify-otp
// @desc    Verify OTP & get token
// @access  Public
router.post('/verify-otp', verifyOtpValidation, handleValidationErrors, authController.verifyOtp);

// @route   POST api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', loginValidation, handleValidationErrors, authController.login);

// @route   POST api/auth/logout
// @desc    Logout user & clear cookie
// @access  Public
router.post('/logout', authController.logout);

// @route   POST api/auth/resend-otp
// @desc    Resend OTP for verification
// @access  Public
router.post('/resend-otp', authController.resendOtp);

// @route   POST api/auth/forgot-password
// @desc    Send password reset OTP
// @access  Public
router.post('/forgot-password', forgotPasswordValidation, handleValidationErrors, authController.forgotPassword);

// @route   POST api/auth/verify-reset-otp
// @desc    Verify reset OTP
// @access  Public
router.post('/verify-reset-otp', authController.verifyResetOtp);

// @route   POST api/auth/reset-password
// @desc    Reset password (final)
// @access  Public
router.post('/reset-password', resetPasswordValidation, handleValidationErrors, authController.resetPassword);

const auth = require('../middleware/authMiddleware');

// @route   GET api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, authController.getProfile);

// @route   PUT api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, authController.updateProfile);

// @route   POST api/auth/profile/send-otp
// @desc    Send OTP for profile update
// @access  Private
router.post('/profile/send-otp', auth, authController.sendProfileOtp);

// @route   POST api/auth/profile/verify-update
// @desc    Verify OTP and update profile
// @access  Private
router.post('/profile/verify-update', auth, authController.verifyProfileUpdate);

// @route   POST api/auth/change-password
// @desc    Change password with OTP verification
// @access  Private
router.post('/change-password', auth, authController.changePassword);

// @route   GET api/auth/users
// @desc    Get all users (Admin)
// @access  Private
router.get('/users', auth, authController.getAllUsers);

// @route   PUT api/auth/users/update
// @desc    Admin update user
// @access  Private
router.put('/users/update', auth, authController.adminUpdateUser);

// @route   DELETE api/auth/users/delete
// @desc    Admin delete user
// @access  Private
router.delete('/users/delete', auth, authController.deleteUser);

module.exports = router;
