# Luxe Wax Spa — Private Business Operating System

This is the **owner-only** control room. It is not linked from the public
site and is blocked from search engines. If you share a link, only people
you share it with can find it.

- Public site:   `https://luxewaxspa.netlify.app`
- Admin login:   `https://luxewaxspa.netlify.app/admin/login.html`
- Review router: `https://luxewaxspa.netlify.app/review.html` (post-visit SMS link)

---

## 1. What's in here

| Path | Purpose |
|------|---------|
| `supabase/admin.sql` | Canonical schema — clients, appointments, inventory, transactions, reviews. Run once in Supabase SQL editor. Rerunnable. |
| `admin/login.html` | Email/password sign-in. Uses Supabase Auth. |
| `admin/dashboard.html` | Today's appointments, low stock, open feedback. |
| `admin/clients.html` | Add / search / edit / delete clients. |
| `admin/appointments.html` | Book / filter / mark complete, cancel, no-show, delete. |
| `admin/inventory.html` | Add / adjust quantity / set threshold / delete items. |
| `admin/assets/admin.css` | Shared dark UI. |
| `admin/assets/admin.js` | Supabase client, auth gate, sidebar, helpers. |
| `review.html` | Public 1–5 star router. 5 → Google review. <5 → saved privately. |
| `netlify/functions/scheduled-reminders.js` | Hourly cron. Sends SMS reminders / thanks / rebooks, Slack low-stock alert. |
| `netlify/functions/lead.js` | Public contact-form submissions (separate system — see `BACKEND.md`). |

---

## 2. One-time setup

### 2a. Supabase project
1. Create a Supabase project.
2. Open **SQL Editor** → paste `supabase/admin.sql` → **Run**.
   This creates the tables, views, SQL functions, and RLS policies.
3. **Authentication → Users → Add user.** Create the owner account
   (email + password). There is no public sign-up flow — only users you
   create here can reach the admin.
4. **Project Settings → API.** Copy the `anon` public key.
5. Put the project URL + anon key into local config (see `SECRETS.md`
   for the full workflow). Short version:
   ```
   cp config.example.js config.local.js
   # edit config.local.js with the real values
   ```
   In production, Netlify generates `config.local.js` automatically
   from the `SUPABASE_URL` / `SUPABASE_ANON_KEY` env vars at build time.

The `anon` key is safe in the browser — Row Level Security blocks any
unauthenticated access to private tables. Anonymous users can only
INSERT into `reviews` (for the public review form).

### 2b. Netlify environment variables
Site settings → Environment variables:

| Variable | Where it's used | Notes |
|----------|-----------------|-------|
| `SUPABASE_URL` | both functions | project URL |
| `SUPABASE_SERVICE_KEY` | both functions | **service_role** key — server only |
| `SLACK_WEBHOOK_URL` | lead.js, scheduled-reminders.js | optional; channel webhook |
| `TWILIO_ACCOUNT_SID` | scheduled-reminders.js | optional; SMS |
| `TWILIO_AUTH_TOKEN` | scheduled-reminders.js | optional; SMS |
| `TWILIO_FROM` | scheduled-reminders.js | optional; Twilio number |

Never put the service key or Twilio auth in browser-loaded files.

### 2c. Google review URL
In `review.html`, replace `GOOGLE_REVIEW_URL` with the real write-review
link for the Google Business profile. Format:
`https://search.google.com/local/writereview?placeid=<PLACE_ID>`

---

## 3. Daily flow

### Clients walking in
Admin → **Appointments** → *Book a new appointment*. If they're new,
add them under **Clients** first, then book. Status starts as `booked`.
After the visit, mark it `completed` — this counts toward today's
revenue on the dashboard and triggers the post-visit thank-you on the
next hourly cron run.

### Restocking
Admin → **Inventory**. Each item has `quantity`, `usage_per_client`,
and `low_stock_threshold`. Once `quantity ≤ threshold`, the item shows
up on the dashboard's **Low stock** section and in the hourly Slack
alert.

### Reading feedback
Dashboard shows unresolved reviews where `rating < 5`. Click
**Mark resolved** after you've followed up with the client.

