const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendEmail } = require('../config/email');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').trim().notEmpty().withMessage('Phone is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, email, password, phone, role = 'customer' } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Create verification code (6-digit OTP)
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            phone,
            role,
            verificationCode,
            verificationCodeExpire: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        });

        // Send verification email
        let emailSent = true;
        try {
            await sendEmail({
                to: email,
                subject: 'Verify Your Email - Burger Club',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #E31837; text-align: center;">Welcome to Burger Club!</h2>
                        <p>Thank you for registering. Please use the following 6-digit verification code to verify your account:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #E31837; padding: 15px 30px; background: #FFF3F3; border: 2px dashed #E31837; border-radius: 5px; display: inline-block;">${verificationCode}</span>
                        </div>
                        <p style="color: #666; font-size: 14px;">This code will expire in 24 hours.</p>
                    </div>
                `
            });
        } catch (mailError) {
            console.error('Email send failed:', mailError.message);
            emailSent = false;
        }

        res.status(201).json({
            success: true,
            message: emailSent 
                ? 'Registration successful. Please check your email for the verification code.' 
                : 'Registration successful. (Email failed to send, use code: ' + verificationCode + ')',
            token: generateToken(user._id),
            fallbackCode: emailSent ? undefined : verificationCode
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { email, password } = req.body;

        // Check for user
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check if verified
        if (!user.isVerified) {
            return res.status(401).json({ success: false, message: 'Please verify your email first' });
        }

        res.json({
            success: true,
            token: generateToken(user._id),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('orderHistory');
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Forgot password
// @access  Public
router.post('/forgot-password', [
    body('email').isEmail().withMessage('Please provide a valid email')
], async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
        await user.save();

        // Send reset email
        const resetUrl = `${process.env.FRONTEND_URL.replace(/\/$/, '')}?reset=${resetToken}`;
        let emailSent = true;
        try {
            await sendEmail({
                to: user.email,
                subject: 'Password Reset - Burger Club',
                html: `
                    <h1>Password Reset Request</h1>
                    <p>Click the link below to reset your password:</p>
                    <a href="${resetUrl}" style="padding: 10px 20px; background: #E31837; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
                    <p>Or copy this link: ${resetUrl}</p>
                    <p>This link expires in 30 minutes.</p>
                `
            });
        } catch (mailError) {
            console.error('Email send failed:', mailError.message);
            emailSent = false;
        }

        res.json({ 
            success: true, 
            message: emailSent 
                ? 'Password reset email sent' 
                : 'Reset link generated. (Email failed to send, use link: ' + resetUrl + ')',
            fallbackUrl: emailSent ? undefined : resetUrl
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.put('/reset-password/:token', [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token' });
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.json({ success: true, message: 'Password reset successful', token: generateToken(user._id) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/auth/verify-code
// @desc    Verify email with 6-digit OTP code
// @access  Public
router.post('/verify-code', async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ success: false, message: 'Please provide email and verification code' });
        }

        const user = await User.findOne({
            email: email.toLowerCase(),
            verificationCode: code,
            verificationCodeExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
        }

        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpire = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Email verified successfully',
            token: generateToken(user._id),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/auth/resend-code
// @desc    Resend 6-digit OTP verification code
// @access  Public
router.post('/resend-code', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide email' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'Email is already verified' });
        }

        // Generate new 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationCode = verificationCode;
        user.verificationCodeExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        await user.save();

        // Send verification email
        let emailSent = true;
        try {
            await sendEmail({
                to: user.email,
                subject: 'Verify Your Email - Burger Club',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #E31837; text-align: center;">Welcome to Burger Club!</h2>
                        <p>Here is your new 6-digit verification code to verify your account:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #E31837; padding: 15px 30px; background: #FFF3F3; border: 2px dashed #E31837; border-radius: 5px; display: inline-block;">${verificationCode}</span>
                        </div>
                        <p style="color: #666; font-size: 14px;">This code will expire in 24 hours.</p>
                    </div>
                `
            });
        } catch (mailError) {
            console.error('Email send failed:', mailError.message);
            emailSent = false;
        }

        res.json({
            success: true,
            message: emailSent 
                ? 'Verification code resent successfully' 
                : 'Code generated. (Email failed to send, use code: ' + verificationCode + ')',
            fallbackCode: emailSent ? undefined : verificationCode
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/auth/update-profile
// @desc    Update user profile
// @access  Private
router.put('/update-profile', protect, async (req, res) => {
    try {
        const { name, phone, address } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { name, phone, address },
            { new: true, runValidators: true }
        );
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;