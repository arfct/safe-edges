// Shared bits for the example apps: icons, generated artwork, and the Wide/Narrow link
const ICONS = {
  back: '<path d="M15 18l-6-6 6-6"/>',
  up: '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>',
  text: '<path d="M4 18 9 6l5 12M5.6 14h6.8"/><path d="M15 18l3-7 3 7M15.8 16h4.4"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  video: '<rect x="3" y="6" width="12" height="12" rx="2"/><path d="M15 10l6-3v10l-6-3"/>',
  send: '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
};
function icon(name, size = 22) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

// Seeded artwork: a landscape (sky, sun, two ridges) as an SVG data URL
function art(seed, { width = 400, height = 300 } = {}) {
  let x = seed * 9301 + 49297;
  const rand = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  const hue = Math.floor(rand() * 360);
  const ridge = (base, amp) => {
    let d = `M0 ${height}`;
    for (let i = 0; i <= 8; i++) d += ` L${(i * width) / 8} ${base + (rand() - 0.5) * amp}`;
    return d + ` L${width} ${height} Z`;
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="s" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 72%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360} 80% 88%)"/></linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#s)"/>
    <circle cx="${width * (0.2 + rand() * 0.6)}" cy="${height * (0.25 + rand() * 0.2)}" r="${height * 0.11}" fill="hsl(${(hue + 180) % 360} 90% 96%)" opacity=".9"/>
    <path d="${ridge(height * 0.62, height * 0.3)}" fill="hsl(${(hue + 200) % 360} 30% 45%)"/>
    <path d="${ridge(height * 0.8, height * 0.2)}" fill="hsl(${(hue + 210) % 360} 35% 25%)"/>
  </svg>`;
  // Single quotes: the result goes inside style="…" attributes. encodeURIComponent leaves ' alone, and the SVG has none.
  return `url('data:image/svg+xml,${encodeURIComponent(svg)}')`;
}

// Wide/Narrow link: reloads with or without ?narrow; hidden when there is no strip
function widthToggle(className = '') {
  const url = new URL(location.href);
  const narrow = url.searchParams.has('narrow');
  narrow ? url.searchParams.delete('narrow') : url.searchParams.set('narrow', '');
  if (!SafeEdges.state.strip) return '';
  return `<a href="${url}" class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ring-1 ${className}">${narrow ? 'Wide' : 'Narrow'}</a>`;
}
function examplesLink(className = '') {
  const url = new URL('index.html', location.href);
  if (new URLSearchParams(location.search).has('narrow')) url.searchParams.set('narrow', '');
  return `<a href="${url}" class="inline-flex items-center gap-1 text-sm font-medium ${className}">${icon('back', 16)}Examples</a>`;
}

// <button data-icon="name"> gets that icon, now and whenever views re-render
function fillIcons(root = document) {
  for (const node of root.querySelectorAll('[data-icon]:empty')) node.innerHTML = icon(node.dataset.icon);
}
addEventListener('DOMContentLoaded', () => {
  fillIcons();
  new MutationObserver(() => fillIcons()).observe(document.body, { childList: true, subtree: true });
});
