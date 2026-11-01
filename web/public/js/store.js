// Estado de la app. Se guarda por partes (perfil, entreno, comida, …) en el teléfono:
// dentro de la app de Android va a archivos propios de la app; en el navegador, a localStorage.
import { datos } from './nativo.js';
import { hoy } from './util.js';

const VERSION_DATOS = 1;

const DEFECTOS = {
  perfil: () => ({
    nombre: '', sexo: 'h', nacimiento: '', edad: 22, estatura: 170, pesoInicial: null, meta: 75,
    actividad: 1.45, ritmo: 'normal', kcalAjuste: 0, creado: hoy(),
  }),
  config: () => ({
    onboarding: false, fase: 'f1', faseInicio: hoy(),
    dias: { f1: [1, 3, 5], f2: [1, 3, 5], f3: [1, 2, 4, 5], f4: [1, 2, 3, 5, 6], f5: [1, 2, 3, 4, 5, 6] },
    tienda: 'bodega', aguaMeta: 12, apiBase: '', sonidoDescanso: true, horaAlarma: '05:00',
    checklist: ['creatina', 'pasos', 'proteina', 'sueno'],
  }),
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
    estado[clave] = completar(DEFECTOS[clave](), valor);
  }
  migrar();
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

function migrar() {
  if ((estado.meta.version || 0) < VERSION_DATOS) {
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
  guardarYa();
}

export function borrarTodo() {
  for (const clave of CLAVES) {
    datos.borrar(clave);
    estado[clave] = DEFECTOS[clave]();
  }
}

// ---------- Atajos de lectura ----------
export function registrosDia(fecha) {
  return estado.comida.dias[fecha] || [];
}

export function diario(fecha) {
  if (!estado.diario.dias[fecha]) estado.diario.dias[fecha] = { agua: 0, checks: {} };
  return estado.diario.dias[fecha];
}
