const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
    name: {
        ar: { type: String, required: true },
        en: { type: String, required: true }
    },
    address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        governorate: { type: String, required: true },
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    phone: {
        type: String,
        required: true
    },
    email: String,
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    workingHours: {
        open: { type: String, default: '12:00' },
        close: { type: String, default: '02:00' },
        days: [{
            type: String,
            enum: ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        }]
    },
    isActive: {
        type: Boolean,
        default: true
    },
    serviceAreas: [{
        name: String,
        coordinates: {
            lat: Number,
            lng: Number
        },
        radius: Number,
        deliveryFee: Number
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Branch', branchSchema);