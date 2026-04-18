/**
 * Lead capture — POST /.netlify/functions/lead
 *
 * Flow: validate → honeypot → rate-limit → Supabase insert → Slack notify → respond.
 *
 * Env vars (Netlify → Site settings → Environment variables):
 *   SUPABASE_URL           e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY   service_role key (server-only, never ship to browser)
 *   SLACK_WEBHOOK_URL      incoming webhook for #leads channel
 *
 * Runtime: Node 18+ (native fetch). Netlify defaults to Node 18; no deps needed.
 */

const ALLOWED_SERVICES = new Set([
  'brazilian-wax', 'bikini-wax', 'eyebrow-design',
  'lash-lift', 'body-waxing', 'mens-waxing', 'other',
]);
const ALLOWED_LOCATIONS = new Set([
  'newtown', 'danbury', 'bethel', 'ridgefield', 'monroe', 'other',
]);
const MAX_FIELD_LEN = { name: 120, phone: 40, email: 160, message: 2000 };
const RATE_WINDOW_MIN = 60;
const RATE_MAX_PER_WINDOW = 3;

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

  let data;
  try { data = JSON.parse(event.body || '{}'); }
  catch { return fail(400, 'invalid_json'); }

  // 1. Honeypot — real users leave this empty. Silently succeed to avoid training bots.
  if (data.website) return ok({ ok: true });

  // 2. Validate required fields.
  const required = ['name', 'phone', 'email', 'service', 'location'];
  for (const key of required) {
    if (!data[key] || typeof data[key] !== 'string' || !data[key].trim()) {
      return fail(400, `missing_${key}`);
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return fail(400, 'invalid_email');
  if (!ALLOWED_SERVICES.has(data.service))   return fail(400, 'invalid_service');
  if (!ALLOWED_LOCATIONS.has(data.location)) return fail(400, 'invalid_location');

  // 3. Trim + length-cap every string field.
  const row = {
    name:     data.name.trim().slice(0, MAX_FIELD_LEN.name),
    phone:    data.phone.trim().slice(0, MAX_FIELD_LEN.phone),
    email:    data.email.trim().toLowerCase().slice(0, MAX_FIELD_LEN.email),
    service:  data.service,
    location: data.location,
    message:  (data.message || '').trim().slice(0, MAX_FIELD_LEN.message),
    source:   (data.source || '').slice(0, 200),
    submitted: data.submitted || new Date().toISOString(),
  };

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY, SLACK_WEBHOOK_URL } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[lead] missing Supabase env vars');
    return fail(500, 'server_misconfigured');
  }

  const sbHeaders = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };

  // 4. Rate-limit: same email, last 60 min, max 3 submissions.
  try {
    const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString();
    const checkUrl = `${SUPABASE_URL}/rest/v1/leads`
      + `?select=id&email=eq.${encodeURIComponent(row.email)}`
      + `&created_at=gte.${encodeURIComponent(since)}`
      + `&limit=${RATE_MAX_PER_WINDOW}`;
    const checkRes = await fetch(checkUrl, { headers: sbHeaders });
    if (checkRes.ok) {
      const rows = await checkRes.json();
      if (Array.isArray(rows) && rows.length >= RATE_MAX_PER_WINDOW) {
        return fail(429, 'rate_limited');
      }
    }
    // On check failure we fall through — don't block the lead over a read error.
  } catch (err) {
    console.warn('[lead] rate-limit check failed, continuing:', err.message);
  }

  // 5. Insert into Supabase.
  try {
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    if (!insertRes.ok) {
      const body = await insertRes.text();
      console.error('[lead] supabase insert failed', insertRes.status, body);
      return fail(500, 'db_insert_failed');
    }
  } catch (err) {
    console.error('[lead] supabase insert threw:', err.message);
    return fail(500, 'db_insert_failed');
  }

  // 6. Notify Slack. Non-fatal — if Slack fails, the lead is already saved.
  if (SLACK_WEBHOOK_URL) {
    try {
      await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSlackPayload(row)),
      });
    } catch (err) {
      console.warn('[lead] slack notify failed:', err.message);
    }
  }

  return ok({ ok: true });
};

function buildSlackPayload(row) {
  const serviceLabel  = row.service.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const locationLabel = row.location.charAt(0).toUpperCase() + row.location.slice(1);
  return {
    text: `New lead — ${serviceLabel} in ${locationLabel}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `New lead · ${serviceLabel}` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Name*\n${row.name}` },
          { type: 'mrkdwn', text: `*Location*\n${locationLabel}` },
          { type: 'mrkdwn', text: `*Phone*\n${row.phone}` },
          { type: 'mrkdwn', text: `*Email*\n${row.email}` },
        ],
      },
      ...(row.message
        ? [{ type: 'section', text: { type: 'mrkdwn', text: `*Message*\n> ${row.message.replace(/\n/g, '\n> ')}` } }]
        : []),
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `source: \`${row.source || '—'}\` · submitted: ${row.submitted}` },
        ],
      },
    ],
  };
}
