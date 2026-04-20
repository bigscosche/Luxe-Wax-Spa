/**
 * Vagaro integration scaffold
 *
 * Purpose:
 *   Keep Vagaro as the booking/customer/payment source of truth while Luxe
 *   acts as the internal operations dashboard layered on top.
 *
 * Status:
 *   This file does not implement a live Vagaro API client yet.
 *   It only defines the normalization/mapping points that a webhook handler
 *   can call when credentials and payload contracts are finalized.
 */

function normalizeWebhookEvent(payload = {}) {
  const eventType = payload.event_type || payload.type || payload.topic || 'unknown';
  return {
    eventType,
    payload,
    receivedAt: new Date().toISOString(),
  };
}

async function handleAppointmentCreatedOrUpdated({ payload, upsertAppointment, upsertClient }) {
  const clientRow = mapVagaroCustomerToClient(payload.customer || payload.client || {});
  const appointmentRow = mapVagaroAppointmentToAppointment(payload);

  // Incoming Vagaro customer data should upsert into Luxe `clients`.
  // Typical key: external provider id / phone / email, once a durable match rule is chosen.
  await upsertClient?.(clientRow, payload);

  // Incoming Vagaro appointment data should upsert into Luxe `appointments`.
  // Typical fields: service, appointment_date, status, price, client_id/provider reference.
  await upsertAppointment?.(appointmentRow, payload);

  return { ok: true, mapped: 'appointment' };
}

async function handleCustomerCreatedOrUpdated({ payload, upsertClient }) {
  const clientRow = mapVagaroCustomerToClient(payload);

  // Incoming Vagaro customer data should upsert into Luxe `clients`.
  await upsertClient?.(clientRow, payload);

  return { ok: true, mapped: 'customer' };
}

async function handleTransactionCreated({ payload, upsertTransaction, upsertClient, upsertAppointment }) {
  const clientRow = mapVagaroCustomerToClient(payload.customer || payload.client || {});
  const appointmentRow = payload.appointment ? mapVagaroAppointmentToAppointment(payload.appointment) : null;
  const transactionRow = mapVagaroTransactionToTransaction(payload);

  // Incoming Vagaro customer data should upsert into Luxe `clients`.
  await upsertClient?.(clientRow, payload);

  // If the Vagaro transaction references a booking, keep Luxe `appointments` in sync too.
  if (appointmentRow) await upsertAppointment?.(appointmentRow, payload);

  // Incoming Vagaro payment/sale data should upsert into Luxe `transactions`.
  await upsertTransaction?.(transactionRow, payload);

  return { ok: true, mapped: 'transaction' };
}

function mapVagaroAppointmentToAppointment(payload = {}) {
  return {
    provider: 'vagaro',
    provider_appointment_id: payload.id || payload.appointment_id || null,
    provider_customer_id: payload.customer_id || payload.client_id || null,
    service: payload.service_name || payload.service || null,
    appointment_date: payload.start_time || payload.appointment_date || null,
    price: payload.price ?? payload.total ?? null,
    status: payload.status || 'booked',
    notes: payload.notes || null,
  };
}

function mapVagaroCustomerToClient(payload = {}) {
  return {
    provider: 'vagaro',
    provider_customer_id: payload.id || payload.customer_id || payload.client_id || null,
    name: payload.name || [payload.first_name, payload.last_name].filter(Boolean).join(' ') || null,
    phone: payload.phone || payload.mobile || null,
    email: payload.email || null,
    notes: payload.notes || null,
  };
}

function mapVagaroTransactionToTransaction(payload = {}) {
  return {
    provider: 'vagaro',
    provider_transaction_id: payload.id || payload.transaction_id || null,
    provider_customer_id: payload.customer_id || payload.client_id || null,
    provider_appointment_id: payload.appointment_id || payload.booking_id || null,
    amount: payload.amount ?? payload.total ?? null,
    type: payload.type || inferTransactionType(payload),
    category: payload.category || payload.sale_type || 'Service',
    description: payload.description || payload.memo || 'Vagaro transaction',
    transaction_date: payload.transaction_date || payload.created_at || null,
  };
}

function inferTransactionType(payload = {}) {
  const raw = String(payload.type || payload.direction || '').toLowerCase();
  if (raw.includes('expense') || raw.includes('refund')) return 'expense';
  return 'income';
}

module.exports = {
  normalizeWebhookEvent,
  handleAppointmentCreatedOrUpdated,
  handleCustomerCreatedOrUpdated,
  handleTransactionCreated,
  mapVagaroAppointmentToAppointment,
  mapVagaroCustomerToClient,
  mapVagaroTransactionToTransaction,
};
