// Cálculos: calorías, tendencia de peso, progresión de pesos, fases, XP, plan de comida y súper.
import { estado } from './store.js';
import { FASES, FASE, RUTINAS } from './datos/programa.js';
import { EJ } from './datos/ejercicios.js';
import { AL, TIENDAS } from './datos/alimentos.js';
import { MENU, MENUS, REPARTO, TIEMPOS } from './datos/menus.js';
import { hoy, diaSemana, diasEntre, sumarDias, lunesDe, redondea, clamp, deClave } from './util.js';

// ================= Perfil y calorías =================

export function edad(perfil = estado.perfil) {
  if (perfil.nacimiento) {
    const n = deClave(perfil.nacimiento);
    const h = new Date();
    let e = h.getFullYear() - n.getFullYear();
    if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e--;
    if (e > 10 && e < 100) return e;
  }
  return Number(perfil.edad) || 25;
}

export function registrosPeso() {
  return [...estado.peso.registros].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
}

export function pesoActual() {
  const r = registrosPeso();
  if (r.length) return r[r.length - 1].kg;
  return Number(estado.perfil.pesoInicial) || null;
}

export function pesoInicial() {
  const r = registrosPeso();
  return Number(estado.perfil.pesoInicial) || (r.length ? r[0].kg : null);
}

// Promedio de los últimos 7 días y ritmo semanal (regresión de los últimos 21 días)
export function tendencia() {
  const r = registrosPeso();
  if (!r.length) return { promedio: pesoInicial(), ritmo: null, dias: 0, n: 0 };
  const hoyK = hoy();
  const ult7 = r.filter((x) => diasEntre(x.fecha, hoyK) <= 6 && diasEntre(x.fecha, hoyK) >= 0);
  const base = ult7.length ? ult7 : [r[r.length - 1]];
  const promedio = base.reduce((s, x) => s + x.kg, 0) / base.length;
  const ventana = r.filter((x) => diasEntre(x.fecha, hoyK) <= 21);
  let ritmo = null;
  let dias = 0;
  if (ventana.length >= 4) {
    dias = diasEntre(ventana[0].fecha, ventana[ventana.length - 1].fecha);
    if (dias >= 7) {
      const xs = ventana.map((x) => diasEntre(ventana[0].fecha, x.fecha));
      const ys = ventana.map((x) => x.kg);
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
      const my = ys.reduce((a, b) => a + b, 0) / ys.length;
      let num = 0;
      let den = 0;
      xs.forEach((x, i) => {
        num += (x - mx) * (ys[i] - my);
        den += (x - mx) ** 2;
      });
      ritmo = den ? (num / den) * 7 : null;
    }
  }
  return { promedio, ritmo, dias, n: r.length };
}

export function objetivos() {
  const p = estado.perfil;
  const peso = pesoActual() || 80;
  const e = edad(p);
  const bmr = 10 * peso + 6.25 * (Number(p.estatura) || 170) - 5 * e + (p.sexo === 'm' ? -161 : 5);
  const tdee = bmr * (Number(p.actividad) || 1.45);
  const meta = Number(p.meta) || 75;
  const llegaste = peso <= meta + 0.3;
  const deficit = { suave: 0.15, normal: 0.2, rapido: 0.25 }[p.ritmo] ?? 0.2;
  let kcal = llegaste ? tdee : tdee * (1 - deficit);
  kcal += Number(p.kcalAjuste) || 0;
  const piso = p.sexo === 'm' ? 1200 : 1500;
  kcal = Math.max(piso, Math.round(kcal / 10) * 10);
  const pesoRef = Math.min(peso, Math.max(meta, 45));
  const prot = clamp(Math.round((2 * pesoRef) / 5) * 5, 90, 220);
  const grasa = Math.max(Math.round(0.8 * pesoRef), Math.round((kcal * 0.25) / 9));
  const carbs = Math.max(80, Math.round((kcal - prot * 4 - grasa * 9) / 4));
  // kg por semana esperados con este déficit (7,700 kcal ≈ 1 kg de grasa)
  const esperado = llegaste ? 0 : -((tdee - kcal) * 7) / 7700;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, p: prot, c: carbs, g: grasa, modo: llegaste ? 'mantener' : 'deficit', esperado, meta };
}

