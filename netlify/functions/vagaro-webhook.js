/**
 * Vagaro webhook scaffold — POST /.netlify/functions/vagaro-webhook
 *
 * This function intentionally stops at validation + routing + mapping hooks.
 * It is production-minded scaffolding for the future live Vagaro integration,
 * not the final integration itself.
 *
 * Expected future responsibilities:
 *   - verify webhook signature once Vagaro credentials/spec are available
 *   - route appointment/customer/transaction events
 *   - upsert Luxe operational tables from incoming Vagaro data
 *
 * Current behavior:
 *   - accepts JSON POST payloads
 *   - normalizes event type
 *   - calls placeholder handlers
 *   - logs mapped output shape
 *   - returns success without mutating Luxe data
 */

const {
  normalizeWebhookEvent,
  handleAppointmentCreatedOrUpdated,
  handleCustomerCreatedOrUpdated,
  handleTransactionCreated,
} = require('./_lib/vagaro');

const ok = (body) => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const fail = (status, message) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ok: false, error: message }),
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return fail(405, 'method_not_allowed');

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return fail(400, 'invalid_json');
  }

  const normalized = normalizeWebhookEvent(payload);
  const eventType = normalized.eventType.toLowerCase();

  const context = {
    payload,
    // Placeholder upsert hooks.
    // Once the live integration is enabled, these should perform the actual
    // Supabase upserts into `appointments`, `clients`, and `transactions`.
    upsertAppointment: async (row) => console.log('[vagaro] appointment -> appointments', row),
    upsertClient: async (row) => console.log('[vagaro] customer -> clients', row),
    upsertTransaction: async (row) => console.log('[vagaro] transaction -> transactions', row),
  };

  let result;
  if (eventType.includes('appointment')) {
    result = await handleAppointmentCreatedOrUpdated(context);
  } else if (eventType.includes('customer') || eventType.includes('client')) {
    result = await handleCustomerCreatedOrUpdated(context);
  } else if (eventType.includes('transaction') || eventType.includes('payment') || eventType.includes('sale')) {
    result = await handleTransactionCreated(context);
  } else {
    console.log('[vagaro] unhandled event scaffold', { eventType, payload });
    result = { ok: true, mapped: 'unhandled' };
  }

  return ok({
    ok: true,
    mode: 'scaffold',
    event_type: normalized.eventType,
    result,
    note: 'Vagaro webhook scaffold received the event. Live persistence is not enabled yet.',
  });
};
