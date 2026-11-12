---
title: safe-edges
date: 2026-10
category: tool
tags: [web]
url: https://arfct.github.io/safe-edges/
links:
  source: https://github.com/arfct/safe-edges
media:
  - src: photos-narrow-wide.png
    caption: The Photos example on the outer display of an iPhone Duo, in Safari's own layout on the left and widened under the strip on the right, where the grid gains a fourth column
    alt: Two phone screenshots of a photo library of flat mountain landscapes, the left with three columns and a black band beside Safari's buttons, the right with four columns running under the same buttons
  - src: tester.png
    caption: The tester in the iPhone Duo simulator, reporting a strip of 84 points on the right, a toolbar of 98 and two page buttons in the strip's slot
    alt: A phone screen with a white card listing safe area values, a yellow band down the right edge behind Safari's buttons, a pink block in that band holding round buttons numbered 1 and 2, and a blue band behind the address bar
  - src: reader.png
    caption: The Ratio example, a scrolling article whose own two buttons sit in the slot between Safari's
    alt: A phone screen with a magazine page titled Ratio, a pink and green landscape illustration that runs under Safari's buttons on the right, and two white round buttons above Safari's lower pair
unconfirmed: [date]
---

An 84-point strip of Safari's own controls runs beside every page on the outer display of an iPhone Duo and in Split View, while the safe-area inset Safari reports is 0 on every edge. The safe-edges library measures the strip and the bottom toolbar as the difference between the window's outer and inner sizes, widens the page to the whole window, and publishes as CSS custom properties the insets that Safari should have reported. In the first image the same photo grid is shown before and after, and the widened one has room for a fourth column. A set of Tailwind v4 utilities covers the same values.

Between Safari's buttons the strip has an empty slot, where a page can draw buttons of its own. Safari delivers a tap in the strip to the page's root element, whatever is drawn under the finger, so the library finds the smallest marked element at that point and clicks it. A Live Activity in the Dynamic Island pushes Safari's upper buttons down by 90 points and changes nothing a page can read; two page buttons stacked from the bottom of the slot stay clear of them.

The site is a tester that shows the insets, the strip, the toolbar and the slot as measured live, and the repository adds three example apps and four single-pattern pages. The measurements come from the iPhone Duo simulator on iOS 27.1 and from device screenshots. Landscape on the outer display is unmeasured.

JavaScript, CSS. 2026.
