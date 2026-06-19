const mongoose = require('mongoose');

const siteAssetSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    value: {
        type: String,
        required: true
    },
    description: String,
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SiteAsset', siteAssetSchema);
