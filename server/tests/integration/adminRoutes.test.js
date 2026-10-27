const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Table = require('../../src/models/Table');
const MenuItem = require('../../src/models/MenuItem');
const Category = require('../../src/models/Category');
const Order = require('../../src/models/Order');
const { setupTestDB } = require('../setup');

setupTestDB();

describe('Canonical Admin Routes Verification (/api/v1/admin/*)', () => {
  let adminToken;
  let orderId;
  let categoryId;
  let menuItemId;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('AdminSecret123!', 10);
    await User.create({
      name: 'Manager',
      email: 'manager@cafeflow.com',
      passwordHash,
      role: 'admin'
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager@cafeflow.com', password: 'AdminSecret123!' });
    adminToken = loginRes.body.data.token;

    const table = await Table.create({ tableNumber: 'T-10', qrCodeToken: 'qr_test_canon' });
    const cat = await Category.create({ name: 'Specialty Tea' });
    categoryId = cat._id;

    const item = await MenuItem.create({
      name: 'Earl Grey',
      category: categoryId,
      price: 3.5,
      isAvailable: true
    });
    menuItemId = item._id;

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .send({
        qrCodeToken: table.qrCodeToken,
        items: [{ menuItemId: item._id, quantity: 2 }]
      });

    orderId = orderRes.body.data.order._id;
  });

  test('GET /api/v1/admin/orders returns paginated orders', async () => {
    const res = await request(app)
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pagination).toBeDefined();
  });

  test('PATCH /api/v1/admin/orders/:id/status updates status correctly', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orderStatus: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.data.orderStatus).toBe('confirmed');
  });

  test('PATCH /api/v1/admin/orders/:id/payment updates payment to paid_counter', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentStatus: 'paid_counter' });

    expect(res.status).toBe(200);
    expect(res.body.data.paymentStatus).toBe('paid_counter');
  });

  test('GET /api/v1/admin/tables lists tables for staff', async () => {
    const res = await request(app)
      .get('/api/v1/admin/tables')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.tables.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /api/v1/admin/tables creates table with auto-generated QR code token', async () => {
    const res = await request(app)
      .post('/api/v1/admin/tables')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tableNumber: 'T-99', capacity: 4 });

    expect(res.status).toBe(201);
    expect(res.body.data.table.tableNumber).toBe('T-99');
    expect(res.body.data.table.qrCodeToken).toMatch(/^qr_tab_/);
  });

  test('POST /api/v1/admin/menu creates menu item', async () => {
    const res = await request(app)
      .post('/api/v1/admin/menu')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Jasmine Green Tea',
        category: categoryId,
        price: 3.75
      });

    expect(res.status).toBe(201);
    expect(res.body.data.menuItem.name).toBe('Jasmine Green Tea');
  });

  test('PATCH /api/v1/admin/menu/:id/availability updates item availability', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/menu/${menuItemId}/availability`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isAvailable: false });

    expect(res.status).toBe(200);
    expect(res.body.data.menuItem.isAvailable).toBe(false);
  });
});
