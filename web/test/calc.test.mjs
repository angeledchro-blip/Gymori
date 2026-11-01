// Pruebas de los cálculos y de que los datos estén completos (rutinas, menús, fotos).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { estado, cargar } from '../public/js/store.js';
import * as C from '../public/js/calc.js';
import { EJ, EJERCICIOS, imagenes } from '../public/js/datos/ejercicios.js';
import { FASES, RUTINAS, CALENTAMIENTOS, ENFRIAMIENTO } from '../public/js/datos/programa.js';
import { AL, ALIMENTOS, TIENDAS } from '../public/js/datos/alimentos.js';
import { MENUS, REPARTO } from '../public/js/datos/menus.js';
import { hoy, sumarDias, lunesDe } from '../public/js/util.js';

const publico = fileURLToPath(new URL('../public/', import.meta.url));

function reiniciar() {
  cargar();
  Object.assign(estado.perfil, { sexo: 'h', nacimiento: '2003-12-06', estatura: 172, pesoInicial: 88, meta: 75, actividad: 1.45, ritmo: 'normal', kcalAjuste: 0 });
  estado.peso.registros = [];
  estado.entreno.sesiones = [];
  estado.config.fase = 'f1';
}

test('todas las rutinas usan ejercicios que existen y tienen foto', () => {
  for (const f of FASES) for (const id of f.rotacion) assert.ok(RUTINAS[id], `falta rutina ${id}`);
  for (const r of Object.values(RUTINAS)) {
    for (const e of r.ejercicios) {
      assert.ok(EJ[e.ej], `${r.id}: no existe ${e.ej}`);
      for (const a of e.alt || []) assert.ok(EJ[a], `${r.id}: alternativa ${a} no existe`);
      assert.ok(e.reps || e.seg, `${r.id}/${e.ej} sin rango`);
      assert.ok(e.desc > 0);
    }
    if (r.cardio) assert.ok(EJ[r.cardio.ej]);
  }
  for (const c of Object.values(CALENTAMIENTOS)) for (const [id] of c.movs) assert.ok(EJ[id], id);
  for (const l of Object.values(ENFRIAMIENTO)) for (const [id] of l) assert.ok(EJ[id], id);
  for (const e of EJERCICIOS) for (const img of imagenes(e.id)) assert.ok(existsSync(publico + img), `falta ${img}`);
});

test('menús usan alimentos que existen y los alimentos tienen precios coherentes', () => {
  for (const m of MENUS) for (const [id, cant, rol] of m.ingredientes) {
    assert.ok(AL[id], `${m.id}: no existe ${id}`);
    assert.ok(cant > 0 && 'pvcg'.includes(rol), `${m.id}/${id}`);
  }
  for (const a of ALIMENTOS) {
    const tiendas = Object.keys(a.precios);
    assert.ok(tiendas.length >= 1, `${a.id} sin precios`);
    for (const t of tiendas) {
      assert.ok(TIENDAS.some((x) => x.id === t), `${a.id}: tienda ${t}`);
      const [p, pres, rinde] = a.precios[t];
      assert.ok(p > 0 && pres && rinde > 0, `${a.id}/${t}`);
    }
    // energía de los macros cerca de las kcal (±20 % o 15 kcal)
    const kcalMacros = a.p * 4 + a.c * 4 + a.g * 9;
    assert.ok(Math.abs(kcalMacros - a.kcal) <= Math.max(15, a.kcal * 0.2), `${a.id}: ${a.kcal} kcal vs ${kcalMacros.toFixed(0)} por macros`);
  }
});

test('calorías y macros salen razonables', () => {
  reiniciar();
  const o = C.objetivos();
  // 22 años, 88 kg, 172 cm: BMR ≈ 1,860; TDEE ≈ 2,700; con 20 % menos ≈ 2,160
  assert.ok(o.bmr > 1800 && o.bmr < 1920, 'bmr ' + o.bmr);
  assert.ok(o.kcal > 2050 && o.kcal < 2250, 'kcal ' + o.kcal);
  assert.equal(o.p, 150);
  assert.ok(Math.abs(o.p * 4 + o.c * 4 + o.g * 9 - o.kcal) < 40);
  assert.equal(o.modo, 'deficit');
  assert.ok(o.esperado < -0.4 && o.esperado > -0.8, 'esperado ' + o.esperado);
  estado.peso.registros = [{ fecha: hoy(), kg: 75 }];
  assert.equal(C.objetivos().modo, 'mantener');
});

test('tendencia y sugerencia de ajuste', () => {
  reiniciar();
  for (let i = 20; i >= 0; i--) estado.peso.registros.push({ fecha: sumarDias(hoy(), -i), kg: 88 - (20 - i) * 0.08 });
  const t = C.tendencia();
  assert.ok(t.ritmo < -0.5 && t.ritmo > -0.6, 'ritmo ' + t.ritmo);
  assert.equal(C.sugerenciaAjuste(), null);
  const p = C.proyeccion();
  assert.ok(p.real && p.real.semanas > 15 && p.real.semanas < 30);
  // estancado
  estado.peso.registros = Array.from({ length: 15 }, (_, i) => ({ fecha: sumarDias(hoy(), -i), kg: 86 }));
  assert.equal(C.sugerenciaAjuste().delta, -150);
});

