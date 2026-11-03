// Arranque: carga los datos, rutas, barra de abajo y conexión con Android.
import { cargar, estado, guardarYa } from './store.js';
import { acciones, registrar, conectar } from './nucleo.js';
import { $, esc, hoy, aviso, cerrarHoja, hojaAbierta } from './util.js';
import { icono } from './iconos.js';
import * as nativo from './nativo.js';
import { siguienteRutina } from './calc.js';
import { bienvenida } from './vistas/bienvenida.js';
import { vistaHoy } from './vistas/hoy.js';
import { vistaSesion } from './vistas/sesion.js';
import { vistaEntreno, vistaCamino, vistaEjercicio, vistaBiblioteca } from './vistas/entreno.js';
import { vistaComida, vistaBuscar, vistaPlan, vistaSuper, vistaPrecios } from './vistas/comida.js';
import { vistaEscaner } from './vistas/escaner.js';
import { vistaProgreso } from './vistas/progreso.js';
import { vistaMas, vistaAlarmas, vistaAjustes, vistaAprende } from './vistas/mas.js';
import { vistaAgenda } from './vistas/agenda.js';
import { sincronizarResumen } from './resumen.js';

const VISTAS = {
  hoy: vistaHoy,
  sesion: vistaSesion,
  entreno: vistaEntreno,
  camino: vistaCamino,
  ejercicio: vistaEjercicio,
  ejercicios: vistaBiblioteca,
  comida: vistaComida,
  buscar: vistaBuscar,
  plan: vistaPlan,
  super: vistaSuper,
  precios: vistaPrecios,
  escaner: vistaEscaner,
  progreso: vistaProgreso,
  mas: vistaMas,
  alarmas: vistaAlarmas,
  ajustes: vistaAjustes,
  aprende: vistaAprende,
  agenda: vistaAgenda,
};

const TABS = [
  ['hoy', 'hoy', 'Hoy'],
  ['entreno', 'pesa', 'Entreno'],
  ['comida', 'comida', 'Comida'],
  ['progreso', 'progreso', 'Progreso'],
  ['mas', 'mas', 'Más'],
];

let actual = null;
let diaCargado = hoy();

function ruta() {
  const h = location.hash.replace(/^#\/?/, '');
  const [nombre, ...resto] = h.split('/');
  return { nombre: nombre || 'hoy', params: resto.filter(Boolean).map(decodeURIComponent) };
}

function pintarNav(tab) {
  $('#nav').innerHTML = `<div class="nav-dentro">${TABS.map(
    ([id, ic, txt]) => `<a href="#/${id}" ${id === tab ? 'aria-current="page"' : ''}>${icono(ic)}<span>${txt}</span></a>`
  ).join('')}</div>`;
}

function pintar(nombre, params, mantenerScroll) {
  const v = nombre === 'bienvenida' ? bienvenida : VISTAS[nombre];
  if (actual && actual.vista.desmontar) actual.vista.desmontar();
  const y = window.scrollY;
  const raiz = $('#vista');
  try {
    raiz.innerHTML = v.render(...params);
  } catch (err) {
    console.error(err);
    raiz.innerHTML = `<div class="vacio">Algo falló al abrir esta pantalla.<br><span class="mini">${esc(err && err.message)}</span><br><button class="boton primario" data-a="ir" data-ruta="hoy">Ir a hoy</button></div>`;
  }
  raiz.classList.toggle('sin-relleno', nombre === 'bienvenida');
  document.body.classList.toggle('sin-nav', !!v.sinNav);
  pintarNav(v.tab || nombre);
  actual = { nombre, params, vista: v };
  if (v.montar) {
    try {
      v.montar(raiz, ...params);
    } catch (err) {
      console.error(err);
    }
  }
  if (mantenerScroll) window.scrollTo(0, y);
  else window.scrollTo(0, 0);
  // El resumen de las 5 am se recalcula con lo último (rutina, agenda, horario)
  sincronizarResumen();
}

function render() {
  if (!estado.config.onboarding) return pintar('bienvenida', [], false);
  let { nombre, params } = ruta();
  if (!VISTAS[nombre]) nombre = 'hoy';
  pintar(nombre, params, false);
}

function refrescar() {
  if (!actual) return render();
  pintar(actual.nombre, actual.params, true);
}

function ir(destino, reemplazar = false) {
  const h = '#/' + destino;
  if (reemplazar) {
    history.replaceState(null, '', h);
    render();
  } else if (location.hash === h) render();
  else location.hash = h;
}

conectar({ ir, refrescar });

// ---------- Eventos globales ----------
registrar({
  ir: (el) => {
    cerrarHoja();
    ir(el.dataset.ruta);
  },
  atras: () => history.back(),
});

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-cerrar-hoja]')) return cerrarHoja();
  const el = e.target.closest('[data-a]');
  if (!el) return;
  const fn = acciones[el.dataset.a];
  if (!fn) return;
  e.preventDefault();
  try {
    fn(el, e);
  } catch (err) {
    console.error(err);
    aviso('Algo falló: ' + (err.message || err));
  }
});

