const request = require('supertest');
const app = require('../../src/app');
const Table = require('../../src/models/Table');
const MenuItem = require('../../src/models/MenuItem');
const Category = require('../../src/models/Category');
const Order = require('../../src/models/Order');
const { setupTestDB } = require('../setup');

setupTestDB();

describe('Order Creation & Pricing Logic', () => {
  let tableToken;
  let coffeeId;
  let croissantId;
  let outOfStockId;

  beforeEach(async () => {
    const table = await Table.create({
      tableNumber: 'T-04',
      qrCodeToken: 'qr_token_testing_123',
      capacity: 2
    });
    tableToken = table.qrCodeToken;

    const cat = await Category.create({ name: 'Bakery' });

    const coffee = await MenuItem.create({
      name: 'Latte',
      category: cat._id,
      price: 4.5,
      isAvailable: true
    });
    coffeeId = coffee._id;

    const croissant = await MenuItem.create({
      name: 'Butter Croissant',
      category: cat._id,
      price: 3.25,
      isAvailable: true
    });
    croissantId = croissant._id;

    const outOfStock = await MenuItem.create({
      name: 'Matcha Tart',
      category: cat._id,
      price: 5.0,
      isAvailable: false
    });
    outOfStockId = outOfStock._id;
  });

  test('POST /api/v1/orders calculates totals from DB prices and ignores client tamper attempts', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({
        qrCodeToken: tableToken,
        items: [
          {
            menuItemId: coffeeId,
            quantity: 2,
            price: 0.01 // Tamper attempt: client passes $0.01
          },
          {
            menuItemId: croissantId,
            quantity: 1,
            price: 0.01 // Tamper attempt
          }
        ],
        customerNotes: 'Please bring extra napkins'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const order = res.body.data.order;
    // Server must compute: (4.50 * 2) + (3.25 * 1) = 9.00 + 3.25 = 12.25
    expect(order.subtotal).toBe(12.25);
    expect(order.totalAmount).toBe(12.25);
    expect(order.items[0].unitPrice).toBe(4.5);
    expect(order.items[1].unitPrice).toBe(3.25);
    expect(res.body.data.customerTrackingToken).toBeDefined();

    // Verify snapshot in DB
    const savedOrder = await Order.findById(order._id);
    expect(savedOrder.items[0].name).toBe('Latte');
    expect(savedOrder.tableNumberSnapshot).toBe('T-04');
  });

  test('POST /api/v1/orders rejects unavailable items with 400 ITEM_UNAVAILABLE', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({
        qrCodeToken: tableToken,
        items: [
          { menuItemId: outOfStockId, quantity: 1 }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ITEM_UNAVAILABLE');
  });

  test('POST /api/v1/orders rejects invalid table QR token with 404', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({
        qrCodeToken: 'non_existent_qr_code',
        items: [
          { menuItemId: coffeeId, quantity: 1 }
        ]
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TABLE_NOT_FOUND');
  });
});
