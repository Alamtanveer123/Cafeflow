const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const Table = require('../models/Table');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');

const seedInitialData = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('[CafeFlow Seeder] Connected to MongoDB');

    // 1. Admin & Staff accounts
    const existingAdmin = await User.findOne({ email: 'admin@cafeflow.com' });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash('Admin@123456', 10);
      await User.create({
        name: 'Cafe Manager',
        email: 'admin@cafeflow.com',
        passwordHash,
        role: 'admin'
      });
      console.log('[CafeFlow Seeder] Created default admin: admin@cafeflow.com / Admin@123456');
    }

    // 2. Categories
    const coffeeCat = await Category.findOneAndUpdate(
      { name: 'Artisan Coffee' },
      { name: 'Artisan Coffee', description: 'Freshly roasted speciality beans', displayOrder: 1 },
      { upsert: true, new: true }
    );

    const bakeryCat = await Category.findOneAndUpdate(
      { name: 'Bakery & Pastries' },
      { name: 'Bakery & Pastries', description: 'Baked fresh daily in-house', displayOrder: 2 },
      { upsert: true, new: true }
    );

    // 3. Menu Items
    const items = [
      {
        name: 'Oat Milk Cappuccino',
        description: 'Double espresso with silky steamed oat milk and cocoa dusting',
        category: coffeeCat._id,
        price: 4.5,
        isAvailable: true,
        dietaryFlags: ['vegan', 'dairy-free'],
        displayOrder: 1
      },
      {
        name: 'Iced Vanilla Cold Brew',
        description: 'Slow-steeped single-origin coffee over ice with pure Madagascar vanilla',
        category: coffeeCat._id,
        price: 4.85,
        isAvailable: true,
        dietaryFlags: ['vegetarian'],
        displayOrder: 2
      },
      {
        name: 'Butter Croissant',
        description: 'Flaky 27-layer French style all-butter croissant',
        category: bakeryCat._id,
        price: 3.5,
        isAvailable: true,
        dietaryFlags: ['vegetarian'],
        displayOrder: 1
      },
      {
        name: 'Matcha Almond Tart',
        description: 'Ceremonial grade green tea custard in an almond crust',
        category: bakeryCat._id,
        price: 5.25,
        isAvailable: true,
        dietaryFlags: ['vegetarian'],
        displayOrder: 2
      }
    ];

    for (const item of items) {
      await MenuItem.findOneAndUpdate({ name: item.name }, item, { upsert: true });
    }
    console.log('[CafeFlow Seeder] Seeded sample menu items');

    // 4. Sample Cafe Tables with QR Tokens
    const tables = [
      { tableNumber: '1', qrCodeToken: 'qr_table_1_cafeflow', capacity: 2 },
      { tableNumber: '2', qrCodeToken: 'qr_table_2_cafeflow', capacity: 4 },
      { tableNumber: '3', qrCodeToken: 'qr_table_3_cafeflow', capacity: 2 },
      { tableNumber: '4', qrCodeToken: 'qr_table_4_cafeflow', capacity: 6 }
    ];

    for (const t of tables) {
      await Table.findOneAndUpdate({ tableNumber: t.tableNumber }, t, { upsert: true });
    }
    console.log('[CafeFlow Seeder] Seeded 4 sample tables with persistent QR tokens');

    console.log('[CafeFlow Seeder] Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[CafeFlow Seeder Error]:', error);
    process.exit(1);
  }
};

seedInitialData();
