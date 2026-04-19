/* ──────────────────────────────────────────────────────────────
   Luxe Wax Spa — Admin shared client
   Loaded by every admin page. Owns: Supabase client, auth gate,
   sidebar nav render, sign-out, generic helpers.
   ────────────────────────────────────────────────────────────── */

// 1. CONFIG — values come from /config.local.js (gitignored).
//    Locally: copy config.example.js → config.local.js and fill it in.
//    Netlify: scripts/build-config.sh generates it at build time from env vars.
//    The anon key is safe in the browser; RLS gates access to authenticated users.
const CFG = window.LUXE_CONFIG;
if (!CFG || !CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) {
  const msg = 'Missing /config.local.js — copy config.example.js and fill in SUPABASE_URL + SUPABASE_ANON_KEY.';
  console.error(msg);
  document.addEventListener('DOMContentLoaded', () => {
    document.body.innerHTML = `<pre style="padding:2rem;font:14px/1.5 monospace;color:#b85c5c">${msg}</pre>`;
  });
  throw new Error(msg);
}

// 2. Supabase client (loaded via CDN in the page <head>).
const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'luxe-admin-session' },
});
window.sb = sb;

// 3. Auth gate — call at the top of every admin page (except login).
async function requireAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    const target = encodeURIComponent(location.pathname + location.search);
    location.replace(`/admin/login.html?next=${target}`);
    return null;
  }
  return session;
}

// 4. Sidebar — rendered into <div id="sidebar"></div>. Pass the active key.
function renderSidebar(active, session) {
  const el = document.getElementById('sidebar');
  if (!el) return;
  const links = [
    ['dashboard',    'Dashboard',    '/admin/dashboard.html'],
    ['appointments', 'Appointments', '/admin/appointments.html'],
    ['clients',      'Clients',      '/admin/clients.html'],
    ['inventory',    'Inventory',    '/admin/inventory.html'],
  ];
  el.innerHTML = `
    <h1>LUXE WAX SPA<strong>Admin</strong></h1>
    <nav>
      ${links.map(([k, label, href]) =>
        `<a href="${href}" class="${k === active ? 'active' : ''}">${label}</a>`
      ).join('')}
    </nav>
    <div class="who">${session?.user?.email || ''}</div>
    <button class="signout" id="signOutBtn">Sign out</button>
  `;
  document.getElementById('signOutBtn').addEventListener('click', async () => {
    await sb.auth.signOut();
    location.replace('/admin/login.html');
  });
}

// 5. Generic helpers.
const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
};
const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { dateStyle: 'medium' });
};
const fmtMoney = (n) => (n == null ? '—' : `$${Number(n).toFixed(2)}`);
const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

// 6. Status helper for inline messages.
function setStatus(el, text, kind = '') {
  if (!el) return;
  el.textContent = text;
  el.className = 'status' + (kind ? ' ' + kind : '');
}

// Expose helpers so each page script can use them.
Object.assign(window, { requireAuth, renderSidebar, fmtDateTime, fmtDate, fmtMoney, escapeHtml, setStatus });
