const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/coupons
// @desc    Get all coupons
// @access  Private (Owner, Staff)
router.get('/', protect, authorize('owner', 'staff'), async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json({ success: true, count: coupons.length, data: coupons });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/coupons/validate/:code
// @desc    Validate coupon
// @access  Public
router.get('/validate/:code', async (req, res) => {
    try {
        const coupon = await Coupon.findOne({
            code: req.params.code.toUpperCase(),
            isActive: true,
            validFrom: { $lte: new Date() },
            validUntil: { $gte: new Date() }
        });

        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Invalid or expired coupon' });
        }

        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
        }

        res.json({ success: true, data: coupon });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/coupons
// @desc    Create coupon
// @access  Private (Owner)
router.post('/', protect, authorize('owner'), async (req, res) => {
    try {
        const coupon = await Coupon.create({
            ...req.body,
            createdBy: req.user.id
        });
        res.status(201).json({ success: true, data: coupon });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/coupons/:id
// @desc    Update coupon
// @access  Private (Owner)
router.put('/:id', protect, authorize('owner'), async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }
        res.json({ success: true, data: coupon });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/coupons/:id
// @desc    Delete coupon
// @access  Private (Owner)
router.delete('/:id', protect, authorize('owner'), async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }
        await coupon.deleteOne();
        res.json({ success: true, message: 'Coupon deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;