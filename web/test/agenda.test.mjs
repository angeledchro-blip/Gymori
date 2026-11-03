// Agenda (escuela, tesis, servicio social), resumen de la mañana y migración de datos.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// "localStorage" falso para probar lo que se guarda
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };

const store = await import('../public/js/store.js');
const A = await import('../public/js/agenda.js');
const R = await import('../public/js/resumen.js');
const { estado, cargar, guardarYa, horario } = store;

function nuevo() {
  mem.clear();
  cargar();
  estado.config.onboarding = true;
  estado.config.fase = 'f1';
  estado.entreno.sesiones = [];
}

test('cuenta regresiva y orden de la agenda', () => {
  nuevo();
  assert.equal(A.textoFaltan(0), 'hoy');
  assert.equal(A.textoFaltan(1), 'mañana');
  assert.equal(A.textoFaltan(5), 'en 5 días');
  assert.equal(A.textoFaltan(-1), 'venció ayer');
  assert.equal(A.textoFaltan(-3), 'venció hace 3 días');
  A.guardarPendiente({ titulo: 'Entrega capítulo 2', tipo: 'entrega', materia: 'Tesis', fecha: '2026-11-10' });
  A.guardarPendiente({ titulo: 'Examen parcial', tipo: 'examen', fecha: '2026-11-04' });
  A.guardarPendiente({ titulo: 'Tarea vieja', tipo: 'tarea', fecha: '2026-10-30' });
  A.guardarPendiente({ titulo: 'Muy lejos', tipo: 'tarea', fecha: '2026-12-20' });
  assert.equal(A.guardarPendiente({ titulo: '   ', fecha: '2026-11-05' }), null);
  const prox = A.proximos({ desde: '2026-11-02', dias: 14 });
  assert.deepEqual(prox.map((p) => p.titulo), ['Tarea vieja', 'Examen parcial', 'Entrega capítulo 2']);
  const p = prox[1];
  A.alternarHecho(p.id);
  assert.ok(!A.pendientes().some((x) => x.id === p.id));
  assert.equal(A.hechos()[0].id, p.id);
  A.borrarPendiente(p.id);
  assert.equal(A.hechos().length, 0);
});

test('reporte mensual del servicio social (24 de agosto al 21 de febrero)', () => {
  nuevo();
  let r = A.reporteSS('2026-11-02');
  assert.equal(r.fecha, '2026-11-24');
  assert.equal(r.faltan, 22);
  A.marcarReporte('2026-11');
  assert.equal(A.reporteSS('2026-11-02').fecha, '2026-12-24');
  // vencido sin entregar: sigue saliendo
  A.marcarReporte('2026-11', false);
  r = A.reporteSS('2026-11-26');
  assert.equal(r.fecha, '2026-11-24');
  assert.equal(r.faltan, -2);
  // el mes en que empezó no tiene reporte; el último es en febrero
  assert.equal(A.reporteSS('2026-08-30').fecha, '2026-09-24');
  r = A.reporteSS('2027-02-10');
  assert.equal(r.fecha, '2027-02-24');
  assert.ok(r.ultimo);
  assert.equal(A.reporteSS('2027-03-01'), null);
  // día 31 en un mes de 30
  A.ss().dia = 31;
  assert.equal(A.reporteSS('2026-11-02').fecha, '2026-11-30');
  A.ss().avisos = false;
  assert.equal(A.reporteSS('2026-11-02'), null);
});

test('resumen de la mañana: gym, escuela, agenda, servicio social y checklist', () => {
  nuevo();
  // ayer hizo el viernes (posterior): el lunes toca jalón
  estado.entreno.sesiones = [{ id: 'x', fecha: '2026-10-30', fase: 'f1', rutina: 'f1e', nombre: 'Pierna', inicio: 0, fin: 1,
    ejercicios: [{ ej: 'remo_pecho', series: [{ kg: 40, reps: 8, hecho: true }] }] }];
  A.guardarPendiente({ titulo: 'Examen parcial', tipo: 'examen', fecha: '2026-11-03' });
  const d = R.resumenes(7, '2026-11-02');
  assert.equal(Object.keys(d).length, 7);
  assert.equal(d['2026-11-02'].titulo, 'Hoy toca Jalón: espalda y bíceps');
  assert.equal(d['2026-11-03'].titulo, 'Hoy toca Pierna: cuádriceps');
  assert.equal(d['2026-11-07'].titulo, 'Hoy descansas del gym');
  const lunes = d['2026-11-02'].texto;
  assert.match(lunes, /Gym a las 7:45 am\. La vez pasada: remo bajo con apoyo de pecho 40 kg/);
  assert.match(lunes, /Escuela de 12:00 pm a 5:00 pm/);
  assert.match(lunes, /Examen parcial: mañana/);
  assert.match(lunes, /regar a Maboroshi e Ibuki, un rato de guitarra/);
  assert.match(lunes, /Desayuno 6:00 am, comida 11:00 am, cena 6:00 pm y a dormir a las 8:45 pm/);
  assert.doesNotMatch(d['2026-11-07'].texto, /Escuela/);
  assert.match(R.resumenes(1, '2026-11-20')['2026-11-20'].texto, /Reporte del servicio social: en 4 días/);
});

test('migración: el horario de la 1.1 pasa al nuevo y el checklist suma plantas y guitarra', () => {
  mem.clear();
  mem.set('gym:meta', JSON.stringify({ version: 2 }));
  mem.set('gym:config', JSON.stringify({
    onboarding: true, fase: 'f1', dias: { f1: [1, 2, 3, 4, 5] },
    horario: { desayuno: '07:15', comida: '11:15', colacion: '15:00', cena: '19:00', dormir: '20:45' },
    checklist: ['creatina', 'pasos'],
  }));
  cargar();
  const h = horario();
  assert.equal(h.desayuno, '06:00');
  assert.equal(h.gym, '07:45');
  assert.equal(h.comida, '11:00');
  assert.equal(h.escuela, '12:00');
  assert.equal(h.cena, '19:00', 'lo que él cambió se respeta');
  assert.deepEqual(estado.config.checklist, ['creatina', 'pasos', 'plantas', 'guitarra']);
  assert.ok(estado.agenda && Array.isArray(estado.agenda.pendientes));
  guardarYa();
  assert.equal(JSON.parse(mem.get('gym:meta')).version, 3);
  // ya migrado: no se vuelve a tocar
  estado.config.horario.desayuno = '07:15';
  store.marcar('config');
  guardarYa();
  cargar();
  assert.equal(horario().desayuno, '07:15');
});
