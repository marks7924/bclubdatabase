const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: true
    },
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 0
    },
    minStock: {
        type: Number,
        default: 10
    },
    unit: {
        type: String,
        enum: ['piece', 'kg', 'gram', 'liter', 'ml', 'box', 'pack'],
        default: 'piece'
    },
    supplier: {
        name: String,
        phone: String,
        email: String
    },
    lastRestocked: {
        type: Date,
        default: Date.now
    },
    restockHistory: [{
        quantity: Number,
        cost: Number,
        date: { type: Date, default: Date.now },
        supplier: String
    }],
    isActive: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Inventory', inventorySchema);