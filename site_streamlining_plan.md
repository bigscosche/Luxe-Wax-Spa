# Luxe Wax Spa — Mobile-First Streamlining Plan

**Audit date:** 2026-10-11
**Priority:** MOBILE-FIRST. 95%+ of traffic is phone-portrait. Every recommendation below is judged first on "does this read cleanly and convert within 2 seconds on an iPhone?"

---

## 0. TL;DR — The 5 highest-impact changes

1. **Kill the per-service description paragraphs.** The site has ~50 price rows, nearly every one carrying 1–2 lines of prose. On mobile that's the #1 source of scroll fatigue. Cut to 3–5 word micro-copy or nothing.
2. **Make prices LOUD.** Prices today are small (`.9rem`–`1rem`), serif, low-contrast brown (`--brown-light`). They should be the boldest thing in each row — `1.05rem+`, `font-weight 600`, `--navy`.
3. **Add an inline tappable "Book" affordance to every row** (currently booking only exists at section level + global sticky bar).
4. **Collapse 7 pages → 2 core pages** (Home + Services) plus legal/SEO pages. Fold About, Contact, and the Reviews display into Home.
5. **Delete the intro paragraph blocks** on the homepage service tabs and the 6 section-intro paragraphs on Services. They add height, not information.

---

## 1. Proposed New Site Hierarchy

### Current state (what exists today)
| Page | Role | Verdict |
|---|---|---|
| `index.html` | Hero + teaser service tabs + gallery + founder + reviews + CTA | **STAY** (becomes the hub) |
| `services.html` | Full pricing menu (6 categories, ~50 rows) + policies + FAQ + locations | **STAY** (SEO workhorse, redesign) |
| `about.html` | Cida bio, first-visit walkthrough, "Luxe difference", reviews, CTA | **MERGE → remove** |
| `contact.html` | Address/map, FAQ, quote form, prep guide, locations | **MERGE → remove** |
| `review.html` | Post-visit review funnel (happy → public, unhappy → private) | **KEEP as utility** (pull from nav) |
| `privacy.html` | Legal | **STAY** (footer only) |
| `terms.html` | Legal | **STAY** (footer only) |
| `service-areas/*.html` (5) | Local SEO landing pages | **STAY** (footer/SEO only) |

### Recommended structure: **lean 2-page core**

```
HOME  (index.html)                    SERVICES  (services.html)
├─ Hero + Book                        ├─ Short hero + Book
├─ ★ Service menu (tabbed, full)      ├─ ★ Full pricing menu (all ~50, 1-col cards)
├─ Meet Cida (3 lines, was About)     ├─ Good to Know (3 cards, condensed)
├─ Reviews (3 cards, was review page) ├─ FAQ (4 items, was 7)
└─ Visit + Map + Book (was Contact)   └─ Visit + Book
```

**Why 2-page, not 1-page:** a single scroll-forever homepage hurts the one thing that earns Google traffic — the dedicated, keyword-rich `services.html` ("waxing prices Newtown CT"). Keep it as the canonical menu; make Home a fast decision-maker that can *also* close the booking without a page jump.

### Pages to eliminate
- **`about.html`** → its signal ("Brazilian-born, 8+ yrs, mom of 3, one client at a time, near-painless") compresses to a 3-line founder block already present on Home. Delete the page; add a Netlify 301 redirect `/about.html → /#founder`.
- **`contact.html`** → address, hours, map embed, and "book online 24/7" become the Home **Visit** section. Prep guide folds into the Services **Good to Know** cards; the quote form (if kept) moves to Home. 301 `/contact.html → /#visit`.

### Pages to pull from nav (keep file)
- **`review.html`** is a *tool*, not a marketing page — it routes happy clients to public review sites and unhappy ones to private feedback. Keep it, but remove it from the primary nav and link it only from post-visit SMS/email. The *display* of reviews lives on Home.

### New navigation (was 5 links → now 2 + Book)
```
Luxe Wax Spa        Services & Pricing   ·   Book Now ↗
```
Everything else (About/Reviews/Visit) becomes an on-page anchor on Home. Fewer choices = faster decisions on a thumb.

### Redirects to add (`netlify.toml`)
```toml
[[redirects]]
  from = "/about.html"
  to = "/#founder"
  status = 301
[[redirects]]
  from = "/contact.html"
  to = "/#visit"
  status = 301
```

