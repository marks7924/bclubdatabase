const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const User = require('./models/User');
const connectDB = require('./config/database');

const testUsers = [
    {
        name: 'Admin Owner',
        email: process.env.ADMIN_EMAIL || 'admin@burgerclub.com',
        password: (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 6) ? process.env.ADMIN_PASSWORD : 'ch1122',
        phone: '+201553355414',
        role: 'owner',
        isVerified: true
    },
    {
        name: 'Dev Account',
        email: 'dev@burgerclub.com',
        password: 'dev123',
        phone: '+201000000000',
        role: 'developer',
        isVerified: true
    },
    {
        name: 'Staff Account',
        email: 'staff@burgerclub.com',
        password: 'staff123',
        phone: '+201111111111',
        role: 'staff',
        isVerified: true
    },
    {
        name: 'Delivery Account',
        email: 'delivery@burgerclub.com',
        password: 'delivery123',
        phone: '+201222222222',
        role: 'delivery',
        isVerified: true
    },
    {
        name: 'Customer Account',
        email: 'customer@burgerclub.com',
        password: 'customer123',
        phone: '+201333333333',
        role: 'customer',
        isVerified: true
    }
];

const seedTestUsers = async () => {
    try {
        await connectDB();
        console.log('Connected to Database.');

        for (const userData of testUsers) {
            const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
            if (existingUser) {
                // Update role and verification status to make sure it matches
                existingUser.role = userData.role;
                existingUser.isVerified = userData.isVerified;
                existingUser.phone = userData.phone;
                existingUser.name = userData.name;
                // Rehash password
                existingUser.password = userData.password;
                await existingUser.save();
                console.log(`Updated existing user: ${userData.email} (${userData.role})`);
            } else {
                await User.create(userData);
                console.log(`Created new test user: ${userData.email} (${userData.role})`);
            }
        }

        console.log('✅ All test accounts are set up and verified!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating test accounts:', error);
        process.exit(1);
    }
};

seedTestUsers();
