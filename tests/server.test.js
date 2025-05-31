const request = require('supertest');
const express = require('express');
const app = require('../server'); // we'll tweak server.js for this to work

describe('API Endpoints', () => {
  test('Create profile returns 200 and profile data', async () => {
    const res = await request(app)
      .post('/create-profile')
      .send({ telegram_id: 'test_user_ci', nickname: 'TestBot' });
    expect(res.statusCode).toBe(200);
    expect(res.body.profile).toHaveProperty('nickname', 'TestBot');
  });

  test('Fight without profile returns 400', async () => {
    const res = await request(app)
      .post('/fight')
      .send({ telegram_id: 'nonexistent_user' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Profile not found');
  });
});
