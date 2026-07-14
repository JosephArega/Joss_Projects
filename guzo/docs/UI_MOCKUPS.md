# ጉዞ (Guzo) — Screen-by-Screen UI Mockups

> Interactive visual mockups: open [`docs/mockups.html`](./mockups.html) in a browser.
> Palette: deep green `#0E7A52` + amber `#FFB300` on near-black green `#0C120F` —
> dark-first for sunlight glare and night driving. All tap targets ≥ 48 dp.

---

## 1. Home Map (default screen)

```
┌─────────────────────────────────┐
│ ጉዞ                        [ አማ ]│  ← brand + language toggle (overlay)
│ (ALL)(🚗 Traffic)(👮 Police)(🚧…│  ← horizontal filter chips
│                                 │
│        ● 👮        ● 🚗⭐        │  ← color-coded pins; amber ring =
│    D A R K   M A P              │    3+ confirmations (high priority)
│         ● 💥                    │
│              ▲ you              │
│         ● 🌊                    │
│                                 │
│        ┌───────────────┐        │
│        │  ＋  ሪፖርት      │        │  ← amber FAB, one-thumb reach
│        └───────────────┘        │
├─────────────────────────────────┤
│  🗺 ካርታ   💬 ምክሮች  🧭 መንገድ  ⚙ │  ← bottom tabs
└─────────────────────────────────┘
```

- Map centered on Meskel Square, OSM tiles (CartoDB dark variant when
  "dark map" is on).
- Pins are 40 dp colored circles with the type emoji; timestamp and
  details show on tap. Reports fade out automatically when `expires_at`
  passes (30 min base, +20 min per confirmation).
- Long-press anywhere on the map to file a report *at that spot* instead
  of your GPS position.
- Offline: an amber "ከመስመር ውጭ / Offline — showing saved reports" badge
  appears and the last cached feed renders.

## 2. Report Modal (bottom sheet)

```
┌─────────────────────────────────┐
│         (map dimmed)            │
│╭───────────────────────────────╮│
││ ━━                            ││  ← drag handle
││ መንገዱ ላይ ምን አለ?               ││  ← "What's on the road?"
││ ┌──────────────┬─────────────┐││
││ │ 🚗 መጨናነቅ    │ 👮 ፖሊስ      │││   8 quick-tap types,
││ ├──────────────┼─────────────┤││   2-column grid,
││ │ 🚧 ዝግ መንገድ  │ 🕳️ ጉድጓድ     │││   64 dp min height
││ ├──────────────┼─────────────┤││
││ │ 🌊 ጎርፍ       │ 💥 አደጋ      │││
││ ├──────────────┼─────────────┤││
││ │ ⛽ ወረፋ       │ 💬 ምክር      │││
││ └──────────────┴─────────────┘││
││ [ ማስታወሻ ይጨምሩ (አማራጭ)……… ] ││  ← note (required for 💬 tip)
││ 📍 አሁን ባሉበት ቦታ ተመልክቷል       ││
││ ┌───────────────────────────┐ ││
││ │        ሪፖርት ላክ           │ ││  ← amber submit
││ └───────────────────────────┘ ││
│╰───────────────────────────────╯│
└─────────────────────────────────┘
```

Two taps to report: pick a type → send. Anonymous by default.

## 3. Report Detail / Verification card

```
│╭───────────────────────────────╮│
││ 👮 የትራፊክ ፖሊስ              ✕ ││
││ Bole Medhanealem · ከ12 ደቂቃ በፊት ││
││ [⭐ በማህበረሰቡ የተረጋገጠ]          ││  ← shown at 3+ confirmations
││ "Checking bolo and seatbelts" ││
││ 3 አረጋግጠዋል                    ││
││ ┌────────────┐ ┌────────────┐ ││
││ │ ✓ አሁንም አለ │ │ ✗ የለም      │ ││  ← confirm (green) / dismiss
││ └────────────┘ └────────────┘ ││
│╰───────────────────────────────╯│
```

## 4. Tips Feed (chat board)

```
┌─────────────────────────────────┐
│ የአሽከርካሪ ምክሮች                  │
│ (ሁሉም)(ቦሌ)(ካዛንቺስ)(መርካቶ)(ፒያሳ)…│  ← neighborhood chips
│ ┌─────────────────────────────┐ │
│ │ Bole road one-way after 6pm │ │
│ │ 📍 Bole · 45m ago · AbebeT  │▲14│
│ ├─────────────────────────────┤ │
│ │ መገናኛ ከ11 ሰዓት በኋላ ይጨናነቃል │ │
│ │ 📍 Megenagna · 1h · ሾፌርX    │▲9 │
│ └─────────────────────────────┘ │
│ (ቦሌ)(መርካቶ)…                    │  ← geotag picker
│ [ ምክር ያካፍሉ… ]        [ ለጥፍ ]  │  ← composer
└─────────────────────────────────┘
```

## 5. Route Advisory

```
┌─────────────────────────────────┐
│ የመንገድ ምክር                      │
│ ወዴት እየሄዱ ነው?                   │
│ 📍 አሁን ካሉበት ቦታ                 │
│ [ 🔍 መዳረሻ ይፈልጉ (ቦሌ፣ መርካቶ…) ]│
│ ┌─────────────────────────────┐ │
│ │ → CMC                       │ │
│ │ ⚠ በመንገድዎ ላይ 2 ሪፖርቶች አሉ    │ │  ← amber warning card
│ ├─────────────────────────────┤ │    (green "clear" card when 0)
│ │ 🚗 መጨናነቅ · Megenagna        │ │
│ │    ከ6 ደቂቃ በፊት · ከእርስዎ 2.1 ኪ.ሜ│ │
│ │ 🕳️ ጉድጓድ · CMC · 4.8 ኪ.ሜ     │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

## 6. Settings

```
┌─────────────────────────────────┐
│ ቅንብሮች                          │
│ ቋንቋ        (English) (አማርኛ)   │
│ የቀን አቆጣጠር (ጎርጎርያን) (ዓ.ም.)     │
│   ዛሬ፦ ሐምሌ 7, 2018 ዓ.ም.        │
│ ጨለማ ካርታ                 [ON] │
│ የአቅራቢያ ማንቂያዎች           [ON] │
│   አዲስ ሪፖርት በ2 ኪ.ሜ ውስጥ ሲኖር    │
│   (1 km)(2 km)(5 km)            │
│ ── የአሽከርካሪ መገለጫ (አማራጭ) ──   │
│ [ ቅጽል ስም ]                     │
│ (መኪና)(ሚኒባስ)(ታክሲ)(ባጃጅ)…     │
│ የታማኝነት ነጥብ: 0                │
└─────────────────────────────────┘
```

## App icon

`assets/icon.svg` — green steering wheel with a five-pointed amber
Ethiopian star as the hub, on the dark background. Export at
1024×1024 PNG for `app.json`.
