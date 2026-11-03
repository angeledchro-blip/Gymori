// Íconos de línea propios (stroke = currentColor)
const P = {
  hoy: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
  pesa: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/><rect x="5" y="6" width="3" height="12" rx="1"/><rect x="16" y="6" width="3" height="12" rx="1"/>',
  comida: '<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M9 8c0-1.5 1-2 1-3.5M13 8c0-1.5 1-2 1-3.5M17 8.5c0-1.2.8-1.6.8-2.8"/>',
  progreso: '<path d="M3.5 20.5h17"/><path d="M5 16l4.5-5 3.5 3 6-7.5"/><path d="M15.5 6.5H19v3.5"/>',
  mas: '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
  camara: '<path d="M4 8h3l1.6-2.5h6.8L17 8h3a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.6"/>',
  codigo: '<path d="M4 5v14M7 5v14M10.5 5v14M13 5v14M16.5 5v14M20 5v14"/>',
  buscar: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>',
  plan: '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M8 8.5h8M8 12h8M8 15.5h5"/>',
  carrito: '<path d="M3 4h2.5l2.2 11h10.6L20.5 7.5H6.4"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
  alarma: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4.5l2.8 1.8M4 4.5L6.5 2.5M20 4.5l-2.5-2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19.5 7"/>',
  sumar: '<path d="M12 5v14M5 12h14"/>',
  cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
  flecha: '<path d="M9 5l7 7-7 7"/>',
  atras: '<path d="M15 5l-7 7 7 7"/>',
  video: '<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M10.5 9.5v5l4.5-2.5z"/>',
  cambiar: '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>',
  basura: '<path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 13h10l1-13M9.5 7V4h5v3"/>',
  agua: '<path d="M12 3.5c3 4 6 7.2 6 10.5a6 6 0 0 1-12 0c0-3.3 3-6.5 6-10.5z"/>',
  candado: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  libro: '<path d="M4 5.5c3-1.5 5.5-1.5 8 0v14c-2.5-1.5-5-1.5-8 0zM20 5.5c-3-1.5-5.5-1.5-8 0v14c2.5-1.5 5-1.5 8 0z"/>',
  usuario: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1.2-4 4.2-5.5 7.5-5.5s6.3 1.5 7.5 5.5"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h3"/>',
  disco: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.2"/>',
  etiqueta: '<path d="M3.5 12.5l8-8h8v8l-8 8z"/><circle cx="15.5" cy="8.5" r="1.3"/>',
  respaldo: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M4.5 19.5h15"/>',
  escudo: '<path d="M12 3l7.5 3v6c0 4.5-3.2 7.6-7.5 9-4.3-1.4-7.5-4.5-7.5-9V6z"/><path d="M8.8 12.2l2.2 2.2 4.4-4.6"/>',
  rayo: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
};

export function icono(nombre, clase = '') {
  return `<svg class="ico ${clase}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[nombre] || ''}</svg>`;
}