---

## 4. Example queries (Supabase SQL editor)

```sql
-- Revenue last 30 days, by service
select service, count(*) as visits, sum(price) as revenue
from public.appointments
where status = 'completed'
  and appointment_date >= now() - interval '30 days'
group by service
order by revenue desc nulls last;

-- Clients most overdue to rebook (last visit > 21 days ago)
select c.name, c.phone, max(a.appointment_date) as last_visit
from public.clients c
join public.appointments a on a.client_id = c.id
where a.status = 'completed'
group by c.id
having max(a.appointment_date) < now() - interval '21 days'
order by last_visit asc;

-- Inventory burn rate (clients served per item this month)
select i.name, i.quantity, i.usage_per_client,
       floor(i.quantity / nullif(i.usage_per_client, 0)) as clients_remaining
from public.inventory i
order by clients_remaining nulls last;

-- Open private feedback (complaints)
select created_at, rating, client_name, comment
from public.reviews
where resolved = false and rating < 5
order by created_at desc;
```

---

## 5. Automations (hourly cron)

`netlify/functions/scheduled-reminders.js` runs every hour
(`schedule = "0 * * * *"` in `netlify.toml`) and handles four jobs:

1. **24h reminders.** Any `booked` appointment in the next 24 hours
   with `reminder_sent_at is null` gets an SMS. Column is set after
   send.
2. **Post-visit thanks.** Any `completed` appointment finished in the
   last 36h with `thanks_sent_at is null` gets a thank-you SMS
   containing the `/review.html?source=post-visit-sms` link.
3. **14-day rebook nudge.** Any `completed` appointment from ~14 days
   ago with `rebook_reminder_sent_at is null` gets a rebook SMS.
4. **Low-stock Slack alert.** Any item in `inventory_alerts` produces
   a Slack digest.

**SMS is in dry-run mode until Twilio env vars are set.** In dry-run
the function logs the message and still marks the row as sent — so you
can run it safely without spamming clients.

To re-send: set the `*_sent_at` column back to `null` for that row.

---

## 6. Review flow

`review.html` is a public, unlinked page (robots-blocked). Client taps
a star:

- **5 stars** → quick "thank you" + CTA to write a Google review.
  The 5-star rating itself is also logged to `reviews` for your records.
- **1–4 stars** → private comment box. Saved to `public.reviews`
  with `resolved = false`. Shows up on the dashboard's Open feedback
  list. Nothing is public.

The page uses the **anon** key and can only INSERT into `reviews`
thanks to the `anon insert reviews` RLS policy. No read access, no
other tables.

---

## 7. Security checklist

- [ ] Supabase anon key is in `admin/assets/admin.js` and `review.html`
  — **not** the service key.
- [ ] `SUPABASE_SERVICE_KEY` only in Netlify env vars (server-side).
- [ ] Owner account created manually in Supabase → Authentication.
  Strong password, no public signup form.
- [ ] RLS policies from `supabase/admin.sql` are active. Run:
      `select tablename, policyname from pg_policies where schemaname='public';`
- [ ] `robots.txt` disallows `/admin/`, `/review.html`, and the
      internal structure pages.
- [ ] Admin pages carry `<meta name="robots" content="noindex, nofollow">`.
- [ ] Never paste the service key or Twilio auth into any `.html` file.
- [ ] After `git commit`, sanity-check with
      `git grep -n "service_role\|SUPABASE_SERVICE_KEY"` — should only
      appear in `netlify/functions/*.js` and `ADMIN.md`, `BACKEND.md`.

---

## 8. Troubleshooting

**"permission denied for table X"** when logged into the admin → the
auth policy didn't apply. Rerun `supabase/admin.sql`; it drops and
recreates policies so it's idempotent.

**Login loop** → the anon key or project URL in `admin.js` is wrong,
or the owner user hasn't been created yet.

**Cron didn't fire** → Netlify's scheduled functions log to Site
settings → Functions. Look for the `scheduled-reminders` function and
its last invocation.

**Dashboard numbers wrong** → the `dashboard_today` view reads from
live data. If a column was migrated, rerun `supabase/admin.sql`.
