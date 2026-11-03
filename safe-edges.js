/*
 * safe-edges.js
 *
 * Gives a page the full window width where Safari lays the page out beside a
 * strip of its own controls instead of under them, and publishes the
 * horizontal safe areas that strip should have produced.
 *
 * Where this applies (iOS 27.1):
 *   - iPhone Duo outer display: the window is 466pt wide in portrait, Safari
 *     lays pages out 382 CSS px wide and keeps an 84pt control strip on the
 *     right. env(safe-area-inset-*) reports 0 on every edge, even with
 *     viewport-fit=cover.
 *   - iPhone Duo inner display in Split View: each window is 469pt wide,
 *     Safari lays pages out 385 CSS px wide, and the 84pt strip sits on the
 *     outer edge of the window's half: left for the left window, right for
 *     the right one (from a screenshot on the device, landscape).
 * Everywhere else, outerWidth equals innerWidth and this does nothing.
 *
 * How it works: the strip is the difference between the window width
 * (outerWidth, points) and the layout viewport (innerWidth, CSS px). Making the
 * root element that much wider than the layout viewport lets normal-flow and
 * absolutely positioned content paint under the strip, and Safari draws its
 * controls on top. Horizontal scrolling is pinned so the page doesn't slide
 * sideways into the extra width.
 *
 * What it can't change: position: fixed and position: sticky boxes are clipped
 * to the layout viewport, so they always stop at the strip. For a header that
 * spans the full width, use an app shell: a non-scrolling root with an
 * absolutely positioned header and an inner scroller, all var(--true-width)
 * wide.
 *
 * In Split View Safari shrinks a page that is wider than its layout viewport
 * to fit, which would undo the widening and feed back into the measurement.
 * The script adds minimum-scale=1 to the viewport meta tag to stop that, and
 * measures the layout width at scale 1 (visualViewport width x scale) so a
 * page that was shrunk anyway still measures the same strip.
 *
 * Usage: load it synchronously in <head>, after the viewport meta tag:
 *   <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
 *   <script src="safe-edges.js"></script>
 *
 * Custom properties on :root, always defined (they fall back to env() when
 * there is no strip):
 *   --true-width   full window width in CSS px (100vw stays the layout width)
 *   --strip-left   width of a control strip on the left, else 0px
 *   --strip-right  width of a control strip on the right, else 0px
 *   --safe-left    env(safe-area-inset-left) + --strip-left
 *   --safe-right   env(safe-area-inset-right) + --strip-right
 * Use --safe-left/--safe-right as horizontal padding on normal-flow content.
 * Don't add them to fixed or sticky boxes: those are already clipped clear of
 * the strip.
 *
 *   --strip-x      left edge of the strip in page coordinates (0 when it's on
 *                  the left, the layout width when it's on the right)
 *   --strip-width  width of the strip, else 0px
 *
 * The strip slot is the stretch of the strip Safari leaves empty between its
 * upper buttons (status, back, bookmarks) and its lower ones (new tab, tabs),
 * edge to edge. Page controls can sit there. Nothing reports it, so it comes
 * from a table of measured layouts (STRIP_LAYOUTS); when the window matches
 * none, there is no slot. The button metrics match Safari's own strip
 * buttons, so page buttons line up with them.
 * Live Activities in the Dynamic Island push the strip's upper buttons down:
 * with a flight activity on the outer display, back and bookmarks moved from
 * 174-282 to 264-372 (device screenshot) while the window, layout viewport
 * and env() insets read exactly as without it. Nothing a page can read
 * changes, so the script can't see it. Instead each layout caps the buttons
 * at the number that still fits below the pushed-down buttons (state.slot.
 * buttons) and the rail stacks them from the bottom of the slot, against the
 * new tab and tabs pill, which doesn't move.
 *   --strip-slot-top     top of the slot, from the top of the window
 *   --strip-slot-height  height of the slot, else 0px
 *   --strip-button-size  diameter of Safari's strip buttons (48px)
 *   --strip-button-gap   space between them, and around them in the slot (12px)
 *   --strip-button-x     left edge of the button column, from the strip's left
 *                        edge. Safari keeps the column 12px from the page side
 *                        of the strip, so it's 12px for a strip on the right and
 *                        24px for one on the left; it isn't centred.
 *
 * The bottom toolbar is the part of the window below the layout viewport,
 * where Safari puts its address bar on the outer display (outerHeight -
 * innerHeight: 98 at rest, less once the bar shrinks on scroll). Page content
 * scrolls under it, but the layout viewport ends above it, so fixed boxes
 * can't reach it and env(safe-area-inset-bottom) stays 0.
 *   --toolbar-bottom     height of that toolbar, else 0px
 *
 * Attributes on <html> while active: data-safe-edges="left" | "right", and
 * data-strip-slot when the slot is known.
 *
 * Staying put while the page scrolls. Safari doesn't draw position: fixed or
 * sticky boxes in the strip or the bottom toolbar, so a box there has to be
 * absolute. Give it data-follow-scroll and it rides the root scroll timeline
 * (animation-timeline: scroll(root block)) by --scroll-travel, the page's
 * scroll range, so it moves with the scroll on the compositor instead of
 * catching up from a scroll handler. Where scroll timelines aren't supported
 * a scroll handler sets --scroll-offset instead. Place it in window
 * coordinates (top: 0 is the top of the window) inside a box at the top of
 * the page.
 *
 * Taps in the strip. Safari draws page content in the strip but doesn't
 * deliver taps there to the element under the finger: the touch targets
 * <html>. The script captures touches whose point lies in the strip
 * and clicks the element matching [data-strip-tap] or .strip-button whose box
 * contains it, so ordinary click handlers work. data-pressed is set while a
 * finger is down on one. Option: tapSelector.
 *
 * Options, set before the script loads:
 *   window.SafeEdges = { side: 'auto' | 'left' | 'right', enabled: true,
 *                        tapSelector: '[data-strip-tap], .strip-button' }
 * API after load: SafeEdges.update(), SafeEdges.enable(), SafeEdges.disable(),
 * SafeEdges.addLayout({ window: [w, h], side, slot: { top, height, buttons } }),
 * SafeEdges.state ({ active, side, strip, width }; side and strip are reported
 * while disabled too). A 'safeedgeschange' event fires on window when the state
 * changes.
 */
