# SkillByte — Website Redesign (Three.js edition)

A complete, immersive redesign of **connectskillbyte.com**, rebuilt from scratch with
a WebGL-first dark aesthetic: a site-wide Three.js particle field, a live 3D hero
centerpiece, a cohesive design system, smooth motion, accessibility, and full
responsiveness.

> **Note on content:** the live site blocks automated access (HTTP 403), so the
> copy here is a faithful, recruiter/IT-services positioning of the SkillByte brand
> ("connect skilled tech talent"). All wording is placeholder-ready — swap in the
> real copy, logos, and contact details when available.

## Pages

| Page | File | Highlights |
|------|------|-----------|
| Home | `index.html` | Live Three.js hero (glowing icosahedron, orbit rings, satellites), services grid, why-us split, process, stats, testimonials, tech marquee, CTA |
| Services | `services.html` | Six service practices with alternating feature splits + dashboards |
| About | `about.html` | Mission, values grid, stats, leadership team |
| Contact | `contact.html` | Validated contact form (demo), contact info, FAQ accordion |

## Three.js (WebGL)

`assets/js/three-scene.js` renders two scenes, loaded as an ES module from the
jsDelivr CDN (`three@0.160.0`) via an import map — still zero build step:

- **Background field (all pages):** three layered glowing particle clouds + a deep
  wireframe icosahedron, with mouse parallax and scroll drift, rendered into the
  fixed `#bg-canvas` behind the page.
- **Hero centerpiece (home):** a metallic flat-shaded icosahedron core inside a
  glowing wireframe shell with vertex nodes, two orbit rings with riding
  satellites, a particle halo, violet/cyan point lights, mouse tilt, scroll-driven
  rotation, and a floating idle motion.

Performance & resilience: device pixel ratio capped at 2, the render loop pauses
when the tab is hidden, `prefers-reduced-motion` gets a single static frame, and
if WebGL is unavailable the CSS gradients carry the design on their own.

## Design system

- **Type:** Sora (display) + Inter (body) via Google Fonts
- **Color:** immersive dark ink theme with electric violet (`#7c4dff`) → cyan (`#22d3ee`) brand gradient, glassy translucent surfaces, glow accents
- **Tokens:** all colors, radii, shadows, spacing, and motion easing live as CSS custom properties in `assets/css/styles.css`
- **Components:** buttons, glass cards, stats, testimonials, marquee, FAQ accordion, forms, footer
- **Motion:** WebGL scenes + scroll-reveal (IntersectionObserver), animated number counters, floating glass chips, infinite tech marquee — all respect `prefers-reduced-motion`
- **Responsive:** fluid type with `clamp()`, mobile nav drawer, single-column collapse
- **A11y:** semantic landmarks, focus-visible styles, ARIA on interactive elements, keyboard-friendly accordion/menu, canvases marked `aria-hidden`

## Tech

Zero build step. Pure HTML, CSS, vanilla JS (`assets/js/main.js`), and Three.js
from CDN (`assets/js/three-scene.js`). Serve the folder statically.

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
    └── js/
        ├── main.js          # UI interactions (nav, reveals, counters, FAQ, form)
        └── three-scene.js   # WebGL scenes (background field + hero centerpiece)
```

> Note: the 3D scenes load Three.js from the jsDelivr CDN, so the site needs
> internet access at view time (fine for any normal hosting, including cPanel).
