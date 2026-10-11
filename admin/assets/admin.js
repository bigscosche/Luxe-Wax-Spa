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
const DEV_BYPASS_AUTH = false;
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
    location.replace(`login.html?next=${target}`);
    return null;
  }
  return session;
}

// 4. Sidebar — rendered into <div id="sidebar"></div>. Pass the active key.
function renderSidebar(active, session) {
  const el = document.getElementById('sidebar');
  if (!el) return;
  document.body.classList.add('admin-shell-ready');
  const links = [
    ['dashboard',    'Dashboard',    'dashboard.html'],
    ['appointments', 'Appointments', 'appointments.html'],
    ['clients',      'Clients',      'clients.html'],
    ['leads',        'Leads',        'leads.html'],
    ['inventory',    'Inventory',    'inventory.html'],
    ['transactions', 'Transactions', 'transactions.html'],
  ];
  const existingChrome = document.querySelector('.mobile-admin-bar');
  if (!existingChrome) {
    const chrome = document.createElement('div');
    chrome.className = 'mobile-admin-bar';
    chrome.innerHTML = `
      <button type="button" class="mobile-nav-toggle" aria-expanded="false" aria-controls="sidebar">Menu</button>
      <div class="mobile-admin-title">Luxe Admin</div>
    `;
    document.body.prepend(chrome);
  }
  if (!document.querySelector('.sidebar-backdrop')) {
    const backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'sidebar-backdrop';
    backdrop.setAttribute('aria-label', 'Close navigation');
    document.body.append(backdrop);
  }
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
  bindMobileSidebar();
  document.getElementById('signOutBtn').addEventListener('click', async () => {
    await sb.auth.signOut();
    location.replace('login.html');
  });
}

function bindMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.querySelector('.mobile-nav-toggle');
  const backdrop = document.querySelector('.sidebar-backdrop');
  if (!sidebar || !toggle || !backdrop) return;

  const closeSidebar = () => {
    document.body.classList.remove('sidebar-open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  const openSidebar = () => {
    document.body.classList.add('sidebar-open');
    toggle.setAttribute('aria-expanded', 'true');
  };

  toggle.onclick = () => {
    if (document.body.classList.contains('sidebar-open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  };
  backdrop.onclick = closeSidebar;
  sidebar.querySelectorAll('a').forEach((link) => {
    link.onclick = closeSidebar;
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) closeSidebar();
  }, { passive: true });
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
    defaultPrice: 74.45,
    followUpDays: 21,
    inventoryUsage: [
      { item: 'Hard wax beads', quantity: 1, unit: 'service-use' },
      { item: 'Nitrile gloves', quantity: 1, unit: 'pair' },
      { item: 'Wax strips', quantity: 2, unit: 'strip' },
    ],
  },
  'Bikini Wax': {
    defaultPrice: 53.18,
    followUpDays: 21,
    inventoryUsage: [
      { item: 'Hard wax beads', quantity: 1, unit: 'service-use' },
      { item: 'Nitrile gloves', quantity: 1, unit: 'pair' },
    ],
  },
  Brows: {
    defaultPrice: 31.91,
    followUpDays: 28,
    inventoryUsage: [
      { item: 'Brow wax/thread', quantity: 1, unit: 'service-use' },
      { item: 'Nitrile gloves', quantity: 1, unit: 'pair' },
    ],
  },
  'Lash Lift & Tint': {
    defaultPrice: 175.48,
    followUpDays: 42,
    inventoryUsage: [
      { item: 'Lash lift solution', quantity: 1, unit: 'service-use' },
      { item: 'Tint solution', quantity: 1, unit: 'service-use' },
    ],
  },
  'Body Waxing': {
    defaultPrice: 90.40,
    followUpDays: 28,
    inventoryUsage: [
      { item: 'Hard wax beads', quantity: 1, unit: 'service-use' },
      { item: 'Nitrile gloves', quantity: 1, unit: 'pair' },
      { item: 'Wax strips', quantity: 2, unit: 'strip' },
    ],
  },
  "Men's Waxing": {
    defaultPrice: 53.18,
    followUpDays: 28,
    inventoryUsage: [
      { item: 'Hard wax beads', quantity: 1, unit: 'service-use' },
      { item: 'Nitrile gloves', quantity: 1, unit: 'pair' },
      { item: 'Wax strips', quantity: 2, unit: 'strip' },
    ],
  },
  Facials: {
    defaultPrice: 148.89,
    followUpDays: 30,
    inventoryUsage: [],
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
const LOCATION_LABELS = {
  newtown: 'Newtown',
  danbury: 'Danbury',
  bethel: 'Bethel',
  ridgefield: 'Ridgefield',
  monroe: 'Monroe',
  other: 'Other',
};
const normalizeLocationName = (loc) => LOCATION_LABELS[loc] || loc || '—';
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
const RECENT_CLIENT_STORAGE_KEY = 'luxe-recent-client';
const ADMIN_DATA_EVENT_KEY = 'luxe-admin-data-event';
const ADMIN_FLOW_CONTEXT_KEY = 'luxe-admin-flow-context';
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

function rememberRecentClient(client) {
  if (!client?.id) return;
  try {
    localStorage.setItem(RECENT_CLIENT_STORAGE_KEY, JSON.stringify({
      id: client.id,
      name: client.name || 'Client',
      saved_at: new Date().toISOString(),
    }));
  } catch {}
}

function getRecentClientSuggestion(maxAgeMinutes = 30) {
  try {
    const raw = localStorage.getItem(RECENT_CLIENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id || !parsed?.saved_at) return null;
    const ageMs = Date.now() - new Date(parsed.saved_at).getTime();
    if (Number.isNaN(ageMs) || ageMs > maxAgeMinutes * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function notifyAdminDataChanged(scope = 'general') {
  const detail = { scope, at: new Date().toISOString() };
  try {
    localStorage.setItem(ADMIN_DATA_EVENT_KEY, JSON.stringify(detail));
  } catch {}
  window.dispatchEvent(new CustomEvent('admin:data-changed', { detail }));
}

function rememberAdminFlowContext(context = {}) {
  try {
    localStorage.setItem(ADMIN_FLOW_CONTEXT_KEY, JSON.stringify({
      ...context,
      saved_at: new Date().toISOString(),
    }));
  } catch {}
}

function getAdminFlowContext(maxAgeMinutes = 90) {
  try {
    const raw = localStorage.getItem(ADMIN_FLOW_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.saved_at) return null;
    const ageMs = Date.now() - new Date(parsed.saved_at).getTime();
    if (Number.isNaN(ageMs) || ageMs > maxAgeMinutes * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

// 6. Status helper for inline messages.
function setStatus(el, text, kind = '', options = {}) {
  if (!el) return;
  clearTimeout(el._statusTimer);
  el.textContent = text;
  el.className = 'status' + (kind ? ' ' + kind : '');
  if (!text) return;
  const duration = options.duration ?? (kind === 'ok' ? 2400 : 0);
  if (duration > 0) {
    el._statusTimer = setTimeout(() => {
      el.textContent = '';
      el.className = 'status';
    }, duration);
  }
}

function setFormBusy(form, busy, buttonText) {
  if (!form) return;
  const submit = form.querySelector('button[type="submit"], button:not([type]), .btn[type="submit"]');
  form.querySelectorAll('input, select, textarea, button').forEach((el) => {
    el.disabled = busy;
  });
  if (submit) {
    if (!submit.dataset.defaultLabel) submit.dataset.defaultLabel = submit.textContent;
    submit.textContent = busy ? (buttonText || 'Saving...') : submit.dataset.defaultLabel;
  }
}

}

class LuxeDbError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'LuxeDbError';
    this.code = code;
    this.details = details;
  }
}

function checkError(result) {
  if (result.error) {
    console.error('Database query failed:', result.error);
    throw new LuxeDbError(result.error.message || 'Database operation failed.', result.error.code, result.error.details);
  }
  return result;
}

// 7. Luxe Database seam (luxeDb)
async function getClientsPage({ search = '', page = 1, limit = 50 } = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = sb.from('clients')
    .select('id, name, phone, email, notes, created_at, appointments(price, status, appointment_date, service)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search.trim()) {
    const q = search.trim();
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const result = await query.range(from, to);
  checkError(result);

  const clients = (result.data || []).map(c => {
    const appts = c.appointments || [];
    const completed = appts.filter(a => a.status === 'completed');
    const sortedCompleted = completed
      .filter(a => a.appointment_date)
      .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      notes: c.notes,
      created_at: c.created_at,
      visit_count: completed.length,
      total_spent: completed.reduce((sum, a) => sum + (a.price || 0), 0),
      last_visit_date: sortedCompleted[0]?.appointment_date || null,
      last_completed_service: sortedCompleted[0]?.service || null
    };
  });

  return { data: clients, total: result.count || 0 };
}

async function getAppointmentsPage({ status = 'all', range = 'all', search = '', page = 1, limit = 50 } = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = sb.from('appointments')
    .select('id, client_id, service, appointment_date, price, status, notes, clients(name, phone)', { count: 'exact' })
    .order('appointment_date', { ascending: range !== 'past' });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const nowStr = new Date().toISOString();
  if (range === 'today') {
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayEnd = new Date();
    todayEnd.setHours(23,59,59,999);
    query = query.gte('appointment_date', todayStart.toISOString()).lte('appointment_date', todayEnd.toISOString());
  } else if (range === 'upcoming') {
    query = query.gte('appointment_date', nowStr);
  } else if (range === 'past') {
    query = query.lt('appointment_date', nowStr);
  }

  if (search.trim()) {
    const q = search.trim();
    const clientIdsResult = await sb.from('clients')
      .select('id')
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    
    checkError(clientIdsResult);
    const clientIds = (clientIdsResult.data || []).map(c => c.id);

    if (clientIds.length > 0) {
      query = query.or(`client_id.in.(${clientIds.join(',')}),notes.ilike.%${q}%,service.ilike.%${q}%`);
    } else {
      query = query.or(`notes.ilike.%${q}%,service.ilike.%${q}%`);
    }
  }

  const result = await query.range(from, to);
  checkError(result);

  const appointments = (result.data || []).map(a => ({
    id: a.id,
    client_id: a.client_id,
    client_name: a.clients?.name || '—',
    client_phone: a.clients?.phone || '—',
    service: a.service,
    appointment_date: a.appointment_date,
    price: a.price,
    status: a.status,
    notes: a.notes
  }));

  return { data: appointments, total: result.count || 0 };
}

async function getInventoryPage({ page = 1, limit = 50, alertsOnly = false } = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = sb.from('inventory')
    .select('*', { count: 'exact' })
    .order('name', { ascending: true });

  const result = await query.range(from, to);
  checkError(result);

  let items = (result.data || []).map(i => {
    const isLow = i.quantity <= i.low_stock_threshold;
    return {
      id: i.id,
      name: i.name,
      unit: i.unit,
      quantity: i.quantity,
      usage_per_client: i.usage_per_client,
      low_stock_threshold: i.low_stock_threshold,
      notes: i.notes,
      updated_at: i.updated_at,
      is_low_stock: isLow,
      estimated_clients_remaining: i.usage_per_client > 0 ? Math.floor(i.quantity / i.usage_per_client) : null
    };
  });

  if (alertsOnly) {
    items = items.filter(i => i.is_low_stock);
  }

  return { data: items, total: alertsOnly ? items.length : (result.count || 0) };
}

async function getTransactionsPage({ type = 'all', category = '', page = 1, limit = 50 } = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = sb.from('transactions')
    .select('*', { count: 'exact' })
    .order('transaction_date', { ascending: false });

  if (type !== 'all') {
    query = query.eq('type', type);
  }
  if (category) {
    query = query.eq('category', category);
  }

  const result = await query.range(from, to);
  checkError(result);

  return { data: result.data || [], total: result.count || 0 };
}

async function getLeadsPage({ search = '', page = 1, limit = 50 } = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = sb.from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search.trim()) {
    const q = search.trim();
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,service.ilike.%${q}%,message.ilike.%${q}%`);
  }

  const result = await query.range(from, to);
  checkError(result);

  return { data: result.data || [], total: result.count || 0 };
}

async function getReviewsPage({ resolved, rating, page = 1, limit = 50 } = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = sb.from('reviews')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (resolved !== undefined) {
    query = query.eq('resolved', resolved);
  }
  if (rating !== undefined) {
    query = query.eq('rating', rating);
  }

  const result = await query.range(from, to);
  checkError(result);

  return { data: result.data || [], total: result.count || 0 };
}

async function saveClient(client) {
  const payload = {
    name: client.name,
    phone: client.phone || null,
    email: client.email || null,
    notes: client.notes || null,
  };
  let result;
  if (client.id) {
    result = await sb.from('clients').update(payload).eq('id', client.id).select();
  } else {
    result = await sb.from('clients').insert(payload).select();
  }
  checkError(result);
  notifyAdminDataChanged('clients');
  return result.data[0];
}

async function deleteClient(id) {
  const result = await sb.from('clients').delete().eq('id', id).select();
  checkError(result);
  if (!result.data || result.data.length === 0) {
    throw new LuxeDbError('Delete failed. You do not have permissions or the client does not exist.', 'DELETE_FAILED');
  }
  notifyAdminDataChanged('clients');
}

async function deleteLead(id) {
  const result = await sb.from('leads').delete().eq('id', id).select();
  checkError(result);
  if (!result.data || result.data.length === 0) {
    throw new LuxeDbError('Delete failed. You do not have permissions or the lead does not exist.', 'DELETE_FAILED');
  }
  notifyAdminDataChanged('leads');
}

async function bookAppointment(appt) {
  const payload = {
    client_id: appt.client_id,
    service: appt.service,
    appointment_date: appt.appointment_date,
    price: appt.price ?? (getServicePreset(appt.service)?.price || 0),
    status: 'booked',
    notes: appt.notes || null
  };
  const result = await sb.from('appointments').insert(payload).select();
  checkError(result);
  notifyAdminDataChanged('appointments');
  return result.data[0];
}

async function cancelAppointment(id) {
  const result = await sb.from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('status', 'booked')
    .select();
  checkError(result);
  if (!result.data || result.data.length === 0) {
    throw new LuxeDbError('Cancel failed. Appointment may not be in scheduled state or does not exist.', 'INVALID_STATE');
  }
  notifyAdminDataChanged('appointments');
  return result.data[0];
}

async function updateAppointmentStatus(id, status) {
  const result = await sb.from('appointments')
    .update({ status })
    .eq('id', id)
    .select();
  checkError(result);
  notifyAdminDataChanged('appointments');
  return result.data[0];
}

async function updateAppointmentNote(id, note) {
  const result = await sb.from('appointments')
    .update({ notes: note || null })
    .eq('id', id)
    .select();
  checkError(result);
  notifyAdminDataChanged('appointments');
  return result.data[0];
}

async function deleteAppointment(id) {
  const result = await sb.from('appointments').delete().eq('id', id).select();
  checkError(result);
  notifyAdminDataChanged('appointments');
}

async function completeAppointment(id) {
  const apptResult = await sb.from('appointments').select('*').eq('id', id).single();
  checkError(apptResult);
  const appt = apptResult.data;

  if (appt.status !== 'booked') {
    throw new LuxeDbError(`Cannot complete appointment in '${appt.status}' state.`, 'INVALID_STATE');
  }

  const updateResult = await sb.from('appointments').update({ status: 'completed' }).eq('id', id).select();
  checkError(updateResult);

  const notes = appt.notes || '';
  const match = notes.match(/\[auto-payment-logged:([a-zA-Z0-9-_]+)\]/);
  let txnId = match ? match[1] : null;

  if (!txnId) {
    const clientNameResult = await sb.from('clients').select('name').eq('id', appt.client_id).single();
    const clientName = clientNameResult.data?.name || 'Client';

    const txnPayload = {
      amount: appt.price || 0,
      type: 'income',
      category: 'Service',
      description: `Payment for ${normalizeServiceName(appt.service)} - ${clientName}`,
      transaction_date: appt.appointment_date || new Date().toISOString()
    };
    const txnResult = await sb.from('transactions').insert(txnPayload).select();
    checkError(txnResult);
    txnId = txnResult.data[0].id;

    const updatedNotes = (notes ? notes + '\n' : '') + `[auto-payment-logged:${txnId}]`;
    await sb.from('appointments').update({ notes: updatedNotes }).eq('id', id);
  }

  const recipe = SERVICE_INVENTORY_USAGE[appt.service];
  if (recipe) {
    for (const [itemName, qtyToDeduct] of Object.entries(recipe)) {
      const itemResult = await sb.from('inventory').select('id, quantity').ilike('name', itemName).limit(1);
      if (!itemResult.error && itemResult.data && itemResult.data.length > 0) {
        const item = itemResult.data[0];
        const newQty = Math.max(0, item.quantity - qtyToDeduct);
        await sb.from('inventory').update({ quantity: newQty }).eq('id', item.id);
      }
    }
    notifyAdminDataChanged('inventory');
  }

  notifyAdminDataChanged('appointments');
  notifyAdminDataChanged('transactions');

  return { appointment: updateResult.data[0], transactionId: txnId };
}

async function saveInventoryItem(item) {
  const payload = {
    name: item.name,
    unit: item.unit,
    quantity: item.quantity,
    usage_per_client: item.usage_per_client,
    low_stock_threshold: item.low_stock_threshold,
    notes: item.notes || null
  };
  let result;
  if (item.id) {
    result = await sb.from('inventory').update(payload).eq('id', item.id).select();
  } else {
    result = await sb.from('inventory').insert(payload).select();
  }
  checkError(result);
  notifyAdminDataChanged('inventory');
  return result.data[0];
}

async function adjustInventoryQuantity(id, delta) {
  const itemResult = await sb.from('inventory').select('quantity').eq('id', id).single();
  checkError(itemResult);
  const newQty = Math.max(0, itemResult.data.quantity + delta);

  const result = await sb.from('inventory').update({ quantity: newQty }).eq('id', id).select();
  checkError(result);
  notifyAdminDataChanged('inventory');
  return result.data[0];
}

async function deleteInventoryItem(id) {
  const result = await sb.from('inventory').delete().eq('id', id).select();
  checkError(result);
  notifyAdminDataChanged('inventory');
}

async function logTransaction(txn) {
  const payload = {
    amount: txn.amount,
    type: txn.type,
    category: txn.category,
    description: txn.description || null,
    transaction_date: txn.transaction_date || new Date().toISOString()
  };
  const result = await sb.from('transactions').insert(payload).select();
  checkError(result);
  notifyAdminDataChanged('transactions');
  return result.data[0];
}

async function deleteTransaction(id) {
  const result = await sb.from('transactions').delete().eq('id', id).select();
  checkError(result);
  notifyAdminDataChanged('transactions');
}

async function resolveReview(id) {
  const result = await sb.from('reviews').update({ resolved: true }).eq('id', id).select();
  checkError(result);
  notifyAdminDataChanged('reviews');
  return result.data[0];
}

async function getDashboardStats() {
  const kpiResult = await sb.from('dashboard_today').select('*').single();
  checkError(kpiResult);
  const leadsResult = await sb.from('leads').select('*', { count: 'exact', head: true });
  checkError(leadsResult);

  const todayIso = new Date().toISOString().slice(0, 10);
  const txResult = await sb.from('transactions').select('amount, type').eq('transaction_date', todayIso);
  checkError(txResult);

  const todayIncome = (txResult.data || [])
    .filter(row => row.type === 'income')
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return {
    kpis: kpiResult.data || {},
    leadsCount: leadsResult.count || 0,
    todayIncome
  };
}

const luxeDb = {
  getDashboardStats,
  getClientsPage,
  getAppointmentsPage,
  getInventoryPage,
  getTransactionsPage,
  getLeadsPage,
  getReviewsPage,
  saveClient,
  deleteClient,
  bookAppointment,
  completeAppointment,
  cancelAppointment,
  updateAppointmentStatus,
  updateAppointmentNote,
  deleteAppointment,
  saveInventoryItem,
  adjustInventoryQuantity,
  deleteInventoryItem,
  logTransaction,
  deleteTransaction,
  deleteLead,
  resolveReview
};

// Expose helpers so each page script can use them.
Object.assign(window, {
  requireAuth,
  renderSidebar,
  luxeDb,
  fmtDateTime,
  fmtDate,
  fmtMoney,
  SERVICE_PRESETS,
  SERVICE_ALIASES,
  TRANSACTION_CATEGORIES,
  TRANSACTION_TYPE_LABELS,
  normalizeServiceName,
  normalizeLocationName,
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
  rememberRecentClient,
  getRecentClientSuggestion,
  notifyAdminDataChanged,
  rememberAdminFlowContext,
  getAdminFlowContext,
  setFormBusy,
  flashFormSuccess,
  escapeHtml,
  setStatus,
  DEV_BYPASS_AUTH,
});
