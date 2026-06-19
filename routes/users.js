const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/users
// @desc    Get all users list
// @access  Private (Owner, Developer)
router.get('/', protect, authorize('owner', 'developer'), async (req, res) => {
    try {
        const users = await User.find({}).sort({ createdAt: -1 });
        res.json({ success: true, count: users.length, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/users/:id/role
// @desc    Update user role
// @access  Private (Owner, Developer)
router.put('/:id/role', protect, authorize('owner', 'developer'), async (req, res) => {
    try {
        const { role } = req.body;
        const allowedRoles = ['owner', 'staff', 'delivery', 'customer', 'developer'];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        // Prevent developers/owners from changing their own role to something else
        if (req.user.id === req.params.id && req.user.role !== role) {
            return res.status(400).json({ success: false, message: 'You cannot change your own role' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.role = role;
        await user.save();

        res.json({ success: true, message: 'User role updated successfully', data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
