const test = require('node:test');
const assert = require('node:assert');
const { handler } = require('../netlify/functions/lead.js');

test('lead capture function unit tests', async (t) => {
  const origEnv = { ...process.env };
  const origFetch = global.fetch;

  t.afterEach(() => {
    process.env = { ...origEnv };
    global.fetch = origFetch;
  });

  await t.test('fails if not POST method', async () => {
    const res = await handler({ httpMethod: 'GET' });
    assert.strictEqual(res.statusCode, 405);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.error, 'method_not_allowed');
  });

  await t.test('fails if invalid JSON body', async () => {
    const res = await handler({ httpMethod: 'POST', body: 'invalid-json' });
    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.error, 'invalid_json');
  });

  await t.test('honeypot returns success silently', async () => {
    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ website: 'http://spam.bot' })
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
  });

  await t.test('fails on missing required fields', async () => {
    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ name: 'John Doe' })
    });
    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, false);
    assert.match(body.error, /^missing_/);
  });

  await t.test('fails on invalid email format', async () => {
    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        phone: '123-456-7890',
        email: 'invalidemail',
        service: 'eyebrow-design',
        location: 'newtown'
      })
    });
    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.error, 'invalid_email');
  });

  await t.test('fails on invalid service name', async () => {
    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        phone: '123-456-7890',
        email: 'john@example.com',
        service: 'invalid-service',
        location: 'newtown'
      })
    });
    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.error, 'invalid_service');
  });

  await t.test('fails if server is misconfigured (missing env vars)', async () => {
    process.env.SUPABASE_URL = '';
    process.env.SUPABASE_SERVICE_KEY = '';
    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        phone: '123-456-7890',
        email: 'john@example.com',
        service: 'eyebrow-design',
        location: 'newtown'
      })
    });
    assert.strictEqual(res.statusCode, 500);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.error, 'server_misconfigured');
  });

  await t.test('succeeds and calls database and slack on correct input', async () => {
    process.env.SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'mock-service-key';
    process.env.SLACK_WEBHOOK_URL = 'https://mock.slack.com';

    let fetchCalls = [];
    global.fetch = async (url, options) => {
      fetchCalls.push({ url, options });
      return {
        ok: true,
        json: async () => ([]),
        text: async () => ('ok')
      };
    };

    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        phone: '123-456-7890',
        email: 'john@example.com',
        service: 'eyebrow-design',
        location: 'newtown',
        message: 'Hello'
      })
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);

    assert.ok(fetchCalls.length >= 2, 'should fetch rate limit and insert data');
    const rateLimitCall = fetchCalls.find(c => c.url.includes('select=id'));
    assert.ok(rateLimitCall, 'should perform rate limit check query');

    const insertCall = fetchCalls.find(c => c.options.method === 'POST' && c.url.includes('/rest/v1/leads'));
    assert.ok(insertCall, 'should insert lead record');
    const insertedBody = JSON.parse(insertCall.options.body);
    assert.strictEqual(insertedBody.name, 'John Doe');
    assert.strictEqual(insertedBody.email, 'john@example.com');
  });
});
