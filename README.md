# safe-edges

True safe areas for the web on iPhone. Safari on iPhone Duo lays pages out beside a strip of its own controls, on the outer display and in Split View, and reports a safe area inset of 0 on every edge. safe-edges measures what Safari covers and gives pages the whole window with the insets it should have reported.

Planned: true safe areas on standard iPhones as well.

- [`index.html`](index.html): the safe area tester. Real insets, the strip, the bottom toolbar and the strip's empty slot, measured live.
- [`safe-edges.js`](safe-edges.js): widens the page under the strip and publishes the safe areas Safari should have reported.
- [`tailwind/safe-edges.css`](tailwind/safe-edges.css): Tailwind v4 utilities over those values.
- [`examples/`](examples/index.html): three example apps and four single-pattern pages.

## What Safari does

Measured in the iPhone Duo simulator (iOS 27.1) and from device screenshots. Sizes in points.

| Window | Window | Layout viewport | Strip | Bottom toolbar | Slot for page buttons |
|---|---|---|---|---|---|
| Outer display, portrait | 466 × 678 | 382 × 580 | 84, right | 98 | 282–542 |
| Split View, left window | 469 × 669 | 385 × 571 | 84, left | 98 | 132–532 |
| Split View, right window | 469 × 669 | 385 × 571 | 84, right | 98 | 332–532 |

- `env(safe-area-inset-*)` is 0 everywhere, even with `viewport-fit=cover`. The strip is `outerWidth − innerWidth`; the toolbar is `outerHeight − innerHeight`.
- Normal-flow and absolute content is drawn under the strip and the toolbar. `position: fixed` and `sticky` boxes, and the top layer, are clipped to the layout viewport.
- Taps in the strip reach the page but target `<html>`, not the element drawn there.
- A Live Activity in the Dynamic Island pushes Safari's upper strip buttons down by 90 points, and nothing a page can read changes. Two page buttons stacked from the bottom of the slot stay clear of it.
- Outer display landscape is unmeasured.

## safe-edges.js

Load it synchronously in `<head>`, after the viewport meta tag:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<script src="safe-edges.js"></script>
```

Where there is a strip it widens `<html>` to the window, pins horizontal scrolling, and adds `minimum-scale=1` so Split View doesn't shrink the page back. Everywhere else it does nothing and every value falls back to `env()`.

| Custom property | Value |
|---|---|
| `--true-width` | the window's width; `100vw` stays the layout width |
| `--safe-left`, `--safe-right` | `env()` inset plus the strip on that side |
| `--strip-x`, `--strip-width` | the strip's left edge and width |
| `--strip-slot-top`, `--strip-slot-height` | the empty stretch between Safari's buttons |
| `--strip-button-size`, `--strip-button-gap`, `--strip-button-x` | Safari's button metrics, 48 / 12 / 12 or 24 |
| `--toolbar-bottom` | the bottom toolbar's height |
| `--scroll-travel` | the root's scroll range, for `data-follow-scroll` |

It also:

- keeps `[data-follow-scroll]` boxes in place on the root scroll timeline. Use them where a fixed box would be clipped;
- routes taps in the strip to the smallest `[data-strip-tap]` or `.strip-button` element under the finger, marks it `data-pressed`, and clicks it.

API: `SafeEdges.state`, `SafeEdges.update()`, `enable()`, `disable()`, `addLayout({ window, side, slot })`, and a `safeedgeschange` event. Options go on `window.SafeEdges` before the script loads: `side`, `enabled`, `tapSelector`.

## Tailwind

```css
@import "tailwindcss";
@import "./tailwind/safe-edges.css";
```

| Utility | Use |
|---|---|
| `px-safe-N`, `pl-`, `pr-`, `p-`, `pt-`, `pb-safe(-N)` | padding of the safe area plus spacing |
| `bleed-safe-N` | undo a parent's `px-safe-N` for an edge-to-edge child |
| `left-`, `right-`, `top-`, `bottom-`, `inset-x-safe(-N)`, `mx-safe` | offsets and margins |
| `w-true` | the window's width; pair with `@container`, because media queries see the layout width |
| `strip-rail`, `strip-button` | a column of Safari-style buttons in the strip's slot |
| `strip-cover` | a box over the whole strip |
| `follow-scroll` | stays on screen while the page scrolls |
| `under-toolbar`, `pb-toolbar(-N)` | run a scroller or bar under the address bar, keep its end above it |
| `strip:`, `strip-left:`, `strip-right:`, `strip-slot:`, `no-strip:` | variants |

`npm run build` compiles `examples/app.css`.

## Examples

| App | View style | Shows |
|---|---|---|
| [Ratio](examples/reader.html) | document scroll | a masthead that follows the scroll under the strip, full-bleed art, slot buttons in a scrolling page |
| [Messages](examples/messages.html) | app shell | scrollers and a composer under the address bar, slot actions that change per view |
| [Photos](examples/photos.html) | full bleed | a grid that gains a column from the strip, tiles under the strip that open, a full-window viewer |

Each has a **Narrow** / **Wide** link (`?narrow`) to compare with Safari's own layout.
