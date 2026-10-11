const test = require('node:test');
const assert = require('node:assert');
const { handler } = require('../netlify/functions/vagaro-webhook.js');
const {
  normalizeWebhookEvent,
  mapVagaroAppointmentToAppointment,
  mapVagaroCustomerToClient,
  mapVagaroTransactionToTransaction,
} = require('../netlify/functions/_lib/vagaro.js');

test('vagaro-webhook Netlify function unit tests', async (t) => {
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

  await t.test('handles and normalizes appointment event successfully', async () => {
    const mockPayload = {
      type: 'appointment_created',
      id: 'appt_12345',
      client_id: 'cust_9876',
      service_name: 'Brazilian Wax',
      start_time: '2026-07-02T14:30:00Z',
      price: 65.00,
      notes: 'First time client',
      customer: {
        id: 'cust_9876',
        name: 'Jane Doe',
        phone: '123-456-7890',
        email: 'jane@example.com',
      },
    };

    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify(mockPayload),
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.event_type, 'appointment_created');
    assert.strictEqual(body.result.mapped, 'appointment');
  });

  await t.test('handles customer created event successfully', async () => {
    const mockPayload = {
      topic: 'customer_created',
      id: 'cust_9876',
      first_name: 'John',
      last_name: 'Smith',
      phone: '987-654-3210',
      email: 'john.smith@example.com',
    };

    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify(mockPayload),
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.event_type, 'customer_created');
    assert.strictEqual(body.result.mapped, 'customer');
  });

  await t.test('handles transaction created event successfully', async () => {
    const mockPayload = {
      event_type: 'transaction_created',
      id: 'txn_112233',
      amount: 75.00,
      direction: 'income',
      category: 'Product',
      description: 'Luxe Body Butter',
      created_at: '2026-07-01T12:00:00Z',
    };

    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify(mockPayload),
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.event_type, 'transaction_created');
    assert.strictEqual(body.result.mapped, 'transaction');
  });
});

test('vagaro library mapping unit tests', async (t) => {
  await t.test('normalizeWebhookEvent with fallback', () => {
    const res = normalizeWebhookEvent({});
    assert.strictEqual(res.eventType, 'unknown');
    assert.ok(res.receivedAt);
  });

  await t.test('mapVagaroAppointmentToAppointment mapping matches schema', () => {
    const appt = mapVagaroAppointmentToAppointment({
      id: 'ap123',
      client_id: 'cl99',
      service_name: 'Full Leg Wax',
      start_time: '2026-08-01',
      price: 85,
    });
    assert.strictEqual(appt.provider, 'vagaro');
    assert.strictEqual(appt.provider_appointment_id, 'ap123');
    assert.strictEqual(appt.provider_customer_id, 'cl99');
    assert.strictEqual(appt.service, 'Full Leg Wax');
    assert.strictEqual(appt.price, 85);
  });

  await t.test('mapVagaroCustomerToClient mapping joins names correctly', () => {
    const client = mapVagaroCustomerToClient({
      id: 'cl99',
      first_name: 'Amy',
      last_name: 'Pond',
      phone: '111-222',
    });
    assert.strictEqual(client.name, 'Amy Pond');
    assert.strictEqual(client.provider_customer_id, 'cl99');
  });

  await t.test('mapVagaroTransactionToTransaction infers direction correctly', () => {
    const refund = mapVagaroTransactionToTransaction({
      id: 'tx77',
      amount: 40,
      direction: 'refund',
    });
    assert.strictEqual(refund.type, 'expense');

    const payment = mapVagaroTransactionToTransaction({
      id: 'tx88',
      amount: 60,
      type: 'payment',
    });
    assert.strictEqual(payment.type, 'income');
  });
});