// Sugerencia para ajustar calorías según cómo vas bajando
export function sugerenciaAjuste() {
  const t = tendencia();
  const o = objetivos();
  if (o.modo !== 'deficit' || t.ritmo === null || t.dias < 14) return null;
  const ult = estado.perfil.ultimoAjuste;
  if (ult && diasEntre(ult, hoy()) < 14) return null;
  const pct = (t.ritmo / t.promedio) * 100;
  if (pct > -0.25) return { delta: -150, texto: 'Llevas 2 semanas casi sin bajar. Quítale 150 kcal al día.' };
  if (pct < -1.2) return { delta: 150, texto: 'Vas bajando muy rápido y puedes perder músculo. Súbele 150 kcal al día.' };
  return null;
}

export function proyeccion() {
  const t = tendencia();
  const o = objetivos();
  const actual = t.promedio;
  if (!actual || actual <= o.meta) return null;
  const falta = actual - o.meta;
  const res = { falta };
  if (t.ritmo !== null && t.ritmo < -0.05) {
    const semanas = falta / -t.ritmo;
    res.real = { semanas, fecha: sumarDias(hoy(), Math.round(semanas * 7)) };
  }
  if (o.esperado < 0) {
    const semanas = falta / -o.esperado;
    res.plan = { semanas, fecha: sumarDias(hoy(), Math.round(semanas * 7)) };
  }
  return res;
}

// ================= Entrenamiento =================

export const faseActual = () => FASE[estado.config.fase] || FASES[0];
export const sesiones = () => estado.entreno.sesiones;
export const sesionesFase = (id) => estado.entreno.sesiones.filter((s) => s.fase === id);

export function siguienteRutina() {
  const f = faseActual();
  const ses = sesionesFase(f.id);
  const ultima = ses[ses.length - 1];
  if (!ultima || !f.rotacion.includes(ultima.rutina)) {
    // La primera de la fase es la que le toca al día de hoy (lunes jalón, martes pierna…)
    const dias = diasEntreno();
    const i = dias.indexOf(diaSemana(hoy()));
    if (i >= 0 && f.rotacion.length % dias.length === 0) return RUTINAS[f.rotacion[i]];
    return RUTINAS[f.rotacion[0]];
  }
  const i = f.rotacion.indexOf(ultima.rutina);
  return RUTINAS[f.rotacion[(i + 1) % f.rotacion.length]];
}

export function diasEntreno() {
  const f = faseActual();
  const d = estado.config.dias && estado.config.dias[f.id];
  return Array.isArray(d) && d.length ? d : f.diasDefault;
}

export const esDiaDeEntreno = (fecha = hoy()) => diasEntreno().includes(diaSemana(fecha));
export const sesionDe = (fecha) => estado.entreno.sesiones.filter((s) => s.fecha === fecha);

export function semanaFase() {
  return Math.max(1, Math.floor(diasEntre(estado.config.faseInicio || hoy(), hoy()) / 7) + 1);
}

export function esDescarga() {
  const f = faseActual();
  return f.descarga > 0 && semanaFase() % f.descarga === 0;
}

export function e1rm(kg, reps) {
  kg = Number(kg) || 0;
  reps = Number(reps) || 0;
  if (!kg || !reps) return 0;
  if (reps === 1) return kg;
  return kg * (1 + Math.min(reps, 15) / 30);
}

// Series hechas de un ejercicio, de la sesión más reciente a la más vieja
export function historial(ejId, excluirId = null) {
  const r = [];
  const ses = estado.entreno.sesiones;
  for (let i = ses.length - 1; i >= 0; i--) {
    const s = ses[i];
    if (s.id === excluirId) continue;
    for (const ej of s.ejercicios || []) {
      if (ej.ej !== ejId) continue;
      const hechas = (ej.series || []).filter((x) => x.hecho);
      if (hechas.length) r.push({ fecha: s.fecha, sesion: s.id, series: hechas, plan: ej.plan || null });
    }
  }
  return r;
}

