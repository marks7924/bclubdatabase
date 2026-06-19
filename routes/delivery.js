const express = require('express');
const router = express.Router();
const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/delivery
// @desc    Get all delivery drivers
// @access  Private (Owner, Staff)
router.get('/', protect, authorize('owner', 'staff'), async (req, res) => {
    try {
        const { status } = req.query;
        let query = {};
        if (status) query.status = status;

        const drivers = await Delivery.find(query)
            .populate('user', 'name phone email avatar')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: drivers.length, data: drivers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/delivery/available
// @desc    Get available drivers
// @access  Private (Owner, Staff)
router.get('/available', protect, authorize('owner', 'staff'), async (req, res) => {
    try {
        const drivers = await Delivery.find({ status: 'online', isActive: true })
            .populate('user', 'name phone');

        res.json({ success: true, count: drivers.length, data: drivers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/delivery/my-stats
// @desc    Get delivery driver stats
// @access  Private (Delivery)
router.get('/my-stats', protect, authorize('delivery'), async (req, res) => {
    try {
        const delivery = await Delivery.findOne({ user: req.user.id });
        if (!delivery) {
            return res.status(404).json({ success: false, message: 'Delivery profile not found' });
        }

        // Get today's orders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = await Order.countDocuments({
            'delivery.driver': req.user.id,
            createdAt: { $gte: today }
        });

        res.json({
            success: true,
            data: {
                ...delivery.toObject(),
                todayOrders
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/delivery/:id/orders
// @desc    Get orders assigned to driver
// @access  Private (Owner, Staff, Delivery)
router.get('/:id/orders', protect, authorize('owner', 'staff', 'delivery'), async (req, res) => {
    try {
        // Delivery can only see their own orders
        if (req.user.role === 'delivery' && req.params.id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const orders = await Order.find({ 'delivery.driver': req.params.id })
            .populate('customer', 'name phone address')
            .populate('items.menuItem', 'name')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/delivery
// @desc    Create delivery driver
// @access  Private (Owner)
router.post('/', protect, authorize('owner'), async (req, res) => {
    try {
        const { userId, vehicle, workingHours, serviceArea } = req.body;

        const user = await require('../models/User').findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Update user role
        user.role = 'delivery';
        await user.save();

        const delivery = await Delivery.create({
            user: userId,
            name: user.name,
            phone: user.phone,
            email: user.email,
            vehicle,
            workingHours,
            serviceArea
        });

        res.status(201).json({ success: true, data: delivery });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/delivery/:id/status
// @desc    Update driver status
// @access  Private (Delivery)
router.put('/:id/status', protect, authorize('delivery'), async (req, res) => {
    try {
        // Driver can only update their own status
        if (req.params.id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const { status, location } = req.body;
        const updateData = { status };

        if (location) {
            updateData.currentLocation = {
                ...location,
                updatedAt: new Date()
            };
        }

        const delivery = await Delivery.findOneAndUpdate(
            { user: req.params.id },
            updateData,
            { new: true }
        );

        if (!delivery) {
            return res.status(404).json({ success: false, message: 'Delivery profile not found' });
        }

        res.json({ success: true, data: delivery });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/delivery/:id/location
// @desc    Update driver location (for tracking)
// @access  Private (Delivery)
router.put('/:id/location', protect, authorize('delivery'), async (req, res) => {
    try {
        if (req.params.id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const { lat, lng } = req.body;
        const delivery = await Delivery.findOneAndUpdate(
            { user: req.params.id },
            {
                currentLocation: {
                    lat,
                    lng,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        res.json({ success: true, data: delivery });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/delivery/:id
// @desc    Delete delivery driver
// @access  Private (Owner)
router.delete('/:id', protect, authorize('owner'), async (req, res) => {
    try {
        const delivery = await Delivery.findById(req.params.id);
        if (!delivery) {
            return res.status(404).json({ success: false, message: 'Delivery driver not found' });
        }

        // Revert user role to customer
        await require('../models/User').findByIdAndUpdate(delivery.user, { role: 'customer' });

        await delivery.deleteOne();
        res.json({ success: true, message: 'Delivery driver removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;