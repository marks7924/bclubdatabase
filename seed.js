const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const User = require('./models/User');
const MenuItem = require('./models/MenuItem');
const Branch = require('./models/Branch');

const connectDB = require('./config/database');
connectDB();

const menuItems = [
    {
        name: { ar: 'كلاسيكو', en: 'Classico' },
        description: { ar: 'قطعة برجر لحم مشوية على الفحم مع جبنة موزاريلا، كاتشب، مايونيز، خس، طماطم، بصل مخلل', en: 'Grilled beef patty with mozzarella, ketchup, mayo, lettuce, tomato, pickles' },
        category: 'beef',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop',
        prices: { single: 145, double: 195 },
        isAvailable: true
    },
    {
        name: { ar: 'أوجي كلوب', en: 'OG Club' },
        description: { ar: 'قطعة برجر لحم مشوية على الفحم مع جبنة موزاريلا، كاتشب، مايونيز، خس، طماطم، بصل، بيكون، موتزاريلا ستيكس', en: 'Grilled beef with mozzarella, ketchup, mayo, lettuce, tomato, onion, bacon, mozzarella sticks' },
        category: 'beef',
        image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=400&fit=crop',
        prices: { single: 150, double: 200 },
        isAvailable: true
    },
    {
        name: { ar: 'باربيكيو بوس', en: 'BBQ Boss' },
        description: { ar: 'قطعة برجر لحم مشوية على الفحم مع جبنة موزاريلا، كاتشب، مايونيز، خس، طماطم، بصل، صوص باربيكيو', en: 'Grilled beef with mozzarella, BBQ sauce, lettuce, tomato, onion' },
        category: 'beef',
        image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=400&fit=crop',
        prices: { single: 160, double: 210 },
        isAvailable: true
    },
    {
        name: { ar: 'تشيلي بان', en: 'Chili Bun' },
        description: { ar: 'قطعة برجر لحم مشوية على الفحم مع جبنة موزاريلا، كاتشب، مايونيز، خس، طماطم، بصل، صوص تشيلي حار', en: 'Grilled beef with mozzarella, chili sauce, lettuce, tomato, onion' },
        category: 'beef',
        image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=400&fit=crop',
        prices: { single: 165, double: 215 },
        isAvailable: true
    },
    {
        name: { ar: 'ستاك اتاك', en: 'Stack Attack' },
        description: { ar: 'قطعة برجر لحم مشوية على الفحم مع جبنة موزاريلا، كاتشب، مايونيز، خس، طماطم، بصل، بيكون، موتزاريلا ستيكس', en: 'Double stacked beef with mozzarella, bacon, mozzarella sticks' },
        category: 'beef',
        image: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=400&h=400&fit=crop',
        prices: { single: 175, double: 225 },
        isAvailable: true
    },
    {
        name: { ar: 'ميلت بوس', en: 'Melt Boss' },
        description: { ar: 'قطعة برجر لحم مشوية على الفحم مع جبنة موزاريلا، كاتشب، مايونيز، خس، طماطم، بصل، موتزاريلا ستيكس', en: 'Grilled beef with melted mozzarella, mozzarella sticks' },
        category: 'beef',
        image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400&h=400&fit=crop',
        prices: { single: 165, double: 215 },
        isAvailable: true
    },
    {
        name: { ar: 'كلاسيكو', en: 'Classico' },
        description: { ar: 'قطعة فراخ مشوية أو مقلية مع مايونيز، كاتشب، خس، طماطم', en: 'Grilled or fried chicken with mayo, ketchup, lettuce, tomato' },
        category: 'chicken',
        image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&h=400&fit=crop',
        prices: { single: 145, double: 195 },
        isAvailable: true
    },
    {
        name: { ar: 'أوجي تشيك', en: 'OG Chick' },
        description: { ar: 'قطعة فراخ مشوية أو مقلية مع مايونيز، كاتشب، خس، طماطم، بصل، بيكون', en: 'Grilled or fried chicken with mayo, ketchup, lettuce, tomato, onion, bacon' },
        category: 'chicken',
        image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=400&fit=crop',
        prices: { single: 150, double: 200 },
        isAvailable: true
    },
    {
        name: { ar: 'تشيكن باربيكيو', en: "Chickin' BBQ" },
        description: { ar: 'قطعة فراخ مشوية أو مقلية مع صوص باربيكيو، مايونيز، خس، طماطم، بصل', en: 'Grilled or fried chicken with BBQ sauce, mayo, lettuce, tomato, onion' },
        category: 'chicken',
        image: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&h=400&fit=crop',
        prices: { single: 160, double: 210 },
        isAvailable: true
    },
    {
        name: { ar: 'تشيكن تركي', en: "Chickin' Turkey" },
        description: { ar: 'قطعة فراخ تركية مشوية أو مقلية مع مايونيز، كاتشب، خس، طماطم، بصل، جبنة شيدر', en: 'Turkey chicken with mayo, ketchup, lettuce, tomato, onion, cheddar' },
        category: 'chicken',
        image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=400&fit=crop',
        prices: { single: 165, double: 215 },
        isAvailable: true
    },
    {
        name: { ar: 'تشيزي بوس', en: 'Cheesy Boss' },
        description: { ar: 'قطعة فراخ مشوية أو مقلية مع جبنة شيدر، مايونيز، كاتشب، خس، طماطم، بصل، موتزاريلا ستيكس', en: 'Chicken with cheddar, mozzarella sticks, mayo, ketchup, lettuce' },
        category: 'chicken',
        image: 'https://images.unsplash.com/photo-1513185158878-8d8c2a2a3da3?w=400&h=400&fit=crop',
        prices: { single: 165, double: 215 },
        isAvailable: true
    },
    {
        name: { ar: 'ستاك تشيك', en: 'Stack Chick' },
        description: { ar: 'قطعة فراخ مشوية أو مقلية مع مايونيز، كاتشب، خس، طماطم، بصل، بيكون، موتزاريلا ستيكس', en: 'Double chicken with bacon, mozzarella sticks' },
        category: 'chicken',
        image: 'https://images.unsplash.com/photo-1615294832076-77a2a6d6d924?w=400&h=400&fit=crop',
        prices: { single: 175, double: 225 },
        isAvailable: true
    },
    {
        name: { ar: 'سموكي فاير', en: 'Smokey Fire' },
        description: { ar: 'قطعة برجر لحم مشوية على الفحم مع صوص سموكي حار، مايونيز، خس، طماطم، بصل', en: 'Grilled beef with smoky hot sauce, mayo, lettuce, tomato, onion' },
        category: 'new',
        image: 'https://images.unsplash.com/photo-1550317138-10000687a72b?w=400&h=400&fit=crop',
        prices: { single: 165, double: 215 },
        isAvailable: true,
        isNew: true
    },
    {
        name: { ar: 'كورن اند موستارد', en: "Corn N' Mustard" },
        description: { ar: 'قطعة برجر لحم مشوية على الفحم مع ذرة، صوص موستارد، مايونيز، خس، طماطم، بصل', en: 'Grilled beef with corn, mustard sauce, mayo, lettuce, tomato' },
        category: 'new',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop',
        prices: { single: 165, double: 215 },
        isAvailable: true,
        isNew: true
    },
    {
        name: { ar: 'ماتش اند رانش', en: "Much N' Ranch" },
        description: { ar: 'قطعة برجر لحم مشوية على الفحم مع صوص رانش، مايونيز، خس، طماطم، بصل، بيكون', en: 'Grilled beef with ranch sauce, mayo, lettuce, tomato, onion, bacon' },
        category: 'new',
        image: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=400&h=400&fit=crop',
        prices: { single: 175, double: 225 },
        isAvailable: true,
        isNew: true
    },
    {
        name: { ar: 'هوت سموكي', en: 'Hot Smokey' },
        description: { ar: 'قطعة فراخ مشوية أو مقلية مع صوص سموكي حار، مايونيز، خس، طماطم، بصل', en: 'Chicken with smoky hot sauce, mayo, lettuce, tomato, onion' },
        category: 'new',
        image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&h=400&fit=crop',
        prices: { single: 165, double: 215 },
        isAvailable: true,
        isNew: true
    },
    {
        name: { ar: 'تشيكن موستارد', en: "Chickin' Mustard" },
        description: { ar: 'قطعة فراخ مشوية أو مقلية مع صوص موستارد، مايونيز، خس، طماطم، بصل', en: 'Chicken with mustard sauce, mayo, lettuce, tomato, onion' },
        category: 'new',
        image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=400&fit=crop',
        prices: { single: 165, double: 215 },
        isAvailable: true,
        isNew: true
    },
    {
        name: { ar: 'تشيكن رانش', en: "Chickin' Ranch" },
        description: { ar: 'قطعة فراخ مشوية أو مقلية مع صوص رانش، مايونيز، خس، طماطم، بصل، بيكون', en: 'Chicken with ranch sauce, mayo, lettuce, tomato, onion, bacon' },
        category: 'new',
        image: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&h=400&fit=crop',
        prices: { single: 175, double: 225 },
        isAvailable: true,
        isNew: true
    },
    {
        name: { ar: 'جرل اند رول', en: "Grill N' Roll" },
        description: { ar: 'راب لحم مشوي على الفحم مع خس، طماطم، بصل، مايونيز، كاتشب', en: 'Grilled beef wrap with lettuce, tomato, onion, mayo, ketchup' },
        category: 'wraps',
        image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=400&fit=crop',
        prices: { single: 145 },
        isAvailable: true
    },
    {
        name: { ar: 'تشيك اند رول', en: "Chick N' Roll" },
        description: { ar: 'راب فراخ مشوية أو مقلية مع خس، طماطم، بصل، مايونيز، كاتشب', en: 'Chicken wrap with lettuce, tomato, onion, mayo, ketchup' },
        category: 'wraps',
        image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=400&fit=crop',
        prices: { single: 145 },
        isAvailable: true
    },
    {
        name: { ar: 'جونيور كلوب ميل', en: 'Junior Club Meal' },
        description: { ar: 'قطعة برجر لحم مشوية صغيرة مع خس، طماطم، بصل، مايونيز، كاتشب، بطاطس، كولا', en: 'Junior beef burger with lettuce, tomato, onion, fries, cola' },
        category: 'wraps',
        image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=400&fit=crop',
        prices: { single: 110, double: 135 },
        isAvailable: true
    }
];

