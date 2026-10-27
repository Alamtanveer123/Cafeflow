const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Category = require('../../src/models/Category');
const MenuItem = require('../../src/models/MenuItem');
const { setupTestDB } = require('../setup');

setupTestDB();

describe('Menu & Category Endpoints', () => {
  let adminToken;
  let categoryId;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('AdminSecret123!', 10);
    const admin = await User.create({
      name: 'Manager',
      email: 'manager@cafeflow.com',
      passwordHash,
      role: 'admin'
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager@cafeflow.com', password: 'AdminSecret123!' });
    adminToken = loginRes.body.data.token;

    const cat = await Category.create({
      name: 'Beverages',
      description: 'Hot and cold artisanal drinks'
    });
    categoryId = cat._id;

    await MenuItem.create({
      name: 'Espresso',
      category: categoryId,
      price: 3.5,
      isAvailable: true
    });

    await MenuItem.create({
      name: 'Cold Brew',
      category: categoryId,
      price: 4.5,
      isAvailable: false
    });
  });

  test('GET /api/v1/categories returns list of categories', async () => {
    const res = await request(app).get('/api/v1/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.categories.length).toBe(1);
    expect(res.body.data.categories[0].name).toBe('Beverages');
  });

  test('GET /api/v1/menu defaults to available items only for customers', async () => {
    const res = await request(app).get('/api/v1/menu');
    expect(res.status).toBe(200);
    expect(res.body.data.menuItems.length).toBe(1);
    expect(res.body.data.menuItems[0].name).toBe('Espresso');
  });

  test('POST /api/v1/menu/admin creates menu item with admin auth', async () => {
    const res = await request(app)
      .post('/api/v1/menu/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Flat White',
        category: categoryId,
        price: 4.25,
        dietaryFlags: ['vegetarian']
      });

    expect(res.status).toBe(201);
    expect(res.body.data.menuItem.name).toBe('Flat White');
    expect(res.body.data.menuItem.price).toBe(4.25);
  });

  test('PATCH /api/v1/menu/admin/:id/availability updates stock status', async () => {
    const item = await MenuItem.findOne({ name: 'Espresso' });
    const res = await request(app)
      .patch(`/api/v1/menu/admin/${item._id}/availability`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isAvailable: false });

    expect(res.status).toBe(200);
    expect(res.body.data.menuItem.isAvailable).toBe(false);
  });
});