---

## 2. Brutal Copy Audit — Before & After

> Rule applied: any paragraph longer than 2 lines is cut or compressed to 5–8 punchy words; service sub-text becomes 3–5 words.

### Homepage

| Location | BEFORE | AFTER |
|---|---|---|
| `.intro-sub` | "Near-painless Brazilian wax, brow design, and lash lift in a private suite — by licensed esthetician Cida. One client at a time, always." | "Near-painless waxing. Private suite. One client at a time." |
| `.intro-trust` | Licensed & Insured · 8+ Years Experience · Private Suite · Book Online 24/7 | **Keep** (already pill-short) |
| Service tab desc (`#tabDesc`, brows) | "Precision eyebrow design tailored to your face. From classic wax shaping to lamination and tinting — each treatment is sculpted to flatter your natural features." | **Delete on mobile.** Desktop: "Brow design, lamination & tint." |
| Service tab desc (waxing) | "Cida's signature hard wax technique — low-temperature, skin-safe, near-painless. Brazilian, bikini, and full body waxing in a completely private suite. Serving Newtown, Danbury, Bethel, and Ridgefield." | "Signature near-painless hard wax." |
| Service tab desc (lashes) | "A lifted curl that lasts 6–8 weeks, with optional tinting for definition. No extensions, no daily curler — just beautiful natural lashes…" | "Lifted curl, lasts 6–8 weeks." |
| Gallery intro | "Every appointment is completely private. Enjoy the cozy atmosphere of a modern, clinical suite designed around your comfort." | "Completely private. Clean, calm, yours alone." |
| `.founder-body` (2 paragraphs) | ~70 words across 2 paragraphs | "Brazilian-born, CT-licensed, 8+ years. Every wax done by Cida — one client at a time, no front desk, no waiting." (1 short block) |
| Reviews heading | "In Their Own Words" | **Keep** |

### Services page

| Location | BEFORE | AFTER |
|---|---|---|
| Hero sub-paragraph | "Every treatment is performed by licensed esthetician Cida in a private, one-client-at-a-time suite. Known for a near-painless Brazilian technique clients travel from Danbury, Bethel, and Ridgefield to experience." | "Full menu. Real prices. Book in one tap." |
| `.hero-aside-note` | "All prices listed before tax. Gratuity is always appreciated but never expected. Pricing may vary — book online for the most current rates." | "Prices before tax. Book online for live availability." |
| `.menu-intro-text` (whole strip) | Duplicate "clients travel from Danbury, Bethel…" paragraph | **Delete the paragraph.** Keep only the 3 stat badges (8+ / 5★ / 1 Suite). |
| Every `.menu-section-desc` (×6) | 1–2 sentence intro per category | Compress to ≤5 words or delete. e.g. Facials → "Eminence organics · PCA peels · LED." Brazilian → "Near-painless. Discreet. Vajacial included." |
| Per-row `.price-row-desc` (~40 of them) | Full sentences ("Women only. Complete hair removal front, back, and in-between…") | 3–5 words ("Front, back, in-between · vajacial") or delete for self-explanatory rows (Underarms, Toes, Forehead, Upper Lip — name says it all). |
| FAQ (7 items, paragraph answers) | Long multi-sentence answers | Trim to **4 items**, 1–2 sentences each (booking, hair length, first Brazilian, cancellation). |
| `.policies` cards (×3) | 3–4 sentence bodies | 1 sentence each. |

### Example micro-copy rewrites (per the PCA-peel directive)
- Luxe Renewal PCA Chemical Peel: 2-sentence desc → **"Custom PCA peel — smooth, glowing skin."**
- Luxe Made for You Facial: long desc → **"Personalized 60-min Eminence organic facial."**
- Eye Lash Lift: "Provides a stunning, long-lasting curl…" → **"Lifted curl + free tint."**
- Brazilian Wax: "Women only. Complete hair removal front, back…" → **"Full removal · vajacial included."**

---

## 3. Mobile Layout — Service & Pricing Wireframe

