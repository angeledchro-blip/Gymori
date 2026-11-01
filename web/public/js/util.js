// Utilidades chicas que usa toda la app.

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

// Escapa texto para meterlo en HTML
export function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const redondea = (v, paso = 1) => Math.round(v / paso) * paso;

// ---------- Fechas (siempre en hora local del teléfono) ----------
export function claveFecha(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

export function deClave(clave) {
  const [y, m, d] = clave.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export const hoy = () => claveFecha(new Date());

export function sumarDias(clave, n) {
  const d = deClave(clave);
  d.setDate(d.getDate() + n);
  return claveFecha(d);
}

export function diasEntre(a, b) {
  return Math.round((deClave(b) - deClave(a)) / 86400000);
}

// 1 = lunes … 7 = domingo
export function diaSemana(clave) {
  const d = deClave(clave).getDay();
  return d === 0 ? 7 : d;
}

export function lunesDe(clave) {
  return sumarDias(clave, 1 - diaSemana(clave));
}

const DIAS = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DIAS_CORTOS = ['', 'L', 'M', 'Mi', 'J', 'V', 'S', 'D'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const nombreDia = (n) => DIAS[n];
export const diaCorto = (n) => DIAS_CORTOS[n];

export function fechaLarga(clave) {
  const d = deClave(clave);
  return `${DIAS[diaSemana(clave)]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function fechaCorta(clave) {
  const d = deClave(clave);
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

export function fechaRelativa(clave) {
  const n = diasEntre(clave, hoy());
  if (n === 0) return 'hoy';
  if (n === 1) return 'ayer';
  if (n > 1 && n < 7) return `hace ${n} días`;
  return fechaCorta(clave);
}

export function mmss(seg) {
  seg = Math.max(0, Math.round(seg));
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function duracion(ms) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${min % 60} min`;
}

// ---------- Números ----------
export function num(v, dec = 0) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return Number(v).toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function kg(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '')) + ' kg';
}

export function pesos(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return '$' + Number(v).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function plural(n, uno, varios) {
  return `${num(n)} ${n === 1 ? uno : varios}`;
}

// ---------- Avisos ----------
let timerToast = null;
export function aviso(texto, accion) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = `<span>${esc(texto)}</span>` + (accion ? `<button type="button" class="toast-accion">${esc(accion.texto)}</button>` : '');
  t.hidden = false;
  t.classList.add('visible');
  if (accion) {
    t.querySelector('.toast-accion').onclick = () => {
      accion.hacer();
      ocultarAviso();
    };
  }
  clearTimeout(timerToast);
  timerToast = setTimeout(ocultarAviso, accion ? 6000 : 3000);
}

function ocultarAviso() {
  const t = document.getElementById('toast');
  if (!t) return;
  t.classList.remove('visible');
  setTimeout(() => (t.hidden = true), 250);
}

// ---------- Hoja inferior (modal) ----------
let alCerrarHoja = null;
export function abrirHoja(html, { alCerrar, clase = '' } = {}) {
  const h = document.getElementById('hoja');
  h.innerHTML = `<div class="hoja-fondo" data-cerrar-hoja></div><div class="hoja-panel ${clase}" role="dialog" aria-modal="true">${html}</div>`;
  h.hidden = false;
  requestAnimationFrame(() => h.classList.add('abierta'));
  alCerrarHoja = alCerrar || null;
  document.body.classList.add('con-hoja');
  return h.querySelector('.hoja-panel');
}

export function cerrarHoja() {
  const h = document.getElementById('hoja');
  if (h.hidden) return;
  h.classList.remove('abierta');
  document.body.classList.remove('con-hoja');
  const fn = alCerrarHoja;
  alCerrarHoja = null;
  setTimeout(() => {
    h.hidden = true;
    h.innerHTML = '';
  }, 200);
  if (fn) fn();
}

export function hojaAbierta() {
  const h = document.getElementById('hoja');
  return h && !h.hidden;
}

export function confirmar(titulo, texto, opciones) {
  // opciones: [{ texto, clase, hacer }]
  const botones = opciones
    .map((o, i) => `<button type="button" class="boton ${o.clase || 'secundario'}" data-op="${i}">${esc(o.texto)}</button>`)
    .join('');
  const panel = abrirHoja(`<h2 class="hoja-titulo">${esc(titulo)}</h2>${texto ? `<p class="hoja-texto">${esc(texto)}</p>` : ''}<div class="pila-botones">${botones}</div>`);
  panel.querySelectorAll('[data-op]').forEach((b) => {
    b.onclick = () => {
      const o = opciones[Number(b.dataset.op)];
      cerrarHoja();
      if (o.hacer) o.hacer();
    };
  });
}

// Pitido corto con WebAudio (para el fin del descanso)
let ctxAudio = null;
export function pitido(veces = 2) {
  try {
    ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)();
    const ahora = ctxAudio.currentTime;
    for (let i = 0; i < veces; i++) {
      const o = ctxAudio.createOscillator();
      const g = ctxAudio.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ahora + i * 0.28);
      g.gain.exponentialRampToValueAtTime(0.35, ahora + i * 0.28 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ahora + i * 0.28 + 0.2);
      o.connect(g).connect(ctxAudio.destination);
      o.start(ahora + i * 0.28);
      o.stop(ahora + i * 0.28 + 0.22);
    }
  } catch {
    /* sin audio */
  }
}

export function debounce(fn, ms) {
  let t = null;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
