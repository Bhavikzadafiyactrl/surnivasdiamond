const { body, validationResult } = require('express-validator');

// Validation Rules
const signupValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format'),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain: 1 uppercase, 1 lowercase, 1 number, 1 special character'),

    body('mobile')
        .notEmpty().withMessage('Mobile number is required')
        .matches(/^\+[1-9]\d{1,14}$/).withMessage('Mobile must be in E.164 format (e.g., +919876543210)'),

    body('companyName')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('Company name too long'),

    body('address')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Address too long'),

    body('city')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('City name too long'),

    body('country')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Country name too long'),

    body('zipCode')
        .optional()
        .trim()
        .isLength({ max: 20 }).withMessage('Zip code too long')
];

const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format'),

    body('password')
        .notEmpty().withMessage('Password is required')
];

const verifyOtpValidation = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format'),

    body('otp')
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
        .isNumeric().withMessage('OTP must contain only numbers')
];

const forgotPasswordValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
];

const resetPasswordValidation = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format'),

    body('otp')
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
        .isNumeric().withMessage('OTP must contain only numbers'),

    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain: 1 uppercase, 1 lowercase, 1 number, 1 special character')
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errorMessages
        });
    }

    next();
};

module.exports = {
    signupValidation,
    loginValidation,
    verifyOtpValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    handleValidationErrors
};
