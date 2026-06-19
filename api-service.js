// API Service - Connect to backend
const API_BASE_URL = 'http://localhost:5000/api'; // Change to your deployed API URL

const api = {
    // Auth
    async login(email, password) {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return res.json();
    },

    async register(userData) {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        return res.json();
    },

    async getMe(token) {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.json();
    },

    // Menu
    async getMenu(category) {
        const url = category ? `${API_BASE_URL}/menu?category=${category}` : `${API_BASE_URL}/menu`;
        const res = await fetch(url);
        return res.json();
    },

    // Orders
    async createOrder(orderData, token) {
        const res = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });
        return res.json();
    },

    async getMyOrders(token) {
        const res = await fetch(`${API_BASE_URL}/orders/my-orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.json();
    },

    // Coupons
    async validateCoupon(code) {
        const res = await fetch(`${API_BASE_URL}/coupons/validate/${code}`);
        return res.json();
    },

    // Payment
    async createPaymentIntent(orderId, token) {
        const res = await fetch(`${API_BASE_URL}/payment/paymob-intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ orderId })
        });
        return res.json();
    }
};

// Usage example:
// const menu = await api.getMenu('beef');
// const order = await api.createOrder({ items: [...], orderType: 'delivery' }, token);
