# Lead Capture — Backend Implementation

End-to-end wiring for the contact form on `/contact.html#quote`.
Flow: **browser → Netlify Function → Supabase row → Slack webhook**.

---

## Files in this repo

| Path | Purpose |
|------|---------|
| `contact.html` | Form + client submit handler (already wired to call the function) |
| `netlify/functions/lead.js` | Server-side: validate, rate-limit, insert, notify |
| `supabase/leads.sql` | Canonical DB schema — run once in Supabase |
| `lead-structure.html` | Internal docs page mirroring this file |

---

## 1. Environment variables

Set in **Netlify → Site settings → Environment variables**. Never commit these.

| Name | Value | Where to get it |
|------|-------|-----------------|
| `SUPABASE_URL` | `https://<project>.supabase.co` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_KEY` | `eyJ...` (service_role key) | Same page. Keep this server-only. |
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/services/...` | Slack → Apps → Incoming Webhooks |

> The anon key will NOT work — inserts happen server-side under RLS and require the service role key.

---

## 2. Supabase setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of `supabase/leads.sql`, and run.
3. Verify the table exists under **Table Editor → leads** with RLS **enabled** and **zero policies**.

RLS with zero policies = the table is unreadable/unwritable from the browser. Only the service-role key (used by the function) can touch it. That's intentional.

---

## 3. Slack webhook payload

The function sends a Block Kit message. Example rendered in Slack:

```
New lead · Brazilian Wax
──────────────────────────
Name        Location
Alex Ruiz   Danbury
Phone       Email
203-555…    alex@example.com

> First-timer, weekday mornings

source: /contact.html · submitted: 2026-04-18T16:05:32.000Z
```

The raw JSON posted to the webhook:

```json
{
  "text": "New lead — Brazilian Wax in Danbury",
  "blocks": [
    { "type": "header", "text": { "type": "plain_text", "text": "New lead · Brazilian Wax" } },
    { "type": "section", "fields": [
      { "type": "mrkdwn", "text": "*Name*\nAlex Ruiz" },
      { "type": "mrkdwn", "text": "*Location*\nDanbury" },
      { "type": "mrkdwn", "text": "*Phone*\n203-555…" },
      { "type": "mrkdwn", "text": "*Email*\nalex@example.com" }
    ]},
    { "type": "section", "text": { "type": "mrkdwn", "text": "*Message*\n> First-timer, weekday mornings" } },
    { "type": "context", "elements": [
      { "type": "mrkdwn", "text": "source: `/contact.html` · submitted: 2026-04-18T16:05:32.000Z" }
    ]}
  ]
}
```

The `text` field is a fallback for notifications / platforms that don't render blocks.

---

## 4. Frontend wiring (already done)

These lines in `contact.html` were updated — no further edits needed:

- **Form markup (~line 757)** — added a hidden honeypot field:
  ```html
  <div aria-hidden="true" style="position:absolute; left:-10000px; ...">
    <label for="lead-website">Website</label>
    <input id="lead-website" name="website" type="text" tabindex="-1" autocomplete="off" />
  </div>
  ```
- **Submit handler (~line 927)** — replaced the TODO stub with a real `fetch` call to `/.netlify/functions/lead`, plus a friendlier error-code map (rate_limited, invalid_email, server_misconfigured).

No other pages are affected.

---

## 5. Error handling — what the user sees

| Server response | User-facing message |
|---|---|
| `200 { ok: true }` | "Thanks — your note is in. Cida will reply within one business day." |
| `429 rate_limited` | "Looks like this email just sent a note. Please wait an hour or book online directly." |
| `400 invalid_email` | "That email doesn't look right — please double-check and try again." |
| `500 server_misconfigured` | "The booking system is being updated. Please book online via Vagaro for now." |
| Anything else | "Something went wrong. Please try again or book online directly." |

The function returns JSON `{ ok: false, error: "<code>" }` on failure so the frontend can map codes to friendly text without regex-sniffing.

---

## 6. Spam prevention

Three layers, all lightweight:

1. **Honeypot** — a hidden `website` input. Real users leave it empty; bots fill every field. If present, the function silently returns `200` so bots don't retry or learn. **Already active.**
2. **Server-side validation** — required fields, email regex, allow-listed service/location enums, length caps. Rejects anything malformed with a `400`.
3. **Per-email rate limit** — max 3 submissions per email per 60 minutes (enforced by the function via a Supabase read before insert).

### If spam gets through

Add one of these — both are free and drop-in:

- **Cloudflare Turnstile** (recommended — invisible, privacy-friendly). Add the widget script to the form, send the token, verify server-side in `lead.js` via `https://challenges.cloudflare.com/turnstile/v0/siteverify` before inserting.
- **Netlify native form spam filtering** — set `netlify.toml` → `[functions]` rate limits.

Do not add reCAPTCHA unless required — it's heavy, tracks users, and the honeypot already catches >95% of bots.

---

## 7. Go-live checklist

- [ ] Run `supabase/leads.sql` in the Supabase SQL editor. Verify RLS is on, zero policies.
- [ ] Copy the **service_role** key (not the anon key) from Supabase → Settings → API.
- [ ] Create the Slack Incoming Webhook for the target channel (e.g. `#leads`).
- [ ] In Netlify → Environment variables, set `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SLACK_WEBHOOK_URL`.
- [ ] Commit `netlify/functions/lead.js` and `supabase/leads.sql` to the repo.
- [ ] Push to GitHub → Netlify auto-deploys. Confirm deploy log shows `lead.js` as a deployed function.
- [ ] Test 1 — submit a real lead. Expect: one row in Supabase `leads` + one message in Slack.
- [ ] Test 2 — submit twice more with the same email within an hour. Expect: 4th submission returns the "just sent a note" message.
- [ ] Test 3 — open devtools, fill the hidden `website` field, submit. Expect: `200 ok`, **no** row in Supabase, **no** Slack message.
- [ ] Check Netlify function logs — no errors on a normal submit.
- [ ] Optional: add an alert in Supabase or Netlify if the function errors more than N times per hour.

---

## 8. Local testing (optional)

```bash
npm install -g netlify-cli
netlify dev                   # serves the site + functions at localhost:8888
# In another terminal:
curl -X POST http://localhost:8888/.netlify/functions/lead \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","phone":"555","email":"t@t.co","service":"brazilian-wax","location":"newtown"}'
```

Set the three env vars via `netlify link` + `netlify env:set KEY value`, or export them in your shell before `netlify dev`.
