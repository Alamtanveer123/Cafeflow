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

describe('Order Lifecycle, Tracking Security & Payment Status', () => {
  let adminToken;
  let orderId;
  let trackingToken;

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

    const table = await Table.create({ tableNumber: 'T-01', qrCodeToken: 'qr_test_abc' });
    const cat = await Category.create({ name: 'Coffee' });
    const item = await MenuItem.create({ name: 'Americano', category: cat._id, price: 3.0 });

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .send({
        qrCodeToken: table.qrCodeToken,
        items: [{ menuItemId: item._id, quantity: 1 }]
      });

    orderId = orderRes.body.data.order._id;
    trackingToken = orderRes.body.data.customerTrackingToken;
  });

  test('GET /api/v1/orders/:id/track succeeds with valid customer token', async () => {
    const res = await request(app)
      .get(`/api/v1/orders/${orderId}/track?token=${trackingToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.order.orderStatus).toBe('placed');
  });

  test('GET /api/v1/orders/:id/track rejects unauthorized or forged token with 403', async () => {
    const res = await request(app)
      .get(`/api/v1/orders/${orderId}/track?token=forged_token_1234567890`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('PATCH /api/v1/orders/admin/orders/:id/status allows valid transitions: placed -> confirmed -> preparing -> ready -> completed', async () => {
    // 1. placed -> confirmed
    const step1 = await request(app)
      .patch(`/api/v1/orders/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orderStatus: 'confirmed' });
    expect(step1.status).toBe(200);
    expect(step1.body.data.orderStatus).toBe('confirmed');

    // 2. confirmed -> preparing
    const step2 = await request(app)
      .patch(`/api/v1/orders/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orderStatus: 'preparing' });
    expect(step2.status).toBe(200);
    expect(step2.body.data.orderStatus).toBe('preparing');

    // 3. preparing -> ready
    const step3 = await request(app)
      .patch(`/api/v1/orders/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orderStatus: 'ready' });
    expect(step3.status).toBe(200);
    expect(step3.body.data.orderStatus).toBe('ready');

    // 4. ready -> completed
    const step4 = await request(app)
      .patch(`/api/v1/orders/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orderStatus: 'completed' });
    expect(step4.status).toBe(200);
    expect(step4.body.data.orderStatus).toBe('completed');
  });

  test('PATCH /api/v1/orders/admin/orders/:id/status rejects illegal jump: placed -> completed with 400', async () => {
    const res = await request(app)
      .patch(`/api/v1/orders/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orderStatus: 'completed' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  test('PATCH /api/v1/orders/admin/orders/:id/payment updates payment to paid_counter', async () => {
    const res = await request(app)
      .patch(`/api/v1/orders/admin/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentStatus: 'paid_counter' });

    expect(res.status).toBe(200);
    expect(res.body.data.paymentStatus).toBe('paid_counter');

    const updated = await Order.findById(orderId);
    expect(updated.paymentStatus).toBe('paid_counter');
  });
});