export function mejorMarca(ejId, excluirId = null) {
  let mejor = null;
  for (const h of historial(ejId, excluirId)) {
    for (const s of h.series) {
      const v = e1rm(s.kg, s.reps);
      if (v && (!mejor || v > mejor.e1rm)) mejor = { e1rm: v, kg: Number(s.kg), reps: Number(s.reps), fecha: h.fecha };
    }
  }
  return mejor;
}

const pesoDe = (s) => Number(s.kg) || 0;

export function sugerencia(item, ejId, excluirId = null) {
  const ej = EJ[ejId] || {};
  const rango = item.reps || item.seg || [8, 12];
  const [min, max] = rango;
  const porTiempo = !!item.seg;
  const todo = historial(ejId, excluirId);
  // La doble progresión compara contra la última vez con el mismo rango
  // (en la fase pro el mismo ejercicio va pesado una semana y con volumen la otra).
  const mismoRango = (x) => !x.plan || (porTiempo ? !!x.plan.seg : !!x.plan.reps && x.plan.reps[0] === min && x.plan.reps[1] === max);
  const h = todo.filter(mismoRango);
  const ultima = h[0];
  if (!ultima && todo.length && !porTiempo && ej.inc > 0 && ej.carga !== 'corporal') {
    const marca = Math.max(0, ...todo[0].series.map((s) => e1rm(s.kg, s.reps)));
    if (marca > 0) {
      const paso = ej.carga === 'mancuerna' ? 1 : 2.5;
      const kg = Math.max(0, redondea(marca / (1 + Math.min(max, 15) / 30), paso));
      return { tipo: 'nuevo', kg, texto: `Cambió el rango a ${min}–${max}: empieza con unos ${kg} kg (sale de tu marca) y ajusta.` };
    }
  }
  if (!ultima) {
    if (porTiempo) return { tipo: 'nuevo', kg: null, texto: `Aguanta de ${min} a ${max} segundos con el cuerpo recto.` };
    if (ej.carga === 'corporal') return { tipo: 'nuevo', kg: null, texto: `Haz de ${min} a ${max} repeticiones con buena técnica.` };
    return { tipo: 'nuevo', kg: null, texto: `Primera vez: busca un peso con el que llegues a ${max} repeticiones dejando ${item.rir} en reserva.` };
  }
  const kgUsado = Math.max(...ultima.series.map(pesoDe));
  if (porTiempo) {
    const todas = ultima.series.length >= item.series && ultima.series.every((s) => (Number(s.seg) || 0) >= max);
    return todas
      ? { tipo: 'subir', seg: max + 10, texto: `La vez pasada aguantaste ${max} s en todas. Hoy intenta ${max + 10} s.` }
      : { tipo: 'igual', texto: 'Busca aguantar unos segundos más que la vez pasada.' };
  }
  const completas = ultima.series.length >= item.series && ultima.series.every((s) => (Number(s.reps) || 0) >= max);
  const fallo = ultima.series.some((s) => (Number(s.reps) || 0) < min);
  if (!ej.inc) {
    return completas
      ? { tipo: 'subir', kg: kgUsado || null, texto: `Ya dominas ${max} repeticiones: bájalas más lento (3 s) o agrega peso.` }
      : { tipo: 'igual', kg: kgUsado || null, texto: 'Busca 1 repetición más por serie que la vez pasada.' };
  }
  const asistida = ej.inc < 0;
  if (completas) {
    const nuevo = Math.max(0, redondea(kgUsado + ej.inc, 0.5));
    return asistida
      ? { tipo: 'subir', kg: nuevo, texto: `Lo lograste todo: baja la asistencia a ${nuevo} kg.` }
      : { tipo: 'subir', kg: nuevo, texto: `Hiciste ${max} en todas: sube a ${nuevo} kg.` };
  }
  if (fallo) {
    const anterior = h[1];
    const falloAntes =
      anterior && anterior.series.some((s) => (Number(s.reps) || 0) < min) && Math.max(...anterior.series.map(pesoDe)) === kgUsado;
    if (falloAntes) {
      const facil = Math.max(0, redondea(asistida ? kgUsado + Math.abs(ej.inc) : kgUsado - Math.abs(ej.inc), 0.5));
      return { tipo: 'bajar', kg: facil, texto: `Dos sesiones sin llegar a ${min}: ponle ${facil} kg y vuelve a subir.` };
    }
    return { tipo: 'igual', kg: kgUsado, texto: `Quédate en ${kgUsado} kg hasta llegar a ${min}–${max} en todas.` };
  }
  return { tipo: 'igual', kg: kgUsado, texto: `Mismo peso (${kgUsado} kg) y busca 1 repetición más por serie.` };
}