const seedDB = async () => {
    try {
        // Clear existing data
        await MenuItem.deleteMany();
        await User.deleteMany();
        await Branch.deleteMany();

        // Create admin user
        const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
        const admin = await User.create({
            name: 'Admin',
            email: process.env.ADMIN_EMAIL || 'admin@burgerclub.com',
            password: adminPassword,
            phone: '+201553355414',
            role: 'owner',
            isVerified: true
        });
        console.log('✅ Admin user created');

        // Create developer user
        const devPassword = await bcrypt.hash('dev123', 12);
        const developer = await User.create({
            name: 'Developer',
            email: 'dev@burgerclub.com',
            password: devPassword,
            phone: '+201000000000',
            role: 'developer',
            isVerified: true
        });
        console.log('✅ Developer user created');

        // Create branch
        const branch = await Branch.create({
            name: { ar: 'فرع شبرا', en: 'Shubra Branch' },
            address: {
                street: '242 شبرا، ميدان الخلفاوي',
                city: 'القاهرة',
                governorate: 'القاهرة',
                coordinates: { lat: 30.0626, lng: 31.2497 }
            },
            phone: '+201553355414',
            email: 'shubra@burgerclub.com',
            workingHours: {
                open: '12:00',
                close: '02:00',
                days: ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday']
            },
            serviceAreas: [{
                name: 'شبرا',
                coordinates: { lat: 30.0626, lng: 31.2497 },
                radius: 5000,
                deliveryFee: 15
            }]
        });
        console.log('✅ Branch created');

        // Create menu items
        await MenuItem.insertMany(menuItems);
        console.log('✅ Menu items created');

        console.log('🎉 Database seeded successfully!');
        process.exit();
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedDB();