const express = require('express');
const router = express.Router();
const SiteAsset = require('../models/SiteAsset');
const { protect, authorize } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');

// Default assets for bootstrapping
const defaultAssets = {
    logo: 'images/4_Delicious_fast_food_burger_hamburger.png',
    hero_bg: 'images/10_Floating_burger_transparent_background.png',
    discount_banner: 'images/8_Juicy_Burgers_With_A_Transparent.png',
    site_title_ar: 'برجر كلوب - شبرا الخلفاوي',
    site_title_en: 'Burger Club - Shubra El Khalafawi'
};

// @route   GET /api/settings
// @desc    Get all website assets/settings
// @access  Public
router.get('/', async (req, res) => {
    try {
        const assets = await SiteAsset.find({});
        const settings = { ...defaultAssets };

        assets.forEach(asset => {
            settings[asset.key] = asset.value;
        });

        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/settings
// @desc    Update text settings
// @access  Private (Owner, Developer)
router.put('/', protect, authorize('owner', 'developer'), async (req, res) => {
    try {
        const { key, value } = req.body;
        if (!key || !value) {
            return res.status(400).json({ success: false, message: 'Please provide a key and value' });
        }

        let asset = await SiteAsset.findOne({ key });
        if (asset) {
            asset.value = value;
            asset.updatedAt = Date.now();
            await asset.save();
        } else {
            asset = await SiteAsset.create({ key, value });
        }

        res.json({ success: true, message: 'Setting updated successfully', data: asset });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/settings/upload
// @desc    Upload general site image (logo, hero_bg, etc.)
// @access  Private (Owner, Developer)
router.post('/upload', protect, authorize('owner', 'developer'), upload.single('image'), async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) {
            return res.status(400).json({ success: false, message: 'Please specify the asset key' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an image file' });
        }

        // Upload to Cloudinary
        const result = await uploadToCloudinary(req.file);
        const imageUrl = result.secure_url;

        // Save or update in database
        let asset = await SiteAsset.findOne({ key });
        if (asset) {
            asset.value = imageUrl;
            asset.updatedAt = Date.now();
            await asset.save();
        } else {
            asset = await SiteAsset.create({ key, value: imageUrl });
        }

        res.json({ success: true, message: 'Asset uploaded and updated successfully', url: imageUrl, data: asset });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
