const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/reports/daily
// @desc    Get daily report
// @access  Private (Owner, Staff)
router.get('/daily', protect, authorize('owner', 'staff'), async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const orders = await Order.find({
            createdAt: { $gte: today, $lt: tomorrow }
        });

        const stats = {
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, o) => sum + o.pricing.total, 0),
            averageOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + o.pricing.total, 0) / orders.length : 0,
            byStatus: {
                pending: orders.filter(o => o.status === 'pending').length,
                preparing: orders.filter(o => o.status === 'preparing').length,
                delivered: orders.filter(o => o.status === 'delivered').length,
                cancelled: orders.filter(o => o.status === 'cancelled').length
            },
            byType: {
                delivery: orders.filter(o => o.orderType === 'delivery').length,
                pickup: orders.filter(o => o.orderType === 'pickup').length
            }
        };

        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/reports/weekly
// @desc    Get weekly report
// @access  Private (Owner, Staff)
router.get('/weekly', protect, authorize('owner', 'staff'), async (req, res) => {
    try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const orders = await Order.find({ createdAt: { $gte: weekAgo } });

        const dailyStats = {};
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);

            const dayOrders = orders.filter(o => o.createdAt >= date && o.createdAt < nextDay);
            dailyStats[date.toISOString().split('T')[0]] = {
                orders: dayOrders.length,
                revenue: dayOrders.reduce((sum, o) => sum + o.pricing.total, 0)
            };
        }

        res.json({
            success: true,
            data: {
                totalOrders: orders.length,
                totalRevenue: orders.reduce((sum, o) => sum + o.pricing.total, 0),
                dailyStats
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/reports/monthly
// @desc    Get monthly report
// @access  Private (Owner, Staff)
router.get('/monthly', protect, authorize('owner', 'staff'), async (req, res) => {
    try {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        const orders = await Order.find({ createdAt: { $gte: monthAgo } });

        const itemStats = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                const id = item.menuItem.toString();
                if (!itemStats[id]) itemStats[id] = { count: 0, revenue: 0 };
                itemStats[id].count += item.quantity;
                itemStats[id].revenue += item.price * item.quantity;
            });
        });

        const topItems = await Promise.all(
            Object.entries(itemStats)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 10)
                .map(async ([id, stats]) => {
                    const item = await MenuItem.findById(id);
                    return {
                        name: item ? item.name : 'Unknown',
                        count: stats.count,
                        revenue: stats.revenue
                    };
                })
        );

        res.json({
            success: true,
            data: {
                totalOrders: orders.length,
                totalRevenue: orders.reduce((sum, o) => sum + o.pricing.total, 0),
                topItems
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/reports/top-customers
// @desc    Get top customers
// @access  Private (Owner, Staff)
router.get('/top-customers', protect, authorize('owner', 'staff'), async (req, res) => {
    try {
        const topCustomers = await User.find({ role: 'customer' })
            .sort({ totalSpent: -1 })
            .limit(20)
            .select('name phone totalOrders totalSpent');

        res.json({ success: true, count: topCustomers.length, data: topCustomers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/reports/delivery-performance
// @desc    Get delivery performance
// @access  Private (Owner, Staff)
router.get('/delivery-performance', protect, authorize('owner', 'staff'), async (req, res) => {
    try {
        const Delivery = require('../models/Delivery');
        const drivers = await Delivery.find()
            .populate('user', 'name phone')
            .sort({ 'statistics.totalOrders': -1 });

        res.json({ success: true, count: drivers.length, data: drivers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;