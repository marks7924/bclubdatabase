const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: true
    },
    variant: {
        type: String,
        enum: ['single', 'double', 'extra'],
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true
    },
    extras: [{
        name: String,
        price: Number
    }],
    notes: String
});

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customerInfo: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        email: String
    },
    items: [orderItemSchema],
    orderType: {
        type: String,
        enum: ['delivery', 'pickup'],
        required: true
    },
    address: {
        street: String,
        building: String,
        floor: String,
        apartment: String,
        landmark: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'ready', 'ontheway', 'delivered', 'cancelled'],
        default: 'pending'
    },
    statusHistory: [{
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    delivery: {
        driver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        estimatedTime: Number,
        actualTime: Number,
        trackingUpdates: [{
            timestamp: Date,
            location: {
                lat: Number,
                lng: Number
            },
            status: String
        }]
    },
    payment: {
        method: {
            type: String,
            enum: ['cash', 'visa', 'fawry', 'wallet'],
            default: 'cash'
        },
        status: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending'
        },
        transactionId: String,
        amount: Number,
        paidAt: Date
    },
    coupon: {
        code: String,
        discount: Number,
        type: {
            type: String,
            enum: ['percentage', 'fixed']
        }
    },
    pricing: {
        subtotal: { type: Number, required: true },
        deliveryFee: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        total: { type: Number, required: true }
    },
    notes: String,
    rating: {
        food: { type: Number, min: 1, max: 5 },
        delivery: { type: Number, min: 1, max: 5 },
        service: { type: Number, min: 1, max: 5 },
        comment: String,
        createdAt: Date
    },
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
    if (!this.orderNumber) {
        const date = new Date();
        const prefix = 'ORD';
        const timestamp = date.getTime().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        this.orderNumber = `${prefix}-${timestamp}-${random}`;
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);