// Series de aproximación para el primer ejercicio (el básico del día).
// pesado = rango de 6 o menos: se agrega una de 3 al 85 %. Con barra nunca baja de la barra vacía (20 kg).
export function aproximacion(kgTrabajo, ej, pesado = false) {
  if (!kgTrabajo || !ej || !['barra', 'maquina', 'mancuerna', 'polea'].includes(ej.carga)) return null;
  const paso = ej.carga === 'mancuerna' ? 1 : 2.5;
  const minimo = ej.carga === 'barra' ? 20 : 0;
  const pasos = pesado ? [[8, 0.5], [5, 0.7], [3, 0.85]] : [[10, 0.5], [6, 0.7]];
  const s = [];
  for (const [reps, pct] of pasos) {
    const k = Math.max(minimo, redondea(kgTrabajo * pct, paso));
    if (k >= kgTrabajo || (s.length && s[s.length - 1][1] === k)) continue;
    s.push([reps, k]);
  }
  return s.length ? s : null;
}

export function requisitos(fase = faseActual()) {
  const req = fase.requisito || {};
  const items = [];
  const ses = sesionesFase(fase.id);
  let cumple = true;
  if (req.sesiones) {
    const hecho = ses.length >= req.sesiones;
    cumple = cumple && hecho;
    items.push({ texto: `Entrenamientos en esta fase`, actual: ses.length, meta: req.sesiones, hecho });
  }
  if (req.progresos) {
    const ids = new Set();
    ses.forEach((s) => (s.ejercicios || []).forEach((e) => ids.add(e.ej)));
    let n = 0;
    for (const id of ids) {
      const marcas = [];
      for (const s of ses) {
        for (const e of s.ejercicios || []) {
          if (e.ej !== id) continue;
          const v = Math.max(0, ...(e.series || []).filter((x) => x.hecho).map((x) => e1rm(x.kg, x.reps) || Number(x.reps) || 0));
          if (v) marcas.push(v);
        }
      }
      if (marcas.length >= 2 && Math.max(...marcas.slice(1)) > marcas[0] + 0.4) n++;
    }
    const hecho = n >= req.progresos;
    cumple = cumple && hecho;
    items.push({ texto: 'Ejercicios en los que mejoraste', actual: n, meta: req.progresos, hecho });
  }
  if (req.marcas) {
    const peso = pesoActual() || 80;
    let logradas = 0;
    for (const [ejId, factor, reps] of req.marcas) {
      const objetivo = redondea(factor * peso, 0.5);
      let hecho = false;
      for (const h of historial(ejId)) {
        for (const s of h.series) {
          if (reps === 1 ? e1rm(s.kg, s.reps) >= objetivo : Number(s.kg) >= objetivo && Number(s.reps) >= reps) hecho = true;
        }
      }
      if (hecho) logradas++;
      items.push({ texto: `${EJ[ejId].nombre}: ${objetivo} kg × ${reps} (${factor} × tu peso)`, hecho, marca: true });
    }
    const ok = logradas >= (req.minimoMarcas || req.marcas.length);
    cumple = cumple && ok;
  }
  return { cumple, items };
}

// ================= XP, nivel y racha =================

