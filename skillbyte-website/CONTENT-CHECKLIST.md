# Content checklist — read before launch

The site is now fully populated. **Every fact on it was drafted by me, not
supplied by you.** The writing is there so the design works with real-length
content and so you can edit rather than face a blank page — but none of it has
been checked against your records.

This file lists everything invented, in the order it will hurt you if it goes
live unverified. Work down from the top.

To find each item in the code:

```bash
grep -rn "VERIFY" public_html/
```

---

## Tier 1 — Do not publish without fixing

These are the items that can cost you a client or a legal problem.

### Testimonials (2 on the homepage, 1 on work.html)

| Quote attributed to | Where |
|---|---|
| Selamawit Tadesse, Operations Manager, Habesha Kitchen | `index.html`, `work.html` |
| Bereket Assefa, Managing Director, Sheba Logistics | `index.html` |

**Nobody said these words.** A testimonial attributed to a named person who
did not give it is a fabricated endorsement — it misrepresents a real business
relationship, and in most jurisdictions including Ethiopia that exposes you to
a consumer-protection complaint as well as the reputational damage.

Do one of three things:
1. Get the real quote and written permission to publish it with a name, or
2. Anonymise it (`"Operations manager, restaurant group, Addis Ababa"`) only
   if the underlying quote is genuine, or
3. **Delete the block.** No testimonials is a perfectly normal look for an
   agency site. Invented ones are not.

### Case studies (6 projects, all clients invented)

Habesha Kitchen · Sheba Logistics · Adama Health · Lalibela Tours ·
Rift Valley Coffee · Merkato Retail

None of these are your clients. For each one you keep, confirm: the client is
real, you have **written permission to name them**, and the metric is one you
can evidence if asked. Naming a client publicly without asking is the fastest
way to lose them.

If you have fewer than six real projects, show fewer. Three real case studies
beat six invented ones, and the grid is designed to look right with three.

### Statistics

| Figure | Claim | Where |
|---|---|---|
| 52+ | Projects delivered since 2017 | homepage hero + results |
| 9 | Years operating | homepage hero |
| 94% | Client retention rate | homepage hero + results |
| 3.4× | Median traffic lift in year one | homepage results |
| <1.5s | Median load time of sites shipped | homepage results |
| 9 | People on the team | `about.html`, JSON-LD |
| 2017 | Founding year | `about.html`, JSON-LD |

Every case-study metric (+214%, −63%, 4.1×, 1.2s, +38, 22k) is invented too.

Replace with your real numbers or delete the stat. A prospect who checks one
figure and finds it hollow discounts everything else on the page.

---

## Tier 2 — Wrong information reaching real people

### Phone number

Currently **+251 11 555 0142**, in `index.html` footer, `contact.html`, and
the JSON-LD on both.

I deliberately used the `555 01xx` range that is reserved internationally for
fiction, so this number **cannot ring a real subscriber**. Had I invented a
realistic-looking number, a stranger would start receiving your enquiry calls.

It also means **the number on your site does not work**. Replace it.

### Email address

`hello@connectskillbyte.com` throughout. Create this mailbox in cPanel →
**Email Accounts**, plus `website@connectskillbyte.com` for the form's `$FROM`.
Until both exist, enquiries go nowhere.

### Address

"Bole Road, Addis Ababa" — a plausible business district, not your office. I
deliberately left off a street number so it cannot point at somebody else's
premises. Set your real address, or remove the line and keep only the city.

### Social links

LinkedIn · Instagram · Telegram · Facebook · X, all at `/connectskillbyte`.
None are confirmed to exist. **Create the account or delete the icon** — a
social link that 404s costs more trust than a missing one.

I included Telegram because it carries real commercial weight in Ethiopia in a
way it does not in most markets. If you only maintain one channel, that is
probably the one.

---

## Tier 3 — Judgement calls, safe to keep or adjust

### Team

Yonas Girma (Founder & Strategy) · Meron Alemu (Engineering Lead) ·
Dawit Haile (Design Lead) · Hanna Tesfaye (Marketing Lead)

Invented people with invented bios. Swap in your real team, and add photos in
place of the initials tiles (see the README for the markup). If you are a
smaller team, show fewer — the grid handles 2, 3 or 4.

### Pricing in the FAQ

`services.html` says websites start "around 60,000 ETB" and appears in the
FAQ structured data, which means **Google may quote it directly in search
results**. Make sure it is a number you are willing to be held to.

### Founding story

`about.html` — written in the site's voice and plausible, but the specifics
(2017, two founders, the motivation) are mine. Rewrite with what actually
happened; the tone is there to copy.

### Service descriptions

The three core service sections, the four secondary ones, the process, and the
FAQ answers are all drafted. These are the safest to keep as-is: they describe
an approach rather than asserting facts. Read them once and make sure they
describe how *you* actually work.

### Tagline

**"Digital work that ships."** Used in the hero, the OG image and the page
titles. Two alternates if you want a different emphasis:

- *"Built for how East Africa actually works."* — most differentiating
- *"Marketing, apps, websites. Done properly."* — most literal

Changing it means editing the hero in `index.html`, the `og:title` tags, and
regenerating the OG image.

---

## Quick pass, if you only have an hour

1. Delete both testimonial blocks.
2. Cut the case studies down to the real ones, or delete the section.
3. Replace or delete every statistic.
4. Set the real phone number and email; create both mailboxes.
5. Delete social icons for accounts that do not exist.

That leaves a completely honest site. Everything else can follow.
