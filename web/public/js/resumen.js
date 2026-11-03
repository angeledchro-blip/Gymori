// Resumen del día: el texto de la notificación de las 5 am (gym, escuela, agenda, checklist y horario).
// La web calcula los próximos 7 días y se los pasa a Android, que muestra el de cada mañana
// aunque la app esté cerrada.
import { estado, horario } from './store.js';
import { RUTINAS } from './datos/programa.js';
import { EJ } from './datos/ejercicios.js';
import { faseActual, siguienteRutina, diasEntreno, sesionDe, pesoAnterior } from './calc.js';
import { pendientes, reporteSS, textoFaltan } from './agenda.js';
import { hoy, sumarDias, diaSemana, diasEntre, hora12 } from './util.js';
import * as nativo from './nativo.js';

export const CHECK_CORTO = {
  creatina: 'creatina',
  pasos: 'tus pasos',
  proteina: 'tu proteína',
  sueno: 'dormir 7 h',
  plantas: 'regar a Maboroshi e Ibuki',
  guitarra: 'un rato de guitarra',
  cardio: 'cardio',
};

const corto = (nombre) => nombre.replace(/\s*\(.*?\)/g, '').trim();

// Qué rutina toca cada uno de los próximos n días, siguiendo la rotación
export function rutinasPorDia(n = 7, desde = hoy()) {
  const f = faseActual();
  const dias = diasEntreno();
  const total = f.rotacion.length;
  let i = f.rotacion.indexOf(siguienteRutina().id);
  if (i < 0) i = 0;
  const r = {};
  for (let d = 0; d < n; d++) {
    const fecha = sumarDias(desde, d);
    const hecha = d === 0 ? sesionDe(desde).slice(-1)[0] : null;
    if (hecha) r[fecha] = { rutina: RUTINAS[hecha.rutina] || { nombre: hecha.nombre, ejercicios: [] }, hecha: true };
    else if (dias.includes(diaSemana(fecha))) {
      r[fecha] = { rutina: RUTINAS[f.rotacion[i % total]], hecha: false };
      i++;
    } else r[fecha] = null;
  }
  return r;
}

export function resumenDe(fecha, info) {
  const h = horario();
  const lineas = [];
  const rutina = info && info.rutina;
  let titulo = 'Hoy descansas del gym';
  if (rutina && info.hecha) titulo = `Ya entrenaste: ${rutina.nombre}`;
  else if (rutina) {
    titulo = `Hoy toca ${rutina.nombre}`;
    const pesos = rutina.ejercicios
      .slice(0, 4)
      .map((pl) => {
        const p = pesoAnterior(pl.ej);
        return p ? `${corto(EJ[pl.ej].nombre).toLowerCase()} ${p.kg} kg` : null;
      })
      .filter(Boolean);
    lineas.push(`Gym a las ${hora12(h.gym)}${pesos.length ? `. La vez pasada: ${pesos.join(', ')}` : ''}.`);
  }
  if (diaSemana(fecha) <= 5) lineas.push(`Escuela de ${hora12(h.escuela)} a ${hora12(h.salida)}.`);
  const agenda = pendientes()
    .filter((p) => diasEntre(fecha, p.fecha) <= 7)
    .slice(0, 4)
    .map((p) => `${p.titulo}: ${textoFaltan(diasEntre(fecha, p.fecha))}`);
  if (agenda.length) lineas.push(`${agenda.join('. ')}.`);
  const r = reporteSS(fecha);
  if (r && r.faltan <= 7) lineas.push(`Reporte del servicio social: ${textoFaltan(r.faltan)}.`);
  // "dormí 7 h" es de la noche anterior: no va en el resumen de la mañana
  const checks = (estado.config.checklist || []).filter((k) => k !== 'sueno').map((k) => CHECK_CORTO[k]).filter(Boolean);
  if (checks.length) lineas.push(`Pendientes: ${checks.join(', ')}.`);
  lineas.push(`Desayuno ${hora12(h.desayuno)}, comida ${hora12(h.comida)}, cena ${hora12(h.cena)} y a dormir a las ${hora12(h.dormir)}.`);
  return { titulo, texto: lineas.join('\n') };
}

export function resumenes(n = 7, desde = hoy()) {
  const dias = {};
  for (const [fecha, info] of Object.entries(rutinasPorDia(n, desde))) dias[fecha] = resumenDe(fecha, info);
  return dias;
}

// Manda los resúmenes a Android (solo si cambiaron)
let timer = null;
let ultimo = '';
export function sincronizarResumen(inmediato = false) {
  if (!nativo.enApp() || !estado.config.onboarding) return;
  clearTimeout(timer);
  const hacer = () => {
    try {
      const c = estado.config.resumen || {};
      const datos = JSON.stringify({ activo: c.activo !== false, hora: c.hora || '05:00', dias: resumenes(7) });
      if (datos === ultimo) return;
      const r = nativo.resumen.guardar(datos);
      if (r && r.ok) ultimo = datos;
    } catch (err) {
      console.warn('resumen', err);
    }
  };
  if (inmediato) hacer();
  else timer = setTimeout(hacer, 800);
}