(function () {
  'use strict';
  const options = Object.assign({ side: 'auto', enabled: true,
    tapSelector: '[data-strip-tap], .strip-button' }, window.SafeEdges);
  const root = document.documentElement;

  // A strip narrower than this is rounding or page zoom noise; wider is not a
  // Safari control strip (desktop browsers report window chrome the same way).
  const MIN_STRIP = 24;
  const MAX_STRIP = 160;

  // Window size in points; slot from the top of the window; button inset from
  // the page side of the strip. Safari's buttons are 48pt circles 12pt apart.
  const BUTTON = { size: 48, gap: 12, inset: 12 };
  const STRIP_LAYOUTS = [
    // Outer display, portrait (simulator, iOS 27.1, over a black page): back
    // 174-222, bookmarks 234-282, new tab and tabs pill 542-644
    // With a Live Activity the upper buttons end at 372: 170pt left, 2 buttons.
    { window: [466, 678], side: 'right', slot: { top: 282, height: 260, buttons: 2 } },
    // Inner display, Split View, landscape (device screenshot, +-0.5pt).
    // Left window: back 24-72, bookmarks 84-132, pill 532-635.
    // No status or activities in this strip.
    { window: [469, 669], side: 'left', slot: { top: 132, height: 400, buttons: 6 } },
    // Right window: status widgets above back 223-272, bookmarks 284-332, pill 532-635.
    // Measured with two activities showing; their number can change, so 2.
    { window: [469, 669], side: 'right', slot: { top: 332, height: 200, buttons: 2 } },
  ];

  // Stop Split View from shrinking the widened page to fit (see above)
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport && !/minimum-scale/.test(viewport.content)) viewport.content += ', minimum-scale=1';

  // Layout viewport width and height at scale 1: equal to innerWidth and
  // innerHeight unless Safari has zoomed the page out to fit it
  function layoutSize() {
    const vv = window.visualViewport;
    if (!vv || vv.scale >= 1) return [innerWidth, innerHeight];
    return [Math.round(vv.width * vv.scale), Math.round(vv.height * vv.scale)];
  }

  const style = document.createElement('style');
  style.textContent = `
    :root {
      --true-width: 100vw;
      --strip-left: 0px;
      --strip-right: 0px;
      --safe-left: calc(env(safe-area-inset-left, 0px) + var(--strip-left));
      --safe-right: calc(env(safe-area-inset-right, 0px) + var(--strip-right));
      --strip-x: 100vw;
      --strip-width: 0px;
      --strip-slot-top: 0px;
      --strip-slot-height: 0px;
      --strip-button-size: 48px;
      --strip-button-gap: 12px;
      --strip-button-x: 12px;
      --toolbar-bottom: 0px;
      --scroll-travel: 0px;
      --scroll-offset: 0px;
    }
    html[data-safe-edges] {
      width: var(--true-width);
      overflow-x: hidden;
      overscroll-behavior-x: none;
      touch-action: pan-y pinch-zoom;
    }
    @keyframes safe-edges-follow {
      from { transform: translateY(0); }
      to { transform: translateY(var(--scroll-travel)); }
    }
    @supports (animation-timeline: scroll(root block)) {
      [data-follow-scroll] { animation: safe-edges-follow 1s linear both; animation-timeline: scroll(root block); }
    }
    @supports not (animation-timeline: scroll(root block)) {
      [data-follow-scroll] { transform: translateY(var(--scroll-offset)); }
    }`;
  (document.head || root).prepend(style);

  let state = { active: false, side: null, strip: 0, width: 0, slot: null, toolbar: 0 };
  let touching = false;

  function measure() {
    const [layoutWidth, layoutHeight] = layoutSize();
    const strip = Math.round(outerWidth - layoutWidth);
    const touch = matchMedia('(pointer: coarse)').matches;
    if (!touch || strip < MIN_STRIP || strip > MAX_STRIP) {
      return { active: false, side: null, strip: 0, width: layoutWidth, slot: null, toolbar: 0 };
    }
    let side = options.side;
    if (side !== 'left' && side !== 'right') {
      // Full-screen window (outer display): Safari's strip is on the right.
      // Split View: the strip sits on the outer edge of the window's half,
      // so a window that starts at the screen's left edge has it on the left.
      const fullScreen = outerWidth === screen.width || outerWidth === screen.height;
      side = fullScreen || screenX > 0 ? 'right' : 'left';
    }
    const layout = STRIP_LAYOUTS.find(l => l.side === side &&
      l.window[0] === outerWidth && l.window[1] === outerHeight);
    const slot = layout ? Object.assign({}, layout.slot, { button: {
      size: BUTTON.size, gap: BUTTON.gap,
      x: side === 'right' ? BUTTON.inset : strip - BUTTON.inset - BUTTON.size } }) : null;
    const toolbar = Math.max(0, Math.round(outerHeight - layoutHeight));
    // Disabled still reports the strip it found, so a page can show it
    if (!options.enabled) return { active: false, side, strip, width: layoutWidth, layoutWidth, slot, toolbar };
    return { active: true, side, strip, width: layoutWidth + strip, layoutWidth, slot, toolbar };
  }

  function pinnedX() {
    return state.active && state.side === 'left' ? state.strip : 0;
  }

  function pin() {
    if (!state.active || touching) return;
    const x = pinnedX();
    if (Math.abs(scrollX - x) > 0.5) scrollTo(x, scrollY);
  }

  function apply(next) {
    const changed = next.active !== state.active || next.side !== state.side ||
      next.strip !== state.strip || next.width !== state.width || JSON.stringify(next.slot) !== JSON.stringify(state.slot) ||
      next.toolbar !== state.toolbar;
    state = next;
    if (next.active) {
      root.style.setProperty('--true-width', next.width + 'px');
      root.style.setProperty('--strip-left', (next.side === 'left' ? next.strip : 0) + 'px');
      root.style.setProperty('--strip-right', (next.side === 'right' ? next.strip : 0) + 'px');
      root.style.setProperty('--strip-x', (next.side === 'left' ? 0 : next.layoutWidth) + 'px');
      root.style.setProperty('--strip-width', next.strip + 'px');
      root.style.setProperty('--toolbar-bottom', next.toolbar + 'px');
      root.dataset.safeEdges = next.side;
      if (next.slot) {
        root.style.setProperty('--strip-slot-top', next.slot.top + 'px');
        root.style.setProperty('--strip-slot-height', next.slot.height + 'px');
        root.style.setProperty('--strip-button-size', next.slot.button.size + 'px');
        root.style.setProperty('--strip-button-gap', next.slot.button.gap + 'px');
        root.style.setProperty('--strip-button-x', next.slot.button.x + 'px');
        root.dataset.stripSlot = '';
      } else {
        for (const name of ['--strip-slot-top', '--strip-slot-height', '--strip-button-size',
          '--strip-button-gap', '--strip-button-x']) root.style.removeProperty(name);
        delete root.dataset.stripSlot;
      }
    } else {
      for (const name of ['--true-width', '--strip-left', '--strip-right', '--strip-x', '--strip-width',
        '--strip-slot-top', '--strip-slot-height', '--strip-button-size', '--strip-button-gap', '--strip-button-x',
        '--toolbar-bottom']) root.style.removeProperty(name);
      delete root.dataset.safeEdges;
      delete root.dataset.stripSlot;
    }
    pin();
    if (changed) dispatchEvent(new CustomEvent('safeedgeschange', { detail: state }));
  }

  function update() { apply(measure()); travel(); }

  // Scroll range of the root, for data-follow-scroll
  const timeline = window.CSS?.supports?.('animation-timeline', 'scroll(root block)') === true;
  function travel() {
    // innerHeight, not clientHeight: the scroll range grows as Safari's toolbar shrinks
    const range = Math.max(0, root.scrollHeight - innerHeight);
    root.style.setProperty('--scroll-travel', range + 'px');
    if (!timeline) root.style.setProperty('--scroll-offset', scrollY + 'px');
  }
  if (!timeline) addEventListener('scroll', () => root.style.setProperty('--scroll-offset', scrollY + 'px'), { passive: true });
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(travel);
    observer.observe(root);
    if (document.body) observer.observe(document.body);
    else addEventListener('DOMContentLoaded', () => observer.observe(document.body), { once: true });
  }

  // Route taps in the strip to the element drawn under them
  function inStrip(x) {
    return state.strip > 0 && (x < 0 || x >= (state.layoutWidth ?? innerWidth));
  }
  // The smallest visible match wins, so a strip button beats the list row under it
  function tapTarget(x, y) {
    let best = null, bestArea = Infinity;
    for (const element of document.querySelectorAll(options.tapSelector)) {
      const box = element.getBoundingClientRect();
      if (!box.width || x < box.left || x > box.right || y < box.top || y > box.bottom) continue;
      if (getComputedStyle(element).visibility === 'hidden') continue;
      const area = box.width * box.height;
      if (area < bestArea) { best = element; bestArea = area; }
    }
    return best;
  }
  let press = null, routed = null;
  function unpress(element) { element?.removeAttribute('data-pressed'); }
  addEventListener('touchstart', event => {
    unpress(press?.element);
    press = null;
    const touch = event.touches.length === 1 ? event.touches[0] : null;
    if (!touch || !inStrip(touch.clientX)) return;
    const element = tapTarget(touch.clientX, touch.clientY);
    if (!element) return;
    press = { element, id: touch.identifier, x: touch.clientX, y: touch.clientY };
    element.setAttribute('data-pressed', '');
  }, { capture: true, passive: true });
  addEventListener('touchmove', event => {
    if (!press) return;
    const touch = [...event.touches].find(t => t.identifier === press.id);
    if (!touch || Math.hypot(touch.clientX - press.x, touch.clientY - press.y) > 10) { unpress(press.element); press = null; }
  }, { capture: true, passive: true });
  addEventListener('touchcancel', () => { unpress(press?.element); press = null; }, { capture: true, passive: true });
  addEventListener('touchend', event => {
    if (!press) return;
    const { element, id, x, y } = press;
    unpress(element);
    press = null;
    const touch = [...event.changedTouches].find(t => t.identifier === id);
    if (!touch || Math.hypot(touch.clientX - x, touch.clientY - y) > 10 || tapTarget(touch.clientX, touch.clientY) !== element) return;
    event.preventDefault();
    routed = { x, y, until: performance.now() + 700 };
    // After the touch sequence ends: Safari drops a smooth scrollTo started inside touchend
    setTimeout(() => element.click(), 0);
  }, { capture: true, passive: false });
  // Drop the compatibility click Safari may still send for a routed tap
  addEventListener('click', event => {
    if (!event.isTrusted || !routed || performance.now() > routed.until) return;
    if (Math.hypot(event.clientX - routed.x, event.clientY - routed.y) > 24) return;
    routed = null;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  addEventListener('resize', update);
  addEventListener('DOMContentLoaded', travel);
  addEventListener('load', travel);
  window.visualViewport?.addEventListener('resize', travel);
  window.visualViewport?.addEventListener('resize', update);
  addEventListener('load', update);
  addEventListener('orientationchange', () => setTimeout(update, 300));
  addEventListener('pageshow', update);
  addEventListener('scroll', pin, { passive: true });
  addEventListener('touchstart', () => { touching = true; }, { passive: true, capture: true });
  const release = () => { touching = false; setTimeout(pin, 100); };
  addEventListener('touchend', release, { passive: true, capture: true });
  addEventListener('touchcancel', release, { passive: true, capture: true });

  window.SafeEdges = {
    get state() { return state; },
    update,
    // Add a measured layout: { window: [w, h], side, slot: { top, height, buttons } }
    addLayout(layout) { STRIP_LAYOUTS.unshift(layout); update(); },
    enable() { options.enabled = true; update(); },
    disable() { options.enabled = false; update(); },
  };
  update();
})();
