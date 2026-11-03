// Narrow/Wide link: reloads with or without ?narrow; hidden when there is no strip
for (const link of document.querySelectorAll('[data-width-toggle]')) {
  const url = new URL(location.href);
  const narrow = url.searchParams.has('narrow');
  narrow ? url.searchParams.delete('narrow') : url.searchParams.set('narrow', '');
  link.href = url;
  link.textContent = narrow ? 'Wide' : 'Narrow';
  link.hidden = !SafeEdges.state.strip;
}
// Carry ?narrow across example links
if (new URLSearchParams(location.search).has('narrow')) {
  for (const a of document.querySelectorAll('a[href$=".html"]')) {
    const url = new URL(a.href); url.searchParams.set('narrow', ''); a.href = url;
  }
}