### Problem with today's layout
- **Homepage** `.svc-inner` is a 3-column grid (`1fr 1.25fr 0.95fr`: category text / numbered list / oval photo). On mobile it stacks, but the *category column* dumps a big italic title + pill tabs + Book link + **a full description paragraph** on screen *before* the user reaches a single price. Prices are buried below the fold.
- **Services** `.price-two-col` (2-col on desktop) + a per-row `.price-row-desc` on nearly every line = tall, text-dense, squishy wrapping on phones.
- Prices are low-contrast and visually recede.

### Target mobile pattern: one-column scannable price cards

```
┌──────────────────────────────────────────┐   ← full-bleed, 1.25rem side padding
│  BRAZILIAN & BIKINI            ·signature │   ← category label, sticky while in-section
├──────────────────────────────────────────┤
│  Brazilian Wax                      $74   │   ← name 0.95rem navy · PRICE 1.15rem bold navy
│  Front, back · vajacial        [ Book → ] │   ← sub 3–5 words muted · inline book pill
├──────────────────────────────────────────┤
│  Bikini Wax                         $53   │
│  Classic or extended           [ Book → ] │
├──────────────────────────────────────────┤
│  Deep Bikini                        $64   │
│                                [ Book → ] │   ← no sub-line when name is clear
└──────────────────────────────────────────┘
        ▼ next category ▼
```

Rules baked into the pattern:
- **One column, always.** No `price-two-col`, no oval image column on mobile.
- **Price is the loudest token** in the row — right-aligned, bold, navy, ~1.15rem.
- **Whole row is tappable** (wrap row in the Vagaro link) *and* shows an explicit `Book →` pill so the action is obvious, not inferred.
- **Sub-line optional**, max 3–5 words, hidden entirely for self-evident services.
- **Generous touch targets:** each row ≥ 56px tall, 1rem vertical padding.
- **Category label acts as the only "chrome"** — big type and prose paragraphs are gone.
- Keep the existing **sticky bottom Book bar** (already implemented, good) and the **sticky category nav** on Services for fast jumping.

### Rounded-pill alternative (even more "thumb-friendly")
If you want the softer look from the brand (the mobile tabs already use `border-radius:999px`), render each service as a card with `border-radius: 14px`, `background: var(--cream)`, subtle border, 0.75rem gap between cards. Trades a little density for tap-clarity — good for the shorter facial/lash lists, maybe too airy for the 14-row body list. Recommendation: **flat divided rows** for long lists, **cards** for the hero/featured items.

---

## 4. File-by-file Code Changes

### 4A. `assets/css/theme.css` — shared primitives (do this first)

Add a price-emphasis + inline-book + mobile-density block. These class names already exist in markup, so this restyles without touching most HTML.

```css
/* ─── PRICE EMPHASIS (global) ─── */
.row-price,
.price-row-price {
  font-family: var(--font-body);      /* sans reads bolder than serif at small sizes */
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--navy);                 /* was brown-light / brown — now high contrast */
  letter-spacing: -.01em;
}
.s-dark .row-price { color: var(--cream); }

/* ─── INLINE BOOK PILL (new, add to rows) ─── */
.row-book {
  font-family: var(--font-body);
  font-size: .6rem; letter-spacing: .12em; text-transform: uppercase;
  font-weight: 600; color: var(--slate);
  border: 1px solid var(--sand-dark); border-radius: 999px;
  padding: .3rem .8rem; text-decoration: none; white-space: nowrap;
  transition: background .2s, color .2s, border-color .2s;
}
.row-book:hover { background: var(--navy); color: var(--white); border-color: var(--navy); }

/* ─── MOBILE: 1-COLUMN DENSITY + HIDE FLUFF ─── */
@media (max-width: 600px) {
  /* kill every multi-col price grid */
  .price-two-col { grid-template-columns: 1fr !important; gap: 0 !important; }

  /* hide long section/tab prose on phones — names + prices carry the page */
  .menu-section-desc,
  .svc-desc,
  .menu-intro-text { display: none !important; }

  /* taller, thumb-friendly rows */
  .num-row, .price-row { padding: 1rem 0 !important; }

  /* price stays loud */
  .row-price, .price-row-price { font-size: 1.15rem !important; }

  /* trim per-row sub descriptions to one clamped line */
  .row-sub, .price-row-desc {
    font-size: .68rem !important;
    display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;
    overflow: hidden; line-height: 1.4 !important; margin-top: .15rem !important;
  }
}
```

### 4B. `index.html`

