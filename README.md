# Luxe Wax Spa — Website

## Project Structure
```
luxe-wax-spa/
├── index.html        ← Homepage
├── services.html     ← (to build) Full pricing page
├── about.html        ← (to build) About Cida
├── contact.html      ← (to build) Contact + map
├── netlify.toml      ← Netlify deploy config
├── images/           ← Drop your photos here
└── README.md         ← You're reading this
```

## How to Swap Placeholder Images

1. Drop your photos into the `images/` folder
2. In `index.html`, search for `SWAP` comments
3. Replace the Unsplash URL with your local path, e.g.:
   - Before: `src="https://images.unsplash.com/photo-abc..."`
   - After:  `src="images/hero-photo.jpg"`

## Photo Checklist (what you need)
- [ ] Hero portrait/treatment shot (main large image)
- [ ] Second detail shot (floats over hero)
- [ ] Suite/space interior (2-3 angles)
- [ ] Brow/face treatment close-up
- [ ] Lash treatment photo
- [ ] Body waxing (hands working, products, etc.)
- [ ] Portrait of Cida (professional headshot or working)
- [ ] Second Cida photo (candid/working)

## Deploy to Netlify
1. Go to https://app.netlify.com
2. Drag the entire `luxe-wax-spa` folder onto the page
3. Done — you'll get a live URL instantly

## Tech Stack
- Pure HTML/CSS/JS (no frameworks, no build step)
- Google Fonts: Playfair Display + DM Sans
- SEO: Schema markup, meta tags, local keyword targeting
- Responsive: works on mobile, tablet, desktop
