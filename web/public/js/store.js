// Estado de la app. Se guarda por partes (perfil, entreno, comida, …) en el teléfono:
// dentro de la app de Android va a archivos propios de la app; en el navegador, a localStorage.
import { datos } from './nativo.js';
import { hoy } from './util.js';

const VERSION_DATOS = 3;

const LV = [1, 2, 3, 4, 5];

// Tu día: te levantas a las 5 (la alarma), desayunas antes del gym, entrenas de 7:45 a 10,
// comes después de bañarte, escuela de 12 a 5 y a dormir 8:45.
export const HORARIO_RECOMENDADO = {
  desayuno: '06:00', gym: '07:45', comida: '11:00', escuela: '12:00', salida: '17:00',
  colacion: '15:00', cena: '18:00', dormir: '20:45',
};
// El de la versión 1.1 (gym a las 5): si nunca lo cambiaste, se pasa al nuevo
const HORARIO_V2 = { desayuno: '07:15', comida: '11:15', colacion: '15:00', cena: '18:00', dormir: '20:45' };

// Tu servicio social: del 24 de agosto de 2026 al 21 de febrero de 2027, con reporte cada mes
export const SS_DEFECTO = { avisos: true, dia: 24, inicio: '2026-08-24', fin: '2027-02-21', entregados: {} };

const DEFECTOS = {
  perfil: () => ({
    nombre: '', sexo: 'h', nacimiento: '', edad: 22, estatura: 170, pesoInicial: null, meta: 75,
    actividad: 1.45, ritmo: 'normal', kcalAjuste: 0, creado: hoy(),
  }),
  config: () => ({
    onboarding: false, fase: 'f1', faseInicio: hoy(),
    dias: { f1: [...LV], f2: [...LV], f3: [...LV], f4: [...LV], f5: [...LV] },
    horario: { ...HORARIO_RECOMENDADO },
    resumen: { activo: true, hora: '05:00' },
    tienda: 'bodega', aguaMeta: 12, apiBase: '', sonidoDescanso: true, horaAlarma: '05:00',
    checklist: ['creatina', 'pasos', 'proteina', 'sueno', 'plantas', 'guitarra'],
  }),
  // Agenda: tareas, exámenes y entregas con fecha; y el reporte mensual del servicio social
  agenda: () => ({ pendientes: [], ss: { ...SS_DEFECTO, entregados: {} } }),
  entreno: () => ({ sesiones: [], activa: null }),
  peso: () => ({ registros: [], cintura: [] }),
  comida: () => ({ dias: {} }),
  diario: () => ({ dias: {} }),
  plan: () => ({ cambios: {}, comprados: {} }),
  precios: () => ({}),
  meta: () => ({ version: VERSION_DATOS }),
};

export const CLAVES = Object.keys(DEFECTOS);

export const estado = {};
const sucios = new Set();
let timer = null;

export function cargar() {
  const leidos = {};
  for (const clave of CLAVES) {
    const crudo = datos.leer(clave);
    let valor = null;
    if (crudo) {
      try {
        valor = JSON.parse(crudo);
      } catch {
        valor = null;
      }
    }
    leidos[clave] = !!valor;
    estado[clave] = completar(DEFECTOS[clave](), valor);
  }
  // La versión 1 nunca guardó "meta": si hay datos sin meta, vienen de la versión 1
  const version = leidos.meta ? estado.meta.version || 0 : leidos.config ? 1 : VERSION_DATOS;
  migrar(version, !leidos.meta);
  return estado;
}

// Rellena campos nuevos sin pisar lo que ya había
function completar(base, valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return base;
  const r = { ...base, ...valor };
  for (const k of Object.keys(base)) {
    if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && valor[k] && typeof valor[k] === 'object' && !Array.isArray(valor[k])) {
      r[k] = { ...base[k], ...valor[k] };
    }
  }
  return r;
}

function migrar(v, guardarMeta = false) {
  if (v < 2) {
    // v2: la rutina pasó a ser tu split de lunes a viernes en todas las fases
    estado.config.dias = { f1: [...LV], f2: [...LV], f3: [...LV], f4: [...LV], f5: [...LV] };
    marcar('config');
  }
  if (v < 3) {
    // v3: desayuno antes del gym (7:45), escuela en el horario y checklist de la agenda
    const h = estado.config.horario || {};
    for (const [k, viejo] of Object.entries(HORARIO_V2)) {
      if (!h[k] || h[k] === viejo) h[k] = HORARIO_RECOMENDADO[k];
    }
    estado.config.horario = { ...HORARIO_RECOMENDADO, ...h };
    const l = Array.isArray(estado.config.checklist) ? estado.config.checklist : [];
    for (const k of ['plantas', 'guitarra']) if (!l.includes(k)) l.push(k);
    estado.config.checklist = l;
    marcar('config');
  }
  if (guardarMeta || v < VERSION_DATOS) {
    estado.meta.version = VERSION_DATOS;
    marcar('meta');
  }
}

export function marcar(...claves) {
  for (const c of claves) sucios.add(c);
  clearTimeout(timer);
  timer = setTimeout(guardarYa, 250);
}

export function guardarYa() {
  clearTimeout(timer);
  for (const c of sucios) {
    datos.guardar(c, JSON.stringify(estado[c]));
  }
  sucios.clear();
}

// Guarda antes de que el teléfono pause la app
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', guardarYa);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') guardarYa();
  });
}

// ---------- Respaldo ----------
export function exportarTodo() {
  guardarYa();
  return JSON.stringify({ app: 'gym', version: VERSION_DATOS, fecha: new Date().toISOString(), datos: estado }, null, 1);
}

export function importarTodo(texto) {
  const obj = JSON.parse(texto);
  if (!obj || obj.app !== 'gym' || !obj.datos) throw new Error('Ese archivo no es un respaldo de esta app.');
  for (const clave of CLAVES) {
    if (obj.datos[clave]) {
      estado[clave] = completar(DEFECTOS[clave](), obj.datos[clave]);
      sucios.add(clave);
    }
  }
  migrar(obj.datos.meta ? obj.datos.meta.version || 0 : 1, true);
  guardarYa();
}

export function borrarTodo() {
  for (const clave of CLAVES) {
    datos.borrar(clave);
    estado[clave] = DEFECTOS[clave]();
  }
}

// ---------- Atajos de lectura ----------
export function horario() {
  return { ...HORARIO_RECOMENDADO, ...((estado.config && estado.config.horario) || {}) };
}

export function registrosDia(fecha) {
  return estado.comida.dias[fecha] || [];
}

export function diario(fecha) {
  if (!estado.diario.dias[fecha]) estado.diario.dias[fecha] = { agua: 0, checks: {} };
  return estado.diario.dias[fecha];
}