1. **Shorten the hero sub** (line ~415):
   ```html
   <p class="intro-sub">Near-painless waxing. Private suite. One client at a time.</p>
   ```
2. **Delete the service-tab description** or shorten it. The `#tabDesc` paragraph (line 447) + the three `desc:` strings in the `data` object (lines ~822, 829, 836) should be cut to ≤5 words each, and the whole `.svc-desc` is already hidden on mobile by 4A.
3. **Add inline Book to each `.num-row`.** Current row ends at `<span class="row-price">`. Wrap price + add pill, e.g.:
   ```html
   <div class="num-row">
     <span class="row-n">01</span>
     <div class="row-svc-wrap">
       <span class="row-svc">Brazilian Wax</span>
       <span class="row-sub">Front, back · vajacial</span>
     </div>
     <span class="row-price">$74</span>
     <a class="row-book" href="https://www.vagaro.com/luxewaxspa/services" target="_blank" rel="noopener">Book →</a>
   </div>
   ```
   Update `.num-row` grid to add the 4th column (in the page `<style>`, line ~183):
   ```css
   .num-row { grid-template-columns: 1.8rem 1fr auto auto; gap: .9rem; }
   ```
4. **Condense the founder block** (lines 618–619): replace the two `<p class="founder-body">` with one short block (see §2). Drop "Read Cida's Story" link target from `about.html` → change to `#` anchor or remove (About page is being deleted).
5. **Prices:** optionally round display prices to whole dollars on Home for scannability ($74 vs $74.45) — keep exact cents on Services where it's the reference menu. (Keep JSON-LD prices exact.)
6. **Fix data inconsistency:** home JSON-LD lists Eyelash Lift at `159.53`; the visible row and Services say `175.48`. Align to `175.48`.

### 4C. `services.html`

1. **Hero + aside copy** (lines 375, 379): replace with the short versions in §2.
2. **Delete the `.menu-intro-text` paragraph** (lines 389–391) — keep only `.menu-intro-badges`. (Also hidden on mobile via 4A, but remove from DOM to save bytes.)
3. **Compress all six `.menu-section-desc`** (lines 430, 491, 598, 631, 708, 801) to ≤5 words.
4. **Strip/shorten `.price-row-desc`:** delete for self-evident rows (Upper Lip, Chin, Forehead, Nostril, Toes, Hands, Underarms, Neck, Ear); 3–5 words for the rest.
5. **Make prices whole + bold** via 4A (no markup change needed for styling; drop cents if desired).
6. **Add `.row-book` pill to each `.price-row`** (same pattern as 4B-3). The `.price-row` is flexbox, so append after `.price-row-price`:
   ```html
   <span class="price-row-price">$74.45</span>
   <a class="row-book" href="https://www.vagaro.com/luxewaxspa/services" target="_blank" rel="noopener">Book →</a>
   ```
7. **Trim FAQ from 7 → 4** (remove parking, combine-services, and one duplicate; keep booking / hair length / first Brazilian / cancellation) and shorten each answer to ≤2 sentences.
8. **Condense `.policy-body` ×3** to one sentence each.
9. **Fix the broken tag:** line 895 closes the `.space-photo` `<div>` with `</section>` — mismatched. Change to `</div>`.

### 4D. Cross-file cleanup
- Update **nav** (both pages, lines ~386–392 / ~345–351) to the 2-link version; same for the mobile menu lists and footer "Menu" column (drop About/Contact, or point them at Home anchors).
- Add the two **301 redirects** to `netlify.toml`.
- After deleting `about.html`/`contact.html`, remove them from `sitemap.xml` and any internal links (footer, nav).

---

## 5. Suggested execution order (lowest risk → highest)
1. **theme.css price + mobile block (4A)** — instant visual win, zero HTML risk.
2. **Copy cuts** on both pages (§2) — pure text edits.
3. **Inline Book pills** (4B-3, 4C-6) + grid tweak.
4. **Fix bugs:** `</section>`→`</div>` (services:895), lash-lift price mismatch (index JSON-LD).
5. **Page consolidation** (merge About/Contact into Home, add redirects, prune nav/sitemap) — do last, test links.

> Everything in steps 1–4 is reversible and ships independently. Step 5 is the structural change; stage it on a branch and verify redirects before deleting files.
