const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const { protect, authorize } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');

// @route   GET /api/menu
// @desc    Get all menu items
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { category, isAvailable, search } = req.query;
        let query = {};

        if (category) query.category = category;
        if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';
        if (search) {
            query.$or = [
                { 'name.ar': { $regex: search, $options: 'i' } },
                { 'name.en': { $regex: search, $options: 'i' } }
            ];
        }

        const menuItems = await MenuItem.find(query).sort({ category: 1, createdAt: -1 });
        res.json({ success: true, count: menuItems.length, data: menuItems });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/menu/:id
// @desc    Get single menu item
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id);
        if (!menuItem) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }
        res.json({ success: true, data: menuItem });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/menu
// @desc    Create menu item
// @access  Private (Owner, Staff)
router.post('/', protect, authorize('owner', 'staff'), upload.single('image'), async (req, res) => {
    try {
        let imageUrl = req.body.image;

        if (req.file) {
            const result = await uploadToCloudinary(req.file);
            imageUrl = result.secure_url;
        }

        const menuItem = await MenuItem.create({
            ...req.body,
            image: imageUrl
        });

        res.status(201).json({ success: true, data: menuItem });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/menu/:id
// @desc    Update menu item
// @access  Private (Owner, Staff)
router.put('/:id', protect, authorize('owner', 'staff'), upload.single('image'), async (req, res) => {
    try {
        let updateData = { ...req.body, updatedAt: Date.now() };

        if (req.file) {
            const result = await uploadToCloudinary(req.file);
            updateData.image = result.secure_url;
        }

        const menuItem = await MenuItem.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!menuItem) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }

        res.json({ success: true, data: menuItem });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/menu/:id
// @desc    Delete menu item
// @access  Private (Owner only)
router.delete('/:id', protect, authorize('owner'), async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id);
        if (!menuItem) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }

        await menuItem.deleteOne();
        res.json({ success: true, message: 'Menu item deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/menu/:id/availability
// @desc    Toggle item availability
// @access  Private (Owner, Staff)
router.put('/:id/availability', protect, authorize('owner', 'staff'), async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id);
        if (!menuItem) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }

        menuItem.isAvailable = !menuItem.isAvailable;
        await menuItem.save();

        res.json({ success: true, data: menuItem });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;