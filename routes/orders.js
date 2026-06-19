const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/orders
// @desc    Get all orders
// @access  Private (Owner, Staff)
router.get('/', protect, authorize('owner', 'staff'), async (req, res) => {
    try {
        const { status, page = 1, limit = 20, startDate, endDate } = req.query;
        let query = {};

        if (status) query.status = status;
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const orders = await Order.find(query)
            .populate('customer', 'name phone email')
            .populate('items.menuItem', 'name image')
            .populate('delivery.driver', 'name phone')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Order.countDocuments(query);

        res.json({
            success: true,
            count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            data: orders
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/orders/my-orders
// @desc    Get logged in user orders
// @access  Private
router.get('/my-orders', protect, async (req, res) => {
    try {
        const orders = await Order.find({ customer: req.user.id })
            .populate('items.menuItem', 'name image')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('customer', 'name phone email address')
            .populate('items.menuItem', 'name image prices')
            .populate('delivery.driver', 'name phone');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Check if user is authorized to view this order
        if (req.user.role === 'customer' && order.customer._id.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { items, orderType, address, notes, couponCode } = req.body;

        // Calculate pricing
        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
            const menuItem = await MenuItem.findById(item.menuItemId);
            if (!menuItem || !menuItem.isAvailable) {
                return res.status(400).json({
                    success: false,
                    message: `Item ${item.menuItemId} is not available`
                });
            }

            const price = item.variant === 'double' ? menuItem.prices.double : menuItem.prices.single;
            const itemTotal = price * item.quantity;
            subtotal += itemTotal;

            orderItems.push({
                menuItem: menuItem._id,
                variant: item.variant,
                quantity: item.quantity,
                price: price,
                extras: item.extras || [],
                notes: item.notes || ''
            });

            // Increment order count
            menuItem.orderCount += item.quantity;
            await menuItem.save();
        }

        // Calculate delivery fee
        const deliveryFee = orderType === 'delivery' ? 15 : 0;

        // Apply coupon if provided
        let discount = 0;
        if (couponCode) {
            const Coupon = require('../models/Coupon');
            const coupon = await Coupon.findOne({
                code: couponCode.toUpperCase(),
                isActive: true,
                validFrom: { $lte: new Date() },
                validUntil: { $gte: new Date() }
            });

            if (coupon && coupon.usageCount < coupon.usageLimit) {
                if (coupon.discountType === 'percentage') {
                    discount = (subtotal * coupon.discountValue) / 100;
                    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
                } else {
                    discount = coupon.discountValue;
                }
                coupon.usageCount++;
                coupon.usedBy.push({ user: req.user.id });
                await coupon.save();
            }
        }

        const total = subtotal + deliveryFee - discount;

        // Create order
        const order = await Order.create({
            customer: req.user.id,
            customerInfo: {
                name: req.user.name,
                phone: req.user.phone,
                email: req.user.email
            },
            items: orderItems,
            orderType,
            address: orderType === 'delivery' ? address : undefined,
            notes,
            pricing: {
                subtotal,
                deliveryFee,
                discount,
                tax: 0,
                total
            },
            payment: {
                method: 'cash',
                status: 'pending',
                amount: total
            },
            statusHistory: [{
                status: 'pending',
                note: 'Order created'
            }]
        });

        // Update user stats
        await User.findByIdAndUpdate(req.user.id, {
            $inc: { totalOrders: 1, totalSpent: total },
            $push: { orderHistory: order._id }
        });

        res.status(201).json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private (Owner, Staff, Delivery)
router.put('/:id/status', protect, authorize('owner', 'staff', 'delivery'), async (req, res) => {
    try {
        const { status, note } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Delivery can only update to 'ontheway' and 'delivered'
        if (req.user.role === 'delivery' && !['ontheway', 'delivered'].includes(status)) {
            return res.status(403).json({ success: false, message: 'Not authorized for this status' });
        }

        order.status = status;
        order.statusHistory.push({
            status,
            note: note || `Status updated to ${status}`,
            updatedBy: req.user.id
        });

        // If delivered, update delivery stats
        if (status === 'delivered' && order.delivery.driver) {
            const Delivery = require('../models/Delivery');
            await Delivery.findOneAndUpdate(
                { user: order.delivery.driver },
                {
                    $inc: {
                        'statistics.completedOrders': 1,
                        'statistics.totalEarnings': order.pricing.deliveryFee
                    }
                }
            );
        }

        await order.save();

        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/orders/:id/assign-delivery
// @desc    Assign delivery driver
// @access  Private (Owner, Staff)
router.put('/:id/assign-delivery', protect, authorize('owner', 'staff'), async (req, res) => {
    try {
        const { driverId } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.delivery.driver = driverId;
        order.status = 'ontheway';
        order.statusHistory.push({
            status: 'ontheway',
            note: 'Delivery assigned',
            updatedBy: req.user.id
        });

        await order.save();

        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/orders/:id/rating
// @desc    Rate order
// @access  Private (Customer)
router.put('/:id/rating', protect, authorize('customer'), async (req, res) => {
    try {
        const { food, delivery, service, comment } = req.body;
        const order = await Order.findOne({
            _id: req.params.id,
            customer: req.user.id,
            status: 'delivered'
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found or not delivered' });
        }

        if (order.rating && order.rating.createdAt) {
            return res.status(400).json({ success: false, message: 'Order already rated' });
        }

        order.rating = {
            food,
            delivery,
            service,
            comment,
            createdAt: new Date()
        };

        await order.save();

        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/orders/:id
// @desc    Delete order
// @access  Private (Owner only)
router.delete('/:id', protect, authorize('owner'), async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        await order.deleteOne();
        res.json({ success: true, message: 'Order deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;