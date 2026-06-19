const express = require('express');
const router = express.Router();
const axios = require('axios');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');

// Paymob Integration
const PAYMOB_BASE_URL = 'https://accept.paymob.com/api';

// @route   POST /api/payment/paymob-intent
// @desc    Create Paymob payment intent
// @access  Private
router.post('/paymob-intent', protect, async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Step 1: Authentication
        const authResponse = await axios.post(`${PAYMOB_BASE_URL}/auth/tokens`, {
            api_key: process.env.PAYMOB_API_KEY
        });
        const token = authResponse.data.token;

        // Step 2: Order Registration
        const orderResponse = await axios.post(`${PAYMOB_BASE_URL}/ecommerce/orders`, {
            auth_token: token,
            delivery_needed: false,
            amount_cents: order.pricing.total * 100,
            currency: 'EGP',
            items: order.items.map(item => ({
                name: item.menuItem.toString(),
                amount_cents: item.price * 100,
                quantity: item.quantity
            }))
        });
        const paymobOrderId = orderResponse.data.id;

        // Step 3: Payment Key
        const paymentKeyResponse = await axios.post(`${PAYMOB_BASE_URL}/acceptance/payment_keys`, {
            auth_token: token,
            amount_cents: order.pricing.total * 100,
            expiration: 3600,
            order_id: paymobOrderId,
            billing_data: {
                apartment: 'NA',
                email: req.user.email || 'customer@burgerclub.com',
                floor: 'NA',
                first_name: req.user.name.split(' ')[0] || 'Customer',
                street: order.address?.street || 'NA',
                building: 'NA',
                phone_number: order.customerInfo.phone,
                shipping_method: 'PKG',
                postal_code: 'NA',
                city: order.address?.city || 'Cairo',
                country: 'EG',
                last_name: req.user.name.split(' ')[1] || 'NA',
                state: 'Cairo'
            },
            currency: 'EGP',
            integration_id: process.env.PAYMOB_INTEGRATION_ID
        });

        res.json({
            success: true,
            data: {
                paymentToken: paymentKeyResponse.data.token,
                iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKeyResponse.data.token}`
            }
        });
    } catch (error) {
        console.error('Paymob error:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Payment initialization failed' });
    }
});

// @route   POST /api/payment/paymob-callback
// @desc    Paymob callback
// @access  Public
router.post('/paymob-callback', async (req, res) => {
    try {
        const { order, success, id } = req.body;

        if (success) {
            await Order.findOneAndUpdate(
                { orderNumber: order },
                {
                    'payment.status': 'paid',
                    'payment.transactionId': id,
                    'payment.paidAt': new Date()
                }
            );
        }

        res.send('OK');
    } catch (error) {
        console.error('Paymob callback error:', error);
        res.send('OK');
    }
});

// Fawry Integration (placeholder)
router.post('/fawry-intent', protect, async (req, res) => {
    res.json({ success: false, message: 'Fawry integration coming soon' });
});

module.exports = router;