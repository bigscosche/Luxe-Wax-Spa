/* ─────────────────────────────────────────────────────────────
   Luxe Wax Spa — browser config template
   ---------------------------------------------------------------
   This file IS committed. It shows the shape of the real config.

   For LOCAL development:
     1. Copy this file to  config.local.js   (which is gitignored)
     2. Fill in real values from the Supabase dashboard.

   For PRODUCTION (Netlify):
     The build command in netlify.toml generates config.local.js
     from the SUPABASE_URL / SUPABASE_ANON_KEY environment
     variables at deploy time.

   NOTE: the anon key is intentionally safe to expose in the
   browser — Supabase Row Level Security enforces access.
   The SERVICE key must NEVER appear here.
   ───────────────────────────────────────────────────────────── */
window.LUXE_CONFIG = {
  SUPABASE_URL:      'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY',
};