export function xpTotal() {
  let xp = 0;
  for (const s of estado.entreno.sesiones) xp += Number(s.xp) || 100;
  const meta = estado.config.aguaMeta || 12;
  for (const d of Object.values(estado.diario.dias)) {
    xp += Object.values(d.checks || {}).filter(Boolean).length * 5;
    if ((d.agua || 0) >= meta) xp += 10;
  }
  xp += estado.peso.registros.length * 5;
  for (const regs of Object.values(estado.comida.dias)) if (regs.length >= 3) xp += 10;
  return xp;
}

const TITULOS = ['Novato', 'Constante', 'Disciplinado', 'Fierro', 'Bestia', 'Leyenda'];
export function nivel(xp = xpTotal()) {
  let n = 1;
  let desde = 0;
  let falta = 300;
  while (xp >= desde + falta) {
    desde += falta;
    n++;
    falta = 300 + 50 * (n - 1);
  }
  return { n, xp, desde, hasta: desde + falta, pct: (xp - desde) / falta, titulo: TITULOS[Math.min(TITULOS.length - 1, Math.floor((n - 1) / 4))] };
}

export function rachaSemanas() {
  const meta = Math.max(2, diasEntreno().length - 1);
  const porSemana = {};
  for (const s of estado.entreno.sesiones) {
    const l = lunesDe(s.fecha);
    porSemana[l] = (porSemana[l] || 0) + 1;
  }
  let lunes = lunesDe(hoy());
  let racha = 0;
  if ((porSemana[lunes] || 0) >= meta) racha++;
  lunes = sumarDias(lunes, -7);
  while ((porSemana[lunes] || 0) >= meta) {
    racha++;
    lunes = sumarDias(lunes, -7);
  }
  return { racha, meta, estaSemana: porSemana[lunesDe(hoy())] || 0 };
}

// ================= Comida =================

export const kcalDe = (a, cant) => (a.kcal * cant) / a.base;

export function nutrientes(id, cant) {
  const a = AL[id];
  if (!a) return { kcal: 0, p: 0, c: 0, g: 0 };
  const f = cant / a.base;
  return { kcal: a.kcal * f, p: a.p * f, c: a.c * f, g: a.g * f };
}

const ENTEROS = new Set(['tortilla', 'tortilla_harina', 'tostadas', 'huevo', 'pan']);
export function redondeoCantidad(id, q) {
  const a = AL[id];
  if (!a) return q;
  if (a.unidad === 'g' || a.unidad === 'ml') return Math.max(10, redondea(q, 10));
  if (ENTEROS.has(id)) return Math.max(1, Math.round(q));
  return Math.max(0.5, redondea(q, 0.5));
}

export function escalarMenu(menu, kcalObjetivo) {
  let fijo = 0;
  let variable = 0;
  for (const [id, cant, rol] of menu.ingredientes) {
    const k = kcalDe(AL[id], cant);
    if (rol === 'c' || rol === 'g') variable += k;
    else fijo += k;
  }
  const f = variable > 0 ? clamp((kcalObjetivo - fijo) / variable, 0.5, 2.2) : 1;
  const items = menu.ingredientes.map(([id, cant, rol]) => {
    const q = rol === 'c' || rol === 'g' ? redondeoCantidad(id, cant * f) : cant;
    return { id, cant: q, rol, ...nutrientes(id, q) };
  });
  const t = items.reduce((s, x) => ({ kcal: s.kcal + x.kcal, p: s.p + x.p, c: s.c + x.c, g: s.g + x.g }), { kcal: 0, p: 0, c: 0, g: 0 });
  return { menu, items, ...t };
}

// En la rotación automática solo entran los menús sin "auto: false" (p. ej. el licuado de proteína en polvo)
const listaTiempo = {};
const todasTiempo = {};
TIEMPOS.forEach(([t]) => {
  todasTiempo[t] = MENUS.filter((m) => m.tiempo === t);
  listaTiempo[t] = todasTiempo[t].filter((m) => m.auto !== false);
});
const OFFSET = { desayuno: 0, comida: 2, cena: 4, colacion: 1 };

