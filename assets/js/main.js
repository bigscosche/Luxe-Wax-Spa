/* ──────────────────────────────────────────────────────────────
   SHARED SCRIPTS — nav scroll, mobile menu, reveal observer,
   lead-capture submit handler (Supabase-ready).
   Each page still inlines its own <script> today for zero-dependency
   deployment; this file is the reference canonical version used when
   porting to a new business.
   ────────────────────────────────────────────────────────────── */

(function initNavScroll() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

(function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');
  if (!hamburger || !navLinks) return;
  hamburger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(open));
  });
  navLinks.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    })
  );
})();

(function initReveal() {
  const nodes = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || !nodes.length) {
    nodes.forEach(n => n.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  nodes.forEach(n => obs.observe(n));
})();

(function initFooterYear() {
  const el = document.getElementById('footerYear');
  if (el) el.textContent = new Date().getFullYear();
})();

/* ──────────────────────────────────────────────────────────────
   LEAD CAPTURE — wires up <form data-form="lead-capture">
   Frontend-only today. Swap the TODO below for a real submit.

   Recommended backend: Netlify Function that
     1) inserts into Supabase `leads` table, and
     2) posts a formatted message to a Slack incoming webhook.

   Env vars (set in Netlify dashboard, never commit):
     SUPABASE_URL, SUPABASE_SERVICE_KEY, SLACK_WEBHOOK_URL
   ────────────────────────────────────────────────────────────── */
(function initLeadForm() {
  const form = document.querySelector('form[data-form="lead-capture"]');
  if (!form) return;

  const status = form.querySelector('.form-status');
  const button = form.querySelector('.form-submit');
  const errorMessages = {
    rate_limited: "Looks like this email just sent a note. Please wait an hour or book online directly.",
    invalid_email: "That email doesn't look right — please double-check and try again.",
    server_misconfigured: "The booking system is being updated. Please book online via Vagaro for now.",
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const payload = Object.fromEntries(new FormData(form));
    payload.source    = window.location.pathname;
    payload.submitted = new Date().toISOString();

    button.disabled = true;
    button.textContent = 'Sending…';
    status.textContent = '';
    status.className = 'form-status';

    try {
      const res = await fetch('/.netlify/functions/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.ok === false) {
        const code = body.error || 'submit_failed';
        throw new Error(code);
      }

      form.reset();
      status.textContent = "Thanks — your note is in. Cida will reply within one business day.";
      status.className = 'form-status is-success';
    } catch (err) {
      const msg = errorMessages[err.message]
        || "Something went wrong. Please try again or book online directly.";
      status.textContent = msg;
      status.className = 'form-status is-error';
    } finally {
      button.disabled = false;
      button.textContent = 'Send Note ↗';
    }
  });
})();

(function initMobileStickyBar() {
  const bar = document.getElementById('mobileStickyBar');
  if (!bar) return;
  const onScroll = () => {
    bar.classList.toggle('visible', window.scrollY > 200);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

