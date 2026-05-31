# SkillByte — Website Redesign

A complete, modern redesign of **connectskillbyte.com**, rebuilt from scratch with
a focus on UI/UX: a cohesive design system, strong visual hierarchy, smooth motion,
accessibility, and full responsiveness.

> **Note on content:** the live site blocks automated access (HTTP 403), so the
> copy here is a faithful, recruiter/IT-services positioning of the SkillByte brand
> ("connect skilled tech talent"). All wording is placeholder-ready — swap in the
> real copy, logos, and contact details when available.

## Pages

| Page | File | Highlights |
|------|------|-----------|
| Home | `index.html` | Hero with animated glass cards, services grid, why-us split, process, stats, testimonials, tech marquee, CTA |
| Services | `services.html` | Six service practices with alternating feature splits + dashboards |
| About | `about.html` | Mission, values grid, stats, leadership team |
| Contact | `contact.html` | Validated contact form (demo), contact info, FAQ accordion |

## Design system

- **Type:** Sora (display) + Inter (body) via Google Fonts
- **Color:** electric violet (`#6d28d9`) → cyan (`#06b6d4`) brand gradient, slate neutrals, deep-ink dark sections
- **Tokens:** all colors, radii, shadows, spacing, and motion easing live as CSS custom properties in `assets/css/styles.css`
- **Components:** buttons, cards, glass panels, stats, testimonials, marquee, FAQ accordion, forms, footer
- **Motion:** scroll-reveal (IntersectionObserver), animated number counters, floating hero cards, infinite tech marquee — all respect `prefers-reduced-motion`
- **Responsive:** fluid type with `clamp()`, mobile nav drawer, single-column collapse
- **A11y:** semantic landmarks, focus-visible styles, ARIA on interactive elements, keyboard-friendly accordion/menu

## Tech

Zero build step. Pure HTML, CSS, and a single vanilla-JS file (`assets/js/main.js`).
Just open `index.html` in a browser, or serve the folder statically.

```bash
# optional local preview
cd skillbyte-website
python3 -m http.server 8080
# → http://localhost:8080
```

## Structure

```
skillbyte-website/
├── index.html
├── services.html
├── about.html
├── contact.html
├── README.md
└── assets/
    ├── css/styles.css
    └── js/main.js
```