test('el plan del día se ajusta a las calorías', () => {
  reiniciar();
  for (const kcal of [1800, 2100, 2500]) {
    for (let d = 0; d < 7; d++) {
      const plan = C.planDelDia(sumarDias('2026-11-02', d), kcal);
      const total = Object.values(plan).reduce((s, x) => s + x.kcal, 0);
      const prot = Object.values(plan).reduce((s, x) => s + x.p, 0);
      assert.ok(Math.abs(total - kcal) / kcal < 0.15, `día ${d} a ${kcal}: ${total.toFixed(0)}`);
      assert.ok(prot > 95, `proteína baja: ${prot.toFixed(0)}`);
    }
  }
  for (const [t, r] of Object.entries(REPARTO)) assert.ok(r > 0, t);
});

test('lista del súper: cantidades y totales por tienda', () => {
  reiniciar();
  const l = C.listaSuper(lunesDe('2026-11-04'));
  assert.ok(l.items.length > 15);
  assert.ok(l.totales.bodega.suma > 300 && l.totales.bodega.suma < 2500, 'bodega ' + l.totales.bodega.suma);
  for (const t of ['bodega', 'walmart', 'ley']) {
    if (l.totales[t].faltan === 0) assert.ok(l.combinado <= l.totales[t].suma + 1, `combinado ${l.combinado} > ${t}`);
  }
  assert.ok(!l.items.some((x) => x.id === 'proteina'), 'la proteína en polvo no debe entrar sola al plan');
  const huevo = l.items.find((x) => x.id === 'huevo');
  if (huevo) assert.equal(huevo.tiendas.bodega.paquetes, Math.max(1, Math.ceil(huevo.cantidad / 30 - 0.05)));
  // precio corregido por el usuario
  estado.precios = { pechuga: { bodega: 100 } };
  assert.equal(C.precio('pechuga', 'bodega')[0], 100);
  estado.precios = {};
});

test('progresión de pesos (doble progresión)', () => {
  reiniciar();
  const plan = { ej: 'prensa', series: 3, reps: [12, 15], rir: 3, desc: 90 };
  assert.equal(C.sugerencia(plan, 'prensa').tipo, 'nuevo');
  const sesion = (fecha, series) => ({ id: fecha, fecha, inicio: 0, fin: 1, fase: 'f1', rutina: 'f1a', ejercicios: [{ ej: 'prensa', series: series.map(([kg, reps]) => ({ kg, reps, hecho: true })) }] });
  estado.entreno.sesiones = [sesion('2026-10-01', [[80, 15], [80, 15], [80, 15]])];
  let s = C.sugerencia(plan, 'prensa');
  assert.equal(s.tipo, 'subir');
  assert.equal(s.kg, 90);
  estado.entreno.sesiones = [sesion('2026-10-01', [[90, 13], [90, 12], [90, 12]])];
  assert.equal(C.sugerencia(plan, 'prensa').tipo, 'igual');
  estado.entreno.sesiones = [sesion('2026-10-01', [[90, 10], [90, 9], [90, 9]]), sesion('2026-10-03', [[90, 11], [90, 10], [90, 9]])];
  s = C.sugerencia(plan, 'prensa');
  assert.equal(s.tipo, 'bajar');
  assert.equal(s.kg, 80);
  // asistida: progresar = menos asistencia
  const planA = { ej: 'dominadas_asistidas', series: 2, reps: [6, 10], rir: 2, desc: 90 };
  estado.entreno.sesiones = [{ id: 'x', fecha: '2026-10-05', fase: 'f3', rutina: 'f3c', ejercicios: [{ ej: 'dominadas_asistidas', series: [{ kg: 30, reps: 10, hecho: true }, { kg: 30, reps: 10, hecho: true }] }] }];
  assert.equal(C.sugerencia(planA, 'dominadas_asistidas').kg, 25);
});

test('rotación de rutinas, requisitos de fase y nivel', () => {
  reiniciar();
  assert.equal(C.siguienteRutina().id, 'f1a');
  estado.entreno.sesiones = [{ id: 'a', fecha: hoy(), fase: 'f1', rutina: 'f1a', ejercicios: [], inicio: 0, fin: 1 }];
  assert.equal(C.siguienteRutina().id, 'f1b');
  let req = C.requisitos(FASES[0]);
  assert.equal(req.cumple, false);
  estado.entreno.sesiones = Array.from({ length: 8 }, (_, i) => ({ id: 's' + i, fecha: sumarDias(hoy(), -i * 2), fase: 'f1', rutina: i % 2 ? 'f1b' : 'f1a', ejercicios: [], xp: 100 }));
  req = C.requisitos(FASES[0]);
  assert.equal(req.cumple, true);
  const n = C.nivel(1000);
  assert.ok(n.n >= 3 && n.pct >= 0 && n.pct < 1);
  assert.equal(C.e1rm(100, 5).toFixed(1), '116.7');
});
