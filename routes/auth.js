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
const axios = require('axios'); // <-- Make sure to add this at the top of auth.js

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

        // 1. Extract captchaToken from req.body
        const { name, email, password, phone, role = 'customer', captchaToken } = req.body;

        // 2. Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // 3. Verify CAPTCHA with Google
        if (!captchaToken) {
            return res.status(400).json({ success: false, message: 'Please complete the CAPTCHA' });
        }
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`;
        const captchaResponse = await axios.post(verifyUrl);
        
        if (!captchaResponse.data.success) {
            return res.status(400).json({ success: false, message: 'CAPTCHA verification failed. Please try again.' });
        }

        // 4. Create user (Set isVerified to true by default now!)
        const user = await User.create({
            name,
            email,
            password,
            phone,
            role,
            isVerified: true // <-- Automatically verified now
        });

        // 5. Send success response (Email sending logic completely removed!)
        res.status(201).json({
            success: true,
            message: 'Registration successful!',
            token: generateToken(user._id)
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
        const frontendUrl = process.env.FRONTEND_URL || 'https://bclub-tau.vercel.app';
        const resetUrl = `${frontendUrl.replace(/\/$/, '')}?reset=${resetToken}`;
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
// @route   POST /api/auth/resend-code
// @desc    Resend 6-digit OTP verification code
// @access  Public
        // Send verification email
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
