// Agenda: tareas, exámenes y entregas con cuenta regresiva, y el reporte mensual del servicio social.
import { estado, marcar, SS_DEFECTO } from './store.js';
import { hoy, uid, diasEntre, deClave, claveFecha, clamp, fechaCorta, diaSemana } from './util.js';

export const TIPOS = [
  ['tarea', 'Tarea'],
  ['examen', 'Examen'],
  ['entrega', 'Entrega'],
  ['otro', 'Otro'],
];
export const TIPO = Object.fromEntries(TIPOS);

const agenda = () => {
  if (!estado.agenda) estado.agenda = { pendientes: [], ss: { ...SS_DEFECTO, entregados: {} } };
  if (!Array.isArray(estado.agenda.pendientes)) estado.agenda.pendientes = [];
  if (!estado.agenda.ss) estado.agenda.ss = { ...SS_DEFECTO, entregados: {} };
  if (!estado.agenda.ss.entregados) estado.agenda.ss.entregados = {};
  return estado.agenda;
};

// ---------- Cuenta regresiva ----------
export const faltan = (fecha, desde = hoy()) => diasEntre(desde, fecha);

export function textoFaltan(n) {
  if (n < -1) return `venció hace ${-n} días`;
  if (n === -1) return 'venció ayer';
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  return `en ${n} días`;
}

// Color de la etiqueta: vino si ya venció o es hoy/mañana, mostaza si faltan 3 días o menos
export function colorFaltan(n) {
  if (n <= 1) return 'vino';
  if (n <= 3) return 'mostaza';
  return '';
}

const DIA3 = ['', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
export const fechaConDia = (f) => `${DIA3[diaSemana(f)]} ${fechaCorta(f)}`;

export function titulo(p) {
  return p.materia ? `${p.titulo} (${p.materia})` : p.titulo;
}

// ---------- Pendientes ----------
const porFecha = (a, b) => (a.fecha === b.fecha ? (a.creado || '').localeCompare(b.creado || '') : a.fecha < b.fecha ? -1 : 1);

export function pendientes() {
  return agenda().pendientes.filter((p) => !p.hecho).sort(porFecha);
}

export function hechos() {
  return agenda()
    .pendientes.filter((p) => p.hecho)
    .sort((a, b) => (a.hechoEl || a.fecha) < (b.hechoEl || b.fecha) ? 1 : -1);
}

// Lo que viene en los próximos días (y lo vencido sin hacer)
export function proximos({ desde = hoy(), dias = 14, max = 6 } = {}) {
  return pendientes()
    .filter((p) => diasEntre(desde, p.fecha) <= dias)
    .slice(0, max);
}

export function guardarPendiente(datos) {
  const a = agenda();
  const limpio = {
    titulo: String(datos.titulo || '').trim().slice(0, 120),
    tipo: TIPO[datos.tipo] ? datos.tipo : 'tarea',
    materia: String(datos.materia || '').trim().slice(0, 60),
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha || '') ? datos.fecha : hoy(),
  };
  if (!limpio.titulo) return null;
  let p = datos.id && a.pendientes.find((x) => x.id === datos.id);
  if (p) Object.assign(p, limpio);
  else {
    p = { id: uid(), ...limpio, hecho: false, creado: new Date().toISOString() };
    a.pendientes.push(p);
  }
  marcar('agenda');
  return p;
}

export function alternarHecho(id) {
  const p = agenda().pendientes.find((x) => x.id === id);
  if (!p) return null;
  p.hecho = !p.hecho;
  p.hechoEl = p.hecho ? hoy() : null;
  marcar('agenda');
  return p;
}

export function borrarPendiente(id) {
  const a = agenda();
  const antes = a.pendientes.length;
  a.pendientes = a.pendientes.filter((x) => x.id !== id);
  if (a.pendientes.length !== antes) marcar('agenda');
}

// ---------- Servicio social ----------
export const ss = () => agenda().ss;

function fechaDelMes(y, m, dia) {
  const ultimo = new Date(y, m + 1, 0).getDate();
  return claveFecha(new Date(y, m, Math.min(dia, ultimo), 12));
}

// Siguiente reporte mensual: el de este mes; si ya lo entregaste, el del que sigue.
// No hay reporte el mes en que empezaste ni después del mes en que terminas.
export function reporteSS(desde = hoy()) {
  const s = ss();
  if (!s || s.avisos === false) return null;
  const dia = clamp(Number(s.dia) || 24, 1, 31);
  const d = deClave(desde);
  for (let k = 0; k < 3; k++) {
    const fecha = fechaDelMes(d.getFullYear(), d.getMonth() + k, dia);
    const mes = fecha.slice(0, 7);
    if (s.fin && mes > s.fin.slice(0, 7)) return null;
    if (s.inicio && mes <= s.inicio.slice(0, 7)) continue;
    if (s.entregados[mes]) continue;
    return { fecha, mes, faltan: diasEntre(desde, fecha), ultimo: !!s.fin && mes === s.fin.slice(0, 7) };
  }
  return null;
}

export function marcarReporte(mes, entregado = true) {
  const s = ss();
  if (entregado) s.entregados[mes] = hoy();
  else delete s.entregados[mes];
  marcar('agenda');
}

export function diasParaTerminarSS(desde = hoy()) {
  const s = ss();
  return s && s.fin ? diasEntre(desde, s.fin) : null;
}
