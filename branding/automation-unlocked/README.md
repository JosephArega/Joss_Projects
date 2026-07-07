# Automation Unlocked — Brand Kit

Dark-neon tech branding for the "Automation Unlocked" YouTube channel.

## Palette
- Background: `#0B0F1A`
- Primary gradient: `#3B82F6` → `#8B5CF6`
- Secondary accent (cyan): `#22D3EE`
- Text: `#F5F7FA`
- Font: Poppins (Regular/Medium/SemiBold/Bold)

## Logo concept
Abstract padlock rendered as a geometric shape; the shackle opens on one side
into a lightning bolt, signaling "unlocked" + "automation/speed". Housed in a
rounded-square badge so it reads cleanly as a small avatar (verified legible
at YouTube's 98x98px display size).

## Exports (`exports/`)
| File | Size | Use |
| --- | --- | --- |
| `channel-icon-800x800.png` | 800x800 | YouTube channel icon / profile picture |
| `logo-horizontal-lockup-1600x440.png` | 1600x440 | Full lockup (icon + wordmark + tagline) on dark bg, for video intros/outros |
| `logo-horizontal-lockup-transparent-1600x440.png` | 1600x440, alpha | Same lockup with transparent canvas, for overlaying on dark video footage |
| `channel-banner-2560x1440.png` | 2560x1440 | YouTube channel art; content is centered inside the 1546x423 cross-device safe area |
| `thumbnail-template-1280x720.png` | 1280x720 | Reusable thumbnail template (gradient accent bar, bold headline placeholder, bottom-corner wordmark) for the 24-video series |

## Source (`source/`)
Self-contained HTML/SVG source for each asset (`icon.html`, `lockup.html`,
`lockup-transparent.html`, `banner.html`, `thumbnail.html`) plus the shared
`poppins-embed.css` font kit. Open any file in a browser and edit the inline
SVG/CSS to produce new variants (e.g. swap the thumbnail headline text for
each of the 24 videos), then re-render to PNG at the target canvas size.

Handle to register: `@AutomationUnlocked` (fallback `@AutomationUnlockedAI` /
`@AutomationUnlockedYT` if taken).
