/**
 * Scheduled automation — POST /.netlify/functions/scheduled-reminders
 *
 * Runs the four private ops the business needs on a cadence:
 *   1. 24h appointment reminders  (SMS — TODO)
 *   2. Post-visit thank-yous       (SMS — TODO)
 *   3. 14-day rebook nudges        (SMS — TODO)
 *   4. Low-stock inventory alerts  (Slack — ready)
 *
 * Schedule this via Netlify Scheduled Functions (netlify.toml):
 *   [functions."scheduled-reminders"]
 *     schedule = "0 * * * *"   # hourly
 *
 * Env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY  (required)
 *   SLACK_WEBHOOK_URL                   (optional — for low-stock alerts)
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM  (optional — when SMS goes live)
 *
 * Runtime: Node 18+ (native fetch). Idempotent — each appointment is
 * "marked sent" in the DB so repeat runs will not double-send.
 */

const BOOKING_URL = 'https://www.vagaro.com/luxewaxspa';

exports.handler = async () => {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[reminders] missing Supabase env vars');
    return { statusCode: 500, body: 'server_misconfigured' };
  }
  const sb = supabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const summary = {
    reminders_sent: 0,
    thanks_sent: 0,
    rebooks_sent: 0,
    low_stock_alerted: 0,
    errors: [],
  };

  // ── 1. 24h appointment reminders ──────────────────────────
  try {
    const due = await sb.rpc('appointments_needing_reminder');
    for (const appt of due) {
      const client = await sb.fetchClient(appt.client_id);
      const sent = await sendSms({
        to: client?.phone,
        body: `Hi ${client?.name || 'there'} — this is a reminder of your ${appt.service} appointment at Luxe Wax Spa tomorrow at ${fmtTime(appt.appointment_date)}. Reply to reschedule.`,
      });
      if (sent) {
        await sb.update('appointments', appt.id, { reminder_sent_at: new Date().toISOString() });
        summary.reminders_sent++;
      }
    }
  } catch (err) { summary.errors.push(`reminders: ${err.message}`); }

  // ── 2. Post-visit thank-yous ──────────────────────────────
  try {
    const due = await sb.rpc('appointments_needing_thanks');
    for (const appt of due) {
      const client = await sb.fetchClient(appt.client_id);
      const reviewUrl = `https://luxewaxspa.netlify.app/review.html?source=post-visit-sms`;
      const sent = await sendSms({
        to: client?.phone,
        body: `Thank you for visiting Luxe Wax Spa, ${client?.name || ''}! If you have a moment, we'd love a quick rating: ${reviewUrl}`,
      });
      if (sent) {
        await sb.update('appointments', appt.id, { thanks_sent_at: new Date().toISOString() });
        summary.thanks_sent++;
      }
    }
  } catch (err) { summary.errors.push(`thanks: ${err.message}`); }

  // ── 3. 14-day rebook nudges ───────────────────────────────
  try {
    const due = await sb.rpc('appointments_needing_rebook');
    for (const appt of due) {
      const client = await sb.fetchClient(appt.client_id);
      const sent = await sendSms({
        to: client?.phone,
        body: `Hi ${client?.name || ''} — it's been a couple weeks since your last visit. Ready to rebook? ${BOOKING_URL}`,
      });
      if (sent) {
        await sb.update('appointments', appt.id, { rebook_reminder_sent_at: new Date().toISOString() });
        summary.rebooks_sent++;
      }
    }
  } catch (err) { summary.errors.push(`rebooks: ${err.message}`); }

  // ── 4. Low-stock Slack alert (once per run; dedupe via a marker row if needed) ──
  try {
    const low = await sb.select('inventory_alerts');
    if (low.length > 0 && process.env.SLACK_WEBHOOK_URL) {
      await notifySlack(buildLowStockPayload(low));
      summary.low_stock_alerted = low.length;
    }
  } catch (err) { summary.errors.push(`low_stock: ${err.message}`); }

  console.log('[reminders] done', summary);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(summary),
  };
};

// ── Supabase REST helper ────────────────────────────────────
function supabaseClient(url, key) {
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
  return {
    async rpc(fn) {
      const res = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: '{}' });
      if (!res.ok) throw new Error(`rpc ${fn}: ${res.status}`);
      return res.json();
    },
    async select(table, query = '') {
      const res = await fetch(`${url}/rest/v1/${table}?${query || 'select=*'}`, { headers });
      if (!res.ok) throw new Error(`select ${table}: ${res.status}`);
      return res.json();
    },
    async update(table, id, patch) {
      const res = await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`update ${table}: ${res.status}`);
    },
    async fetchClient(clientId) {
      if (!clientId) return null;
      const rows = await this.select('clients', `select=id,name,phone,email&id=eq.${clientId}`);
      return rows[0] || null;
    },
  };
}

// ── SMS (TODO: wire up Twilio or similar) ───────────────────
async function sendSms({ to, body }) {
  if (!to || !body) return false;
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
    // Dry-run mode — log so the owner can see what would have gone out,
    // but still mark-as-sent so the DB doesn't queue it forever.
    console.log('[sms dry-run]', { to, body });
    return true;
  }
  const params = new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!res.ok) { console.warn('[sms failed]', res.status, await res.text()); return false; }
  return true;
}

// ── Slack payload for low-stock digest ──────────────────────
async function notifySlack(payload) {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
function buildLowStockPayload(items) {
  const lines = items.map(i => {
    const left = i.estimated_clients_remaining;
    const leftTxt = left != null ? ` (~${left} clients left)` : '';
    return `• *${i.name}* — ${i.quantity} ${i.unit || ''} / threshold ${i.low_stock_threshold}${leftTxt}`;
  }).join('\n');
  return {
    text: `Low stock — ${items.length} item${items.length === 1 ? '' : 's'} need reordering`,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: `Inventory · ${items.length} item${items.length === 1 ? '' : 's'} low` } },
      { type: 'section', text: { type: 'mrkdwn', text: lines } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: 'From Luxe Wax Spa scheduled-reminders' }] },
    ],
  };
}

// ── Small formatter ─────────────────────────────────────────
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
  });
}
