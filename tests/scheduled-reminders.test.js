const test = require('node:test');
const assert = require('node:assert');
const { handler } = require('../netlify/functions/scheduled-reminders.js');

test('scheduled-reminders function unit tests', async (t) => {
  const origEnv = { ...process.env };
  const origFetch = global.fetch;

  t.afterEach(() => {
    process.env = { ...origEnv };
    global.fetch = origFetch;
  });

  await t.test('fails if server is misconfigured (missing env vars)', async () => {
    process.env.SUPABASE_URL = '';
    process.env.SUPABASE_SERVICE_KEY = '';

    const res = await handler();
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.body, 'server_misconfigured');
  });

  await t.test('succeeds and executes scheduled automation tasks', async () => {
    process.env.SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'mock-service-key';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/mock';
    process.env.TWILIO_ACCOUNT_SID = 'ACmock';
    process.env.TWILIO_AUTH_TOKEN = 'mock-auth-token';
    process.env.TWILIO_FROM = '+15551234';

    const updates = [];
    const smsSent = [];
    let slackPayload = null;

    global.fetch = async (url, options) => {
      // 1. Supabase REST RPC Mocks
      if (url.includes('/rest/v1/rpc/appointments_needing_reminder')) {
        return {
          ok: true,
          json: async () => [{ id: 101, client_id: 1, service: 'Brazilian Wax', appointment_date: '2026-07-02T10:00:00Z' }],
        };
      }
      if (url.includes('/rest/v1/rpc/appointments_needing_thanks')) {
        return {
          ok: true,
          json: async () => [{ id: 102, client_id: 2, service: 'Brows' }],
        };
      }
      if (url.includes('/rest/v1/rpc/appointments_needing_rebook')) {
        return {
          ok: true,
          json: async () => [{ id: 103, client_id: 3, service: 'Body Waxing' }],
        };
      }

      // 2. Supabase SELECT client mocks
      if (url.includes('/rest/v1/clients')) {
        let client = { id: 99, name: 'Unknown', phone: '' };
        if (url.includes('id=eq.1')) client = { id: 1, name: 'Alice', phone: '+12035550111' };
        if (url.includes('id=eq.2')) client = { id: 2, name: 'Bob', phone: '+12035550222' };
        if (url.includes('id=eq.3')) client = { id: 3, name: 'Charlie', phone: '+12035550333' };
        return {
          ok: true,
          json: async () => [client],
        };
      }

      // 3. Supabase SELECT inventory alert mocks
      if (url.includes('/rest/v1/inventory_alerts')) {
        return {
          ok: true,
          json: async () => [{ name: 'Hard wax beads', quantity: 200, low_stock_threshold: 500, estimated_clients_remaining: 8 }],
        };
      }

      // 4. Supabase UPDATE appointment mocks
      if (url.includes('/rest/v1/appointments') && options.method === 'PATCH') {
        const body = JSON.parse(options.body);
        const urlParams = new URL(url).searchParams;
        const id = urlParams.get('id').replace('eq.', '');
        updates.push({ id, body });
        return { ok: true };
      }

      // 5. Twilio mock
      if (url.includes('api.twilio.com')) {
        const bodyText = options.body;
        const params = new URLSearchParams(bodyText);
        smsSent.push({
          to: params.get('To'),
          from: params.get('From'),
          body: params.get('Body'),
        });
        return { ok: true };
      }

      // 6. Slack mock
      if (url.includes('hooks.slack.com')) {
        slackPayload = JSON.parse(options.body);
        return { ok: true };
      }

      return { ok: false, status: 404 };
    };

    const res = await handler();
    assert.strictEqual(res.statusCode, 200);

    const body = JSON.parse(res.body);
    assert.strictEqual(body.reminders_sent, 1);
    assert.strictEqual(body.thanks_sent, 1);
    assert.strictEqual(body.rebooks_sent, 1);
    assert.strictEqual(body.low_stock_alerted, 1);
    assert.strictEqual(body.errors.length, 0);

    // Verify SMS messages
    assert.strictEqual(smsSent.length, 3);
    assert.strictEqual(smsSent[0].to, '+12035550111');
    assert.match(smsSent[0].body, /reminder of your Brazilian Wax appointment/);
    assert.strictEqual(smsSent[1].to, '+12035550222');
    assert.match(smsSent[1].body, /Thank you for visiting Luxe Wax Spa/);
    assert.strictEqual(smsSent[2].to, '+12035550333');
    assert.match(smsSent[2].body, /ready to rebook/i);

    // Verify database updates
    assert.strictEqual(updates.length, 3);
    assert.strictEqual(updates[0].id, '101');
    assert.ok(updates[0].body.reminder_sent_at);
    assert.strictEqual(updates[1].id, '102');
    assert.ok(updates[1].body.thanks_sent_at);
    assert.strictEqual(updates[2].id, '103');
    assert.ok(updates[2].body.rebook_reminder_sent_at);

    // Verify Slack alerts
    assert.ok(slackPayload);
    assert.match(slackPayload.text, /Low stock/);
  });
});
