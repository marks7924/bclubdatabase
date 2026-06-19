const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: String,
    avatar: String,
    vehicle: {
        type: { type: String, enum: ['motorcycle', 'car', 'bicycle'] },
        plateNumber: String,
        color: String
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'busy', 'on_break'],
        default: 'offline'
    },
    currentLocation: {
        lat: Number,
        lng: Number,
        updatedAt: Date
    },
    workingHours: {
        start: String,
        end: String
    },
    serviceArea: [{
        name: String,
        coordinates: {
            lat: Number,
            lng: Number
        },
        radius: Number
    }],
    statistics: {
        totalOrders: { type: Number, default: 0 },
        completedOrders: { type: Number, default: 0 },
        cancelledOrders: { type: Number, default: 0 },
        totalEarnings: { type: Number, default: 0 },
        rating: { type: Number, default: 5 },
        ratingCount: { type: Number, default: 0 },
        averageDeliveryTime: { type: Number, default: 0 }
    },
    documents: {
        idCard: String,
        license: String,
        vehicleRegistration: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Delivery', deliverySchema);