document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-c]');
  if (!el) return;
  const fn = acciones[el.dataset.c];
  if (fn) fn(el, e);
});

document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-i]');
  if (!el) return;
  const fn = acciones[el.dataset.i];
  if (fn) fn(el, e);
});

window.addEventListener('hashchange', () => {
  cerrarHoja();
  render();
});

// Si pasa la medianoche con la app abierta, se actualiza "hoy"
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && hoy() !== diaCargado) {
    diaCargado = hoy();
    refrescar();
  }
  if (document.visibilityState === 'hidden') sincronizarResumen(true);
});

// ---------- Android ----------
// Botón de atrás: primero cierra la hoja abierta
window.__atras = () => {
  if (hojaAbierta()) {
    cerrarHoja();
    return true;
  }
  return false;
};

function eventoNativo(nombre, datos) {
  if (nombre === 'alarmaApagada') {
    aviso('¡Arriba! Ya estás despierto. A darle.');
    ir('hoy');
  } else if (nombre === 'tono') {
    aviso('Tono cambiado.');
    refrescar();
  } else if (nombre === 'permisos' || nombre === 'reanudar') {
    if (actual && ['alarmas', 'hoy', 'ajustes'].includes(actual.nombre)) refrescar();
  } else if (nombre === 'ver' && typeof datos === 'string' && /^[a-z]+$/.test(datos)) {
    ir(datos);
  }
}
window.__nativo = (nombre, datosJson) => {
  let datos = null;
  try {
    datos = datosJson ? JSON.parse(datosJson) : null;
  } catch {
    datos = null;
  }
  eventoNativo(nombre, datos);
};

function avisarSiguiente() {
  if (!nativo.enApp() || !estado.config.onboarding) return;
  try {
    nativo.alarmas.mensaje(`Hoy toca: ${siguienteRutina().nombre}`);
  } catch {
    /* nada */
  }
}

// ---------- Service worker (solo cuando viene de Cloudflare) ----------
function registrarSW() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' || location.hostname === 'appassets.androidplatform.net') return;
  navigator.serviceWorker
    .register('sw.js')
    .then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nuevo = reg.installing;
        if (!nuevo) return;
        nuevo.addEventListener('statechange', () => {
          if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
            aviso('Hay una versión nueva de la app.', { texto: 'Actualizar', hacer: () => location.reload() });
          }
        });
      });
    })
    .catch(() => {});
}

// ---------- Inicio ----------
window.__gym = 'gym'; // la app de Android revisa esto para saber que la web cargó bien
cargar();
render();
avisarSiguiente();
for (const ev of nativo.eventosPendientes() || []) eventoNativo(ev.nombre, ev.datos);
registrarSW();
window.addEventListener('beforeunload', guardarYa);
