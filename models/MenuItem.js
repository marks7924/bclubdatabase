const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    name: {
        ar: { type: String, required: true },
        en: { type: String, required: true }
    },
    description: {
        ar: { type: String, required: true },
        en: { type: String, required: true }
    },
    category: {
        type: String,
        enum: ['beef', 'chicken', 'new', 'wraps', 'extras', 'drinks'],
        required: true
    },
    image: {
        type: String,
        required: true
    },
    prices: {
        single: { type: Number, default: null },
        double: { type: Number, default: null }
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    isNew: {
        type: Boolean,
        default: false
    },
    isPopular: {
        type: Boolean,
        default: false
    },
    ingredients: [{
        type: String
    }],
    nutritionalInfo: {
        calories: Number,
        protein: Number,
        carbs: Number,
        fat: Number
    },
    orderCount: {
        type: Number,
        default: 0
    },
    rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    suppressReservedKeysWarning: true
});

module.exports = mongoose.model('MenuItem', menuItemSchema);