# Luxe Wax Spa — Local Business Template

A static, zero-build marketing site for a local service business. This repo is both:

1. The live site for **Luxe Wax Spa** (Newtown, CT).
2. A **reusable template** that can be forked and rebranded for another local business (cleaning, contractors, salons, trades) in under a day.

Pure HTML/CSS/JS. No framework, no bundler, no database on the frontend. Hosted on Netlify.

---

## Project structure

```
luxe-wax-spa/
├── index.html                 ← Homepage
├── services.html              ← Services & pricing
├── about.html                 ← About Cida
├── contact.html               ← Contact + map + lead form
├── service-areas/             ← City-level SEO landing pages
│   ├── waxing-danbury-ct.html
│   ├── waxing-bethel-ct.html
│   ├── waxing-ridgefield-ct.html
│   ├── waxing-monroe-ct.html
│   └── brazilian-wax-newtown-ct.html
├── components/                ← Copy-paste HTML snippets (reuse library)
├── assets/
│   ├── css/theme.css          ← Design tokens (single source of truth)
│   ├── js/main.js             ← Shared scripts (nav, reveal, lead form)
│   └── images/                ← Production photos
├── images/                    ← Legacy photo folder (still referenced)
├── sitemap.xml                ← Update <lastmod> on every deploy
├── robots.txt
├── netlify.toml               ← Netlify deploy config
├── admin-notes.html           ← noindex · owner scratchpad
├── lead-structure.html        ← noindex · form → Supabase → Slack
└── system-overview.html       ← noindex · architecture
```

---

## Reusing this template for another business

### 1. Duplicate the repo

```bash
git clone <this-repo> new-business-site
cd new-business-site
rm -rf .git
git init && git add . && git commit -m "initial from luxe template"
```

### 2. Swap tokens

Open `/assets/css/theme.css` — change the palette values in `:root`. Then open each HTML page's inline `<style>` block and change the matching `:root` block there too (each page is self-contained by design).

Swap the two Google Fonts links (`<head>`) if the new brand uses a different type system.

### 3. Find/replace business variables

These appear across pages. Do a whole-repo find/replace:

| Find | Replace with |
|------|---|
| `Luxe Wax Spa` | new business name |
| `luxewaxspa.netlify.app` | new production URL |
| `125b S Main St f` / `Newtown, CT 06470` | new address |
| `41.4143` / `-73.2954` | new lat/lng |
| `vagaro.com/luxewaxspa/services` | booking URL (Calendly, Square, etc.) |
| `@luxewaxspact` / instagram URL | new social |
| `Cida` / `Licensed Esthetician` | owner name + title |

See `/components/README.md` for the full `{{PLACEHOLDER}}` list.

### 4. Rebuild page content

- Replace hero copy and photography on each page.
- Rewrite the Services page for the new offering.
- Rewrite About for the new owner/team.
- Update the 4 FAQ items that are industry-specific.

### 5. Swap service areas

- Rename files in `/service-areas/` to the new cities (`{service}-{city}-{state}.html`).
- Update the footer city links on all 9 pages — each page has a footer tagline and a `footer-bottom` line with linked towns.
- Update the contact page "town pills" (`.town-pill` anchors) to match.

### 6. Update SEO

- Edit `sitemap.xml` — new URLs, new `<lastmod>`, priority weighting stays (home 1.0 · services 0.9 · city pages 0.8 · about 0.7).
- Edit JSON-LD in each `<head>` — new `@type` if not a BeautySalon, new `areaServed`, new `geo`, new `sameAs`.
- Every page title must stay ≤55 chars including the business name.
- Update `<link rel="canonical">` on every page.

### 7. Deploy

```bash
git remote add origin <new-github-repo>
git push -u origin main
```

Then in Netlify → "Add new site" → "Import from Git" → pick the repo → deploy.

---

## Deploying (Netlify + GitHub)

**Option A — GitHub auto-deploy (recommended):**

1. Push to GitHub.
2. Netlify → **Add new site** → **Import from Git** → select the repo.
3. Leave the build command empty. Publish directory: `/` (repo root).
4. Netlify deploys on every push to `main`.

**Option B — Drag and drop (fastest one-off):**

1. Go to [app.netlify.com](https://app.netlify.com).
2. Drag the project folder onto the dashboard.
3. Instant live URL.

Config lives in `netlify.toml`. For functions (see lead form below), create `/netlify/functions/` and Netlify will deploy them automatically.

---

## Lead capture form

The contact page (`/contact.html#quote`) has a Supabase-ready form. Today the submit handler logs payloads to the browser console — the backend is a small Netlify Function described in `/lead-structure.html`.

### Wiring it up

1. **Supabase** — Create a project, run the schema in `/lead-structure.html` (one `leads` table).
2. **Slack** — Create an Incoming Webhook pointed at your `#leads` channel.
3. **Netlify env vars** — Site settings → Environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `SLACK_WEBHOOK_URL`
4. **Function** — Save `/netlify/functions/lead.js` (code in `/lead-structure.html`).
5. **Frontend** — In `contact.html`'s inline `<script>`, uncomment the `fetch('/.netlify/functions/lead', …)` block marked `TODO`.
6. **Test** — Submit a lead. Verify one row in Supabase and one message in Slack.

Field names on the form (`name`, `phone`, `email`, `service`, `location`, `message`) map 1:1 to Supabase column names, so no translation layer is needed.

---

## Adding a new city / SEO landing page

1. Copy `service-areas/waxing-bethel-ct.html` as a starting point.
2. Rename to `waxing-{city}-{state}.html`.
3. Rewrite:
   - `<title>` — ≤55 chars, pattern: `Waxing Near {City} {ST} | {Business} {HomeCity}`
   - meta description — ≤160 chars, include drive time + home city
   - H1 and hero copy — specific to that city's angle (drive time, vibe, clientele)
   - JSON-LD `areaServed` and `geo` stay pointed at the home business; add the city under `areaServed`
   - `<link rel="canonical">` to the new URL
4. Add the page to `/sitemap.xml` with `priority=0.8` and today's `<lastmod>`.
5. Link the new city from the footer tagline and `footer-bottom` on **all** 9 pages.
6. Link it from the contact page's `.town-pill` list.

---

## SEO standards (don't break these)

- Every page has a `<title>` ≤55 chars.
- Every page has a `<meta name="description">` ≤160 chars.
- Every page has `<link rel="canonical">` pointing at its real URL.
- Every page has JSON-LD structured data in `<head>`.
- Every new page is in `sitemap.xml`.
- Internal system pages (`admin-notes`, `lead-structure`, `system-overview`) are `noindex,nofollow` and never linked from public navigation.
- H1 appears once per page, matches the search intent of the title.
- City landing pages are linked from the footer of every page (not the main nav).

---

## Tech stack

- Pure HTML/CSS/JS — no framework, no build step
- Google Fonts: Cormorant Garamond (display) + Syne (body)
- Schema.org JSON-LD: BeautySalon / LocalBusiness / Person
- Netlify (hosting) + Netlify Functions (lead backend)
- Supabase (lead storage) + Slack (lead notifications)
- Vagaro (external booking)

---

## Internal reference pages (noindex)

- [`/admin-notes.html`](admin-notes.html) — owner scratchpad, pre-deploy checklist
- [`/lead-structure.html`](lead-structure.html) — form → Supabase → Slack, with full schema + function code
- [`/system-overview.html`](system-overview.html) — architecture overview

---

## License / reuse

Design and code authored by the site team. Reuse for other small businesses is expected — just swap the tokens and content as described above.