export function menuDelDia(fecha) {
  const cambios = estado.plan.cambios[fecha] || {};
  const i = diasEntre('2026-01-05', fecha);
  const r = {};
  for (const [t] of TIEMPOS) {
    const l = listaTiempo[t];
    const elegido = cambios[t] && MENU[cambios[t]] ? cambios[t] : l[(((i + OFFSET[t]) % l.length) + l.length) % l.length].id;
    r[t] = elegido;
  }
  return r;
}

export function opcionesTiempo(t) {
  return todasTiempo[t] || [];
}

export function planDelDia(fecha, kcal = objetivos().kcal) {
  const ids = menuDelDia(fecha);
  const r = {};
  for (const [t] of TIEMPOS) r[t] = escalarMenu(MENU[ids[t]], kcal * REPARTO[t]);
  return r;
}

export function totalesDia(fecha) {
  const regs = estado.comida.dias[fecha] || [];
  return regs.reduce(
    (s, x) => ({ kcal: s.kcal + (Number(x.kcal) || 0), p: s.p + (Number(x.p) || 0), c: s.c + (Number(x.c) || 0), g: s.g + (Number(x.g) || 0) }),
    { kcal: 0, p: 0, c: 0, g: 0 }
  );
}

// Precio con lo que el usuario haya corregido
export function precio(id, tienda) {
  const a = AL[id];
  const base = a && a.precios[tienda];
  const propio = estado.precios[id] && estado.precios[id][tienda];
  if (propio !== undefined && propio !== null && propio !== '') {
    if (base) return [Number(propio), base[1], base[2], false, true];
    return null;
  }
  return base ? [base[0], base[1], base[2], !!base[3], false] : null;
}

const esGranel = (pres) => /^kg/.test(pres) || /^manojo/.test(pres) || /^pieza/.test(pres);

// costo = lo que cuesta lo que te comes en la semana. Lo de despensa (arroz, avena, aceite…)
// se compra por paquete pero te dura varias semanas, así que solo se cuenta la parte que usas.
export function costoEn(id, cantidad, tienda) {
  const pr = precio(id, tienda);
  if (!pr) return null;
  const [p, pres, rinde, est] = pr;
  if (esGranel(pres)) {
    const unidades = cantidad / rinde;
    return { costo: unidades * p, paquetes: unidades, granel: true, pres, est, precio: p };
  }
  const paquetes = Math.max(1, Math.ceil(cantidad / rinde - 0.05));
  const dura = !!(AL[id] && AL[id].despensa) && cantidad < paquetes * rinde * 0.9;
  return { costo: dura ? (cantidad / rinde) * p : paquetes * p, paquetes, granel: false, pres, est, precio: p, dura, caja: paquetes * p };
}

export function listaSuper(lunes = lunesDe(hoy()), dias = 7) {
  const kcal = objetivos().kcal;
  const total = {};
  for (let d = 0; d < dias; d++) {
    const fecha = sumarDias(lunes, d);
    const plan = planDelDia(fecha, kcal);
    for (const t of Object.keys(plan)) {
      for (const it of plan[t].items) total[it.id] = (total[it.id] || 0) + it.cant;
    }
  }
  const items = Object.entries(total)
    .map(([id, cantidad]) => {
      const a = AL[id];
      const tiendas = {};
      let mejor = null;
      for (const t of TIENDAS) {
        const c = costoEn(id, cantidad, t.id);
        tiendas[t.id] = c;
        if (c && (!mejor || c.costo < tiendas[mejor].costo)) mejor = t.id;
      }
      return { id, a, cantidad, tiendas, mejor };
    })
    .sort((x, y) => (x.a.cat === y.a.cat ? x.a.nombre.localeCompare(y.a.nombre) : x.a.cat.localeCompare(y.a.cat)));
  const totales = {};
  for (const t of TIENDAS) {
    let suma = 0;
    let faltan = 0;
    for (const it of items) {
      if (it.tiendas[t.id]) suma += it.tiendas[t.id].costo;
      else faltan++;
    }
    totales[t.id] = { suma, faltan };
  }
  const combinado = items.reduce((s, it) => s + (it.mejor ? it.tiendas[it.mejor].costo : 0), 0);
  return { lunes, items, totales, combinado };
}
