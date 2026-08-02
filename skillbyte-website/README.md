# SkillByte — connectskillbyte.com

Static website for SkillByte Digital Consultancy. Built as plain HTML, CSS and
JavaScript with a PHP contact handler, so it drops straight into cPanel with
**no build step, no Node.js, and nothing to install**.

You can edit any file directly in cPanel's File Manager and the change is live
on save.

---

## 1. Deploying to cPanel

### First deployment

1. Log in to cPanel → **File Manager** → open `public_html`.
2. Delete anything already in there (or move it to a backup folder first).
3. Upload **everything inside the `public_html/` folder of this repo** — not the
   folder itself. When you are done, `index.html` must sit at the top level of
   `public_html`, not inside a subfolder.

   The fastest route is to zip the *contents* locally, upload the single zip,
   then use File Manager's **Extract**.

4. Confirm hidden files came across. In File Manager, click **Settings** (top
   right) and tick **Show Hidden Files (dotfiles)**. You should see
   `.htaccess`. If it is missing, the site still works but you lose
   compression, caching and the custom 404 page.

5. Visit `https://connectskillbyte.com`. Done.

### What the finished structure looks like

```
public_html/
├── index.html              Home
├── services.html           Services
├── work.html               Work / case studies
├── about.html              About
├── contact.html            Contact (form)
├── thank-you.html          Shown after a no-JavaScript form submit
├── 404.html                Custom not-found page
├── styleguide.html         Design system reference — safe to delete
├── contact-handler.php     Processes the contact form
├── .htaccess               Compression, caching, security headers
├── robots.txt
├── sitemap.xml
├── site.webmanifest
└── assets/
    ├── css/                tokens · base · components · sections
    ├── js/app.js
    ├── fonts/              Bricolage Grotesque + Inter (variable, subsetted)
    └── img/                favicon, OG image, touch icon
```

### Updating the site later

Edit the file and re-upload it. HTML is served with `no-cache`, so content
changes appear immediately.

CSS and JS are cached for a year for speed. **If you change a CSS or JS file,
add or bump a version marker on its tag** in every HTML page, or returning
visitors will keep the old version:

```html
<link rel="stylesheet" href="assets/css/components.css?v=2">
<script src="assets/js/app.js?v=2" defer></script>
```

---

## 2. Turn on HTTPS (do this before launch)

1. cPanel → **Security** → **SSL/TLS Status** → select the domain → **Run
   AutoSSL**. Wait for the certificate to issue.
2. Load `https://connectskillbyte.com` and confirm the padlock appears.
3. **Only then**, open `.htaccess` and uncomment the *Force HTTPS* block near
   the top (remove the leading `#` from those lines).

Uncommenting it before the certificate exists makes the site unreachable.

---

## 3. Making the contact form work

Open `contact-handler.php` and edit the config block at the top:

```php
$TO   = 'hello@connectskillbyte.com';   // where enquiries are delivered
$FROM = 'website@connectskillbyte.com'; // MUST be an address on your domain
```

**`$FROM` must be an address on connectskillbyte.com.** Create it in cPanel →
**Email Accounts** first. If you set `$FROM` to a Gmail address, or to the
visitor's own address, your host's mail server will fail SPF checks and the
enquiries will land in spam or bounce silently. The visitor's address goes in
`Reply-To`, so hitting reply in your inbox still writes to them.

### Test it

Submit the form on the live site, then check the inbox for `$TO` — including
the spam folder. If nothing arrives:

- Confirm `$FROM` exists as a real mailbox on the domain.
- Check cPanel → **Track Delivery** to see what happened to the message.
- Some shared hosts disable PHP's `mail()`. If yours has, the fix is SMTP
  rather than `mail()` — tell me and I will swap the handler over.

### Spam protection already in place

| Layer | What it does |
|---|---|
| Honeypot field | Hidden input that only bots fill in |
| Time trap | Rejects anything submitted within 2 seconds |
| Rate limit | Max 5 submissions per IP address per hour |
| Link ceiling | Messages containing 5+ links are dropped |
| Server-side validation | Every field re-checked on the server |
| Header sanitisation | Blocks email header injection |

Bots get a *success* message rather than an error, so they receive no signal
to adapt to. To change the rate limit, edit `$RATE_LIMIT`.

### Keeping a local copy of enquiries

Set `$KEEP_LOG = true;`. The log is written **outside** `public_html` so it is
not publicly readable. Only enable this if you have a reason to — it stores
visitors' personal details on the server.

---

## 4. Things to replace before launch

Every placeholder is marked with a `SWAP-ME` comment. To find them all:

```bash
grep -rn "SWAP-ME" public_html/
```

In cPanel File Manager, use the search box and search for `SWAP-ME`.

### Must change

| What | Where | Notes |
|---|---|---|
| **Phone number** | every page footer, `contact.html`, JSON-LD in `index.html` | currently `+251 00 000 0000` |
| **Email address** | as above | currently `hello@connectskillbyte.com` |
| **Social media links** | footer of every page | LinkedIn, Instagram, X |
| **Statistics** | `index.html` hero and results section | see the warning below |
| **Case studies** | `work.html`, `index.html` | six placeholder projects |
| **Testimonials** | `index.html`, `work.html` | attributed to "Sample Person" |
| **Team** | `about.html` | four placeholder cards |
| **Founding story** | `about.html` | drafted in the right tone, needs the real facts |
| **Pricing in the FAQ** | `services.html` | the ETB figures are illustrative |

> **A word on the statistics.** The numbers currently on the site — 48+
> projects, 3.4× traffic lift, 96% retention, and every case study metric —
> are invented to show the layout. Placeholder numbers are the one kind of
> placeholder that can genuinely damage you: a prospect who discovers a
> fabricated statistic is gone, and in a market where reputation travels by
> word of mouth that is expensive. Replace them with real figures, or delete
> the sections until you have them. An honest "we are new" beats an
> impressive number you cannot stand behind.

### Adding real images

The case study and team cards use generated placeholder artwork rather than
grey boxes. To use a real photo, replace the placeholder block:

```html
<!-- before -->
<div class="work-card__placeholder" style="--ph-tint: var(--flare-500);" role="img" aria-label="...">
  <span>Habesha<br>Kitchen</span>
</div>

<!-- after -->
<img src="assets/img/work/habesha-kitchen.webp"
     alt="The Habesha Kitchen checkout screen on a phone"
     width="800" height="500" loading="lazy">
```

Use WebP, keep images under ~200KB, and always write real `alt` text
describing what is in the image — not "image" or the company name again.

---

## 5. Design system

Open `styleguide.html` in a browser (e.g.
`https://connectskillbyte.com/styleguide.html`) for the full reference:
colour ramps, contrast rules, type scale, components and motion. It carries a
`noindex` tag so search engines skip it. Delete it any time — nothing else
depends on it.

### Changing the brand colours

Everything flows from `assets/css/tokens.css`. Change a value there and it
updates across both themes site-wide.

The one rule worth knowing: **each colour ramp splits by job.** The bright
`500` shades are for button fills, icons and very large display type. The
darker `700` shades (and `300` in dark mode) are for text. Bright orange on
white measures 3.1:1 — fine for a headline, illegal for body copy. That split
is what lets the palette stay this vibrant and still pass accessibility checks.

### Light and dark mode

Both are built from the same semantic tokens, so they stay in sync. The
visitor's choice is remembered in their browser, and the site follows their
system setting until they choose explicitly.

---

## 6. Performance and accessibility

Measured on this build:

- **9 requests, ~157KB transferred** for the homepage (8KB HTML, 19KB CSS,
  6KB JS gzipped, 125KB fonts).
- **Zero third-party requests.** Fonts are self-hosted, so there is no round
  trip to Google before text renders — which matters on East African mobile
  networks.
- **Zero accessibility violations** across all 7 pages in both light and dark
  mode (axe-core, WCAG 2.1 A + AA + best-practice).
- **No horizontal scrolling** at any width from 320px to 1920px.
- Keyboard navigable end to end, with a visible focus ring on every stop.
- All motion respects `prefers-reduced-motion`.

### If you add Google Analytics or a Meta Pixel

`.htaccess` sets a strict Content-Security-Policy that blocks all third-party
scripts. **Any tracking snippet you paste in will silently fail until you
allow its domain.** Add the vendor's domain to `script-src` and `connect-src`
in the CSP header, or comment the header out while you work it out.

This is deliberate: it means an injected script cannot phone home either.

---

## 7. Known limitations

- **No CMS.** Content changes mean editing HTML. That is the trade for zero
  build tooling and a site you can fix from a phone. If you want a blog or a
  news section that non-technical staff can update, that is the next phase —
  WordPress in a subdirectory or a small PHP include system both work here.
- **The header and footer are repeated in each HTML file.** Change one, change
  them all (there are 7). A PHP include would fix this if you would rather
  trade `.html` extensions for `.php`.
- **Blog is not built.** Flagged in the original brief as a future phase.

---

## 8. Local preview

Anything that serves static files works for the pages:

```bash
cd public_html
python3 -m http.server 8000
```

To test the **contact form** you need PHP:

```bash
cd public_html
php -S localhost:8000
```

Then open `http://localhost:8000`. Note that `mail()` will not deliver from a
local machine — the form will report a send failure, which is expected. Test
the real thing on the live server.
