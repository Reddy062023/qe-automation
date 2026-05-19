// users.spec.ts — API tests using jsonplaceholder.typicode.com
//
// Why did we switch from reqres.in?
// reqres.in recently started returning 401 (Unauthorized) — it now requires
// a paid API key. This is a real-world lesson: external APIs change over time.
// A good QE always has a backup plan.
//
// What is jsonplaceholder.typicode.com?
// A completely free, no-auth-needed fake REST API for testing.
// It has users, posts, comments, todos — perfect for learning API testing.
//
// HTTP methods reminder:
//   GET    = read data       → expects 200
//   POST   = create data     → expects 201
//   PUT    = update data     → expects 200
//   DELETE = remove data     → expects 200

import { test, expect } from '@playwright/test';

// Base URL stored once — easy to change if needed
const BASE = 'https://jsonplaceholder.typicode.com';

test.describe('Users API — jsonplaceholder', () => {

  // TEST 1: Get all users
  // GET /users returns an array of 10 users
  test('GET /users → 200 with user list', async ({ request }) => {
    const res = await request.get(`${BASE}/users`);

    // 200 = success
    expect(res.status()).toBe(200);

    const body = await res.json();

    // Should return 10 users
    expect(body.length).toBe(10);

    // Each user should have these fields
    expect(body[0]).toHaveProperty('id');
    expect(body[0]).toHaveProperty('name');
    expect(body[0]).toHaveProperty('email');
  });

  // TEST 2: Get a single user by ID
  // GET /users/1 returns one user object
  test('GET /users/1 → 200 with single user', async ({ request }) => {
    const res = await request.get(`${BASE}/users/1`);

    expect(res.status()).toBe(200);

    const body = await res.json();

    // User with ID 1 is named Leanne Graham in this API
    expect(body.id).toBe(1);
    expect(body.name).toBe('Leanne Graham');
    expect(body.email).toBeDefined();
  });

  // TEST 3: Create a new user
  // POST /users → 201 created
  test('POST /users → 201 creates user', async ({ request }) => {
    const res = await request.post(`${BASE}/users`, {
      data: {
        name: 'QE Lead',
        username: 'qelead',
        email: 'qelead@test.com'
      }
    });

    // 201 = resource created successfully
    expect(res.status()).toBe(201);

    const body = await res.json();

    // Response should echo back what we sent plus a new ID
    expect(body.name).toBe('QE Lead');
    expect(body.id).toBeDefined();
  });

  // TEST 4: Update an existing user
  // PUT /users/1 → 200 updated
  test('PUT /users/1 → 200 updates user', async ({ request }) => {
    const res = await request.put(`${BASE}/users/1`, {
      data: {
        name: 'Senior QE Lead',
        email: 'senior.qe@test.com'
      }
    });

    expect(res.status()).toBe(200);

    const body = await res.json();

    // Response should reflect the updated name
    expect(body.name).toBe('Senior QE Lead');
  });

  // TEST 5: Delete a user
  // DELETE /users/1 → 200 (jsonplaceholder returns 200 for delete, not 204)
  test('DELETE /users/1 → 200 deleted', async ({ request }) => {
    const res = await request.delete(`${BASE}/users/1`);

    // jsonplaceholder returns 200 for successful deletes
    expect(res.status()).toBe(200);
  });

  // TEST 6: Request a user that does not exist
  // GET /users/999 → 404 not found
  test('GET /users/999 → 404 not found', async ({ request }) => {
    const res = await request.get(`${BASE}/users/999`);

    // 404 = resource does not exist
    expect(res.status()).toBe(404);
  });

});