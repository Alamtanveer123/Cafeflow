const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const User = require('../../src/models/User');
const { setupTestDB } = require('../setup');

setupTestDB();

describe('Auth Endpoints & Role Authorization', () => {
  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('AdminSecret123!', 10);
    await User.create({
      name: 'Manager',
      email: 'manager@cafeflow.com',
      passwordHash,
      role: 'admin'
    });

    const staffHash = await bcrypt.hash('StaffPass123!', 10);
    await User.create({
      name: 'Barista',
      email: 'barista@cafeflow.com',
      passwordHash: staffHash,
      role: 'staff'
    });
  });

  test('POST /api/v1/auth/login succeeds with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'manager@cafeflow.com',
        password: 'AdminSecret123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('admin');
  });

  test('POST /api/v1/auth/login fails with invalid password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'manager@cafeflow.com',
        password: 'WrongPassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('GET /api/v1/auth/me requires valid Bearer token', async () => {
    const noTokenRes = await request(app).get('/api/v1/auth/me');
    expect(noTokenRes.status).toBe(401);

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'manager@cafeflow.com',
        password: 'AdminSecret123!'
      });
    const token = loginRes.body.data.token;

    const authRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(authRes.status).toBe(200);
    expect(authRes.body.data.user.email).toBe('manager@cafeflow.com');
  });
});
