const icons={grid:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',fit:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M12 6v12M6 12h12"/><circle cx="12" cy="12" r="4"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',check:'<path d="m4 12 5 5L20 6"/>',next:'<path d="M4 12h16m-6-6 6 6-6 6"/>',retry:'<path d="M3 10a9 9 0 1 1 2 8M3 3v7h7"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',finish:'<path d="M9 4H4v16h5M10 12h11m-5-5 5 5-5 5"/>'};
export function iconSVG(name) {
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}
export function iconButton(id,icon,label) {
  const b=document.getElementById(id); b.classList.add('icon-button');
  b.setAttribute('aria-label',label); b.title=label; b.innerHTML=iconSVG(icon);
}
