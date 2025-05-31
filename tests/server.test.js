const request = require('supertest');
const { app, resetProfiles } = require('../app');

beforeAll(() => {
  resetProfiles();
});

describe('API Endpoints', () => {
  it('Create profile returns 200 and profile data', async () => {
    const res = await request(app)
      .post('/create-profile')
      .send({ telegram_id: 'test_user_ci', nickname: 'TestBot' });

    if (res.statusCode !== 200) {
      console.error('Response body:', res.body);
    }

    expect(res.statusCode).toBe(200);
    expect(res.body.profile).toHaveProperty('nickname', 'TestBot');
  });

  it('Fight without profile returns 400', async () => {
    const res = await request(app)
      .post('/fight')
      .send({ telegram_id: 'nonexistent_user' });

    expect(res.statusCode).toBe(400);
  });
});
