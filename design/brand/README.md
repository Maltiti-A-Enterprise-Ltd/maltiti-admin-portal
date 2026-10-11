# Brand artwork

Source files for the app icons. **Not served** — they live here rather than
in `public/` so the 1.2 MB master does not ship to every visitor and get
prefetched into the PWA cache.

`Artboard 1@3x-100.jpg` (2100×2100) is the master the current icons were
generated from. Its artwork occupies a bounding box of 923×1116 at (575, 407).

## Regenerating the icons

Icons live at the root of `public/` and are referenced by `site.webmanifest`
and `src/index.html`:

| File | Purpose | Artwork fills |
| --- | --- | --- |
| `android-chrome-192x192.png`, `android-chrome-512x512.png` | `any` | 86% |
| `maskable-192x192.png`, `maskable-512x512.png` | `maskable` | 61.6% |
| `apple-touch-icon.png` (180) | iOS home screen | 82% |

The two purposes are **not** interchangeable. A `maskable` icon is cropped by
the launcher to a circle or squircle, and only the central 80% survives; the
artwork must therefore sit inside that circle. Pointing `maskable` at the
edge-to-edge `any` icons is what previously cut the "ENTERPRISE LTD." line and
the sides of the tree off the installed icon.

For a portrait bounding box the circle-safe fill is
`0.8 / sqrt(1 + (w/h)^2)` — 61.6% for this artwork. Verify any replacement by
counting ink pixels outside a circle of 80% diameter: it must be zero.
