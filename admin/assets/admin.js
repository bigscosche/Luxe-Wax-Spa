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

// TEMPORARY: prototype-only bypass for the private admin area.
// This must be turned OFF before any real launch.
const DEV_BYPASS_AUTH = true;
const DEV_BYPASS_SESSION = {
  user: { email: 'Prototype Mode' },
};

// 3. Auth gate — call at the top of every admin page (except login).
async function requireAuth() {
  if (DEV_BYPASS_AUTH) {
    return DEV_BYPASS_SESSION;
  }

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
    ['transactions', 'Transactions', '/admin/transactions.html'],
  ];
  el.innerHTML = `
    <h1>LUXE WAX SPA<strong>Admin</strong>${DEV_BYPASS_AUTH ? '<span class="proto-badge">Prototype Mode</span>' : ''}</h1>
    <nav>
      ${links.map(([k, label, href]) =>
        `<a href="${href}" class="${k === active ? 'active' : ''}">${label}</a>`
      ).join('')}
    </nav>
    <div class="who">${DEV_BYPASS_AUTH ? 'Auth bypass enabled' : (session?.user?.email || '')}</div>
    ${DEV_BYPASS_AUTH ? '' : '<button class="signout" id="signOutBtn">Sign out</button>'}
  `;
  if (!DEV_BYPASS_AUTH) {
    document.getElementById('signOutBtn').addEventListener('click', async () => {
      await sb.auth.signOut();
      location.replace('/admin/login.html');
    });
  }
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
const SERVICE_PRESETS = {
  'Brazilian Wax': {
    defaultPrice: 65,
    followUpDays: 21,
    inventoryUsage: [
      { item: 'Hard wax beads', quantity: 1, unit: 'service-use' },
      { item: 'Nitrile gloves', quantity: 1, unit: 'pair' },
      { item: 'Wax strips', quantity: 2, unit: 'strip' },
    ],
  },
  'Bikini Wax': {
    defaultPrice: 45,
    followUpDays: 21,
    inventoryUsage: [
      { item: 'Hard wax beads', quantity: 1, unit: 'service-use' },
      { item: 'Nitrile gloves', quantity: 1, unit: 'pair' },
    ],
  },
  Brows: {
    defaultPrice: 25,
    followUpDays: 28,
    inventoryUsage: [
      { item: 'Brow wax/thread', quantity: 1, unit: 'service-use' },
      { item: 'Nitrile gloves', quantity: 1, unit: 'pair' },
    ],
  },
  'Lash Lift & Tint': {
    defaultPrice: 95,
    followUpDays: 42,
    inventoryUsage: [
      { item: 'Lash lift solution', quantity: 1, unit: 'service-use' },
      { item: 'Tint solution', quantity: 1, unit: 'service-use' },
    ],
  },
  'Body Waxing': {
    defaultPrice: 80,
    followUpDays: 28,
    inventoryUsage: [
      { item: 'Hard wax beads', quantity: 1, unit: 'service-use' },
      { item: 'Nitrile gloves', quantity: 1, unit: 'pair' },
      { item: 'Wax strips', quantity: 2, unit: 'strip' },
    ],
  },
  "Men's Waxing": {
    defaultPrice: 75,
    followUpDays: 28,
    inventoryUsage: [
      { item: 'Hard wax beads', quantity: 1, unit: 'service-use' },
      { item: 'Nitrile gloves', quantity: 1, unit: 'pair' },
      { item: 'Wax strips', quantity: 2, unit: 'strip' },
    ],
  },
  Other: {
    defaultPrice: null,
    followUpDays: 21,
    inventoryUsage: [],
  },
};
const SERVICE_ALIASES = {
  'Eyebrow Design': 'Brows',
};
const TRANSACTION_CATEGORIES = ['Service', 'Product', 'Supplies', 'Rent', 'Software', 'Refund', 'Other'];
const TRANSACTION_TYPE_LABELS = { income: 'Income', expense: 'Expense' };
const APPOINTMENT_STATUS_LABELS = { booked: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled' };
const normalizeServiceName = (name) => SERVICE_ALIASES[name] || name || '';
const getServicePreset = (name) => SERVICE_PRESETS[normalizeServiceName(name)] || null;
const listServiceNames = () => Object.keys(SERVICE_PRESETS);
const normalizeTransactionCategory = (category) => {
  const value = String(category || '').trim();
  if (!value) return '';
  const match = TRANSACTION_CATEGORIES.find((item) => item.toLowerCase() === value.toLowerCase());
  return match || value;
};
const fmtTransactionType = (type) => TRANSACTION_TYPE_LABELS[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : '—');
const normalizeAppointmentStatus = (status) => status === 'booked' ? 'scheduled' : (status || '');
const fmtAppointmentStatus = (status) => {
  if (!status) return '—';
  return APPOINTMENT_STATUS_LABELS[status] || APPOINTMENT_STATUS_LABELS[normalizeAppointmentStatus(status)] || normalizeAppointmentStatus(status).replace(/_/g, ' ');
};
const appointmentStatusBadgeClass = (status) => normalizeAppointmentStatus(status) || 'scheduled';
const SERVICE_INVENTORY_USAGE = Object.fromEntries(
  Object.entries(SERVICE_PRESETS).map(([service, preset]) => [service, preset.inventoryUsage || []])
);
const FOLLOW_UP_META_START = '[follow-up-meta]';
const FOLLOW_UP_META_END = '[/follow-up-meta]';
const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function parseClientFollowUpMeta(notes) {
  const raw = String(notes || '');
  const start = raw.indexOf(FOLLOW_UP_META_START);
  const end = raw.indexOf(FOLLOW_UP_META_END);
  if (start === -1 || end === -1 || end <= start) return {};
  const json = raw.slice(start + FOLLOW_UP_META_START.length, end).trim();
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function stripClientFollowUpMeta(notes) {
  const raw = String(notes || '');
  const start = raw.indexOf(FOLLOW_UP_META_START);
  const end = raw.indexOf(FOLLOW_UP_META_END);
  if (start === -1 || end === -1 || end <= start) return raw.trim();
  const before = raw.slice(0, start).trim();
  const after = raw.slice(end + FOLLOW_UP_META_END.length).trim();
  return [before, after].filter(Boolean).join('\n').trim();
}

function buildClientNotesWithFollowUpMeta(visibleNotes, meta) {
  const cleanNotes = String(visibleNotes || '').trim();
  const nextMeta = {};
  if (meta?.last_contacted_at) nextMeta.last_contacted_at = meta.last_contacted_at;
  if (meta?.last_contact_note) nextMeta.last_contact_note = meta.last_contact_note;
  const metaBlock = Object.keys(nextMeta).length
    ? `${FOLLOW_UP_META_START}\n${JSON.stringify(nextMeta)}\n${FOLLOW_UP_META_END}`
    : '';
  return [cleanNotes, metaBlock].filter(Boolean).join('\n').trim() || null;
}

// 6. Status helper for inline messages.
function setStatus(el, text, kind = '') {
  if (!el) return;
  el.textContent = text;
  el.className = 'status' + (kind ? ' ' + kind : '');
}

// Expose helpers so each page script can use them.
Object.assign(window, {
  requireAuth,
  renderSidebar,
  fmtDateTime,
  fmtDate,
  fmtMoney,
  SERVICE_PRESETS,
  SERVICE_ALIASES,
  TRANSACTION_CATEGORIES,
  TRANSACTION_TYPE_LABELS,
  normalizeServiceName,
  getServicePreset,
  listServiceNames,
  normalizeTransactionCategory,
  fmtTransactionType,
  fmtAppointmentStatus,
  appointmentStatusBadgeClass,
  SERVICE_INVENTORY_USAGE,
  parseClientFollowUpMeta,
  stripClientFollowUpMeta,
  buildClientNotesWithFollowUpMeta,
  escapeHtml,
  setStatus,
  DEV_BYPASS_AUTH,
});
