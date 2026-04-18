# /components/

Drop-in HTML snippets for reusing the Luxe Wax Spa design system on a new local-business site.

These are **copy-paste templates**, not a build system. The stack is pure static HTML — there is no includes engine. To reuse:

1. Copy the snippet body into the target page at the correct spot.
2. Find-and-replace the `{{PLACEHOLDERS}}` (listed at the top of each file) with the new business's values.
3. Keep the CSS tokens in `/assets/css/theme.css` as the single source of truth for colors/typography.

## Files

| File | Purpose |
|------|---------|
| `head-boilerplate.html` | `<head>` block: meta, OG, JSON-LD, fonts, canonical |
| `nav.html` | Top nav with 3-state dark-hero pattern + mobile hamburger |
| `footer.html` | Footer with linked service-area cities + studio info |
| `cta-strip.html` | Dark slate "Ready to book" strip with booking CTA |
| `lead-capture-form.html` | Supabase-ready quote request form (name, phone, email, service, location, message) |
| `service-card.html` | Pricing card used on `services.html` |

## Placeholder conventions

```
{{BUSINESS_NAME}}        Luxe Wax Spa
{{BUSINESS_TAGLINE}}     Premium waxing studio
{{BUSINESS_CITY}}        Newtown
{{BUSINESS_STATE}}       CT
{{BUSINESS_ADDRESS}}     125b S Main St f
{{BUSINESS_POSTAL}}      06470
{{BUSINESS_LAT}}         41.4143
{{BUSINESS_LNG}}         -73.2954
{{BUSINESS_URL}}         https://luxewaxspa.netlify.app
{{BOOKING_URL}}          https://www.vagaro.com/luxewaxspa/services
{{INSTAGRAM_URL}}        https://www.instagram.com/luxewaxspact
{{BUSINESS_EMAIL}}       hello@luxewaxspa.com
{{BUSINESS_PHONE}}       (203) 555-0100
{{OWNER_NAME}}           Cida
{{OWNER_TITLE}}          Licensed Esthetician
{{PAGE_TITLE}}           <= 55 chars including business name
{{PAGE_DESCRIPTION}}     <= 160 chars
{{CANONICAL_PATH}}       /contact.html
```

See `/lead-structure.html` and `/system-overview.html` (internal) for how these snippets wire into Supabase + Slack.
