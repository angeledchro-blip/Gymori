// Comida: registro del día, plan sugerido, búsqueda de alimentos, plan semanal, súper y precios.
import { estado, marcar, horario } from '../store.js';
import { registrar, refrescar, ir } from '../nucleo.js';
import { esc, hoy, uid, num, pesos, fechaCorta, sumarDias, lunesDe, diaSemana, diaCorto, deClave, abrirHoja, cerrarHoja, aviso, redondea, hora12, minutosDe } from '../util.js';
import { icono } from '../iconos.js';
import { discoKcal, barraMacro } from '../graficos.js';
import { AL, ALIMENTOS, CATEGORIAS, TIENDAS, unidadTexto } from '../datos/alimentos.js';
import { MENU, TIEMPOS, REPARTO } from '../datos/menus.js';
import { objetivos, totalesDia, planDelDia, opcionesTiempo, escalarMenu, nutrientes, listaSuper, precio, costoEn, redondeoCantidad } from '../calc.js';

let diaSel = null;
const NOMBRE_T = Object.fromEntries(TIEMPOS);

function horaAhora() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// La comida más cercana a la hora actual según tu horario
function tiempoSugerido() {
  const d = new Date();
  const ahora = d.getHours() * 60 + d.getMinutes();
  const h = horario();
  let mejor = 'comida';
  let dist = Infinity;
  for (const [t] of TIEMPOS) {
    const m = minutosDe(h[t]);
    if (m === null) continue;
    const x = Math.abs(ahora - m);
    if (x < dist) {
      dist = x;
      mejor = t;
    }
  }
  return mejor;
}

const FRAC = [[0.25, '¼'], [0.33, '⅓'], [0.5, '½'], [0.66, '⅔'], [0.75, '¾']];
function tazas(r) {
  const entero = Math.floor(r + 0.06);
  const resto = r - entero;
  let f = '';
  if (resto > 0.12) {
    const cerca = FRAC.reduce((m, x) => (Math.abs(x[0] - resto) < Math.abs(m[0] - resto) ? x : m));
    f = cerca[1];
  }
  return `${entero || ''}${f}` || '1';
}

export function cantidadTexto(id, cant) {
  const a = AL[id];
  if (!a) return String(cant);
  if (a.unidad === 'g' || a.unidad === 'ml') {
    let extra = '';
    if (a.casera) {
      const [g, txt] = a.casera;
      const r = cant / g;
      if (/^1 taza/.test(txt) && r >= 0.2 && r <= 3) extra = ` (≈ ${tazas(r)} ${r > 1.2 ? 'tazas' : 'taza'}${txt.includes('picada') ? ' picada' : ''})`;
      else if (r >= 0.85 && r <= 1.15) extra = ` (≈ ${txt})`;
    }
    return `${num(cant)} ${a.unidad}${extra}`;
  }
  const n = Number.isInteger(cant) ? String(cant) : String(cant).replace('.5', '½').replace(/^0½/, '½');
  return `${n} ${unidadTexto(a.unidad, cant)}`;
}

function costoDia(plan) {
  let total = 0;
  for (const t of Object.keys(plan)) {
    for (const it of plan[t].items) {
      let mejor = null;
      for (const tienda of TIENDAS) {
        const pr = precio(it.id, tienda.id);
        if (!pr) continue;
        const unidad = pr[0] / pr[2];
        if (mejor === null || unidad < mejor) mejor = unidad;
      }
      if (mejor !== null) total += mejor * it.cant;
    }
  }
  return total;
}

// ---------- Pantalla principal de comida ----------
function semanaSelector() {
  const lunes = lunesDe(diaSel);
  return `<div class="dias-semana">${Array.from({ length: 7 }, (_, i) => {
    const f = sumarDias(lunes, i);
    return `<button class="dia-btn ${f === diaSel ? 'activo' : ''} ${f === hoy() ? 'hoy' : ''}" data-a="com:dia" data-v="${f}"><span class="mini">${diaCorto(i + 1)}</span><b>${deClave(f).getDate()}</b></button>`;
  }).join('')}</div>
  <div class="cabeza-fila"><button class="enlace" data-a="com:semana" data-d="-7">${icono('atras')} Semana pasada</button>${lunes !== lunesDe(hoy()) ? '<button class="enlace" data-a="com:dia" data-v="' + hoy() + '">Ir a hoy</button>' : '<button class="enlace" data-a="com:semana" data-d="7">Siguiente semana</button>'}</div>`;
}

function renderComida() {
  if (!diaSel) diaSel = hoy();
  const o = objetivos();
  const t = totalesDia(diaSel);
  const resta = Math.round(o.kcal - t.kcal);
  const regs = estado.comida.dias[diaSel] || [];
  const plan = planDelDia(diaSel, o.kcal);
  const bloques = TIEMPOS.map(([tid, nombre]) => {
    const mios = regs.filter((r) => r.t === tid);
    const kcalT = mios.reduce((s, r) => s + (Number(r.kcal) || 0), 0);
    const p = plan[tid];
    const yaComido = mios.some((r) => r.origen === 'plan' && r.ref === p.menu.id);
    return `<section class="tiempo-comida">
      <div class="tiempo-cabeza"><h3>${esc(nombre)} <span class="hora-tiempo">${esc(hora12(horario()[tid]))}</span></h3><span class="tenue chico">${mios.length ? `${num(kcalT)} kcal` : `meta ≈ ${num(o.kcal * REPARTO[tid])} kcal`}</span></div>
      ${mios
        .map((r) => `<div class="registro"><span class="fila-cuerpo"><span class="fila-titulo">${esc(r.nombre)}</span><span class="fila-sub" style="display:block">${num(r.kcal)} kcal, ${num(r.p)} g proteína${r.cantTexto ? ', ' + esc(r.cantTexto) : ''}</span></span><button class="quitar" data-a="com:quitar" data-id="${r.id}" aria-label="Quitar ${esc(r.nombre)}">${icono('cerrar')}</button></div>`)
        .join('')}
      ${yaComido ? '' : `<div class="plan-sugerido">
        <div class="cabeza-fila"><span class="fila-titulo">${esc(p.menu.nombre)}</span><span class="etiqueta">${num(p.kcal)} kcal</span></div>
        <ul class="ingredientes">${p.items.map((it) => `<li>${esc(cantidadTexto(it.id, it.cant))} de ${esc(AL[it.id].nombre.toLowerCase())}</li>`).join('')}</ul>
        <p class="tenue chico" style="margin:6px 0 0">${num(p.p)} g de proteína. ${esc(p.menu.pasos)}</p>
        <div class="fila-botones">
          <button class="boton primario chico" data-a="com:comi" data-t="${tid}">Me lo comí</button>
          <button class="boton secundario chico" data-a="com:cambiar" data-t="${tid}">Cambiar</button>
        </div>
      </div>`}
      <button class="enlace" data-a="com:agregar" data-t="${tid}">${icono('sumar')} Agregar otra cosa</button>
    </section>`;
  }).join('');
  return `<header class="cabeza"><span class="cabeza-fecha">${diaSel === hoy() ? 'Hoy' : esc(fechaCorta(diaSel))}, plan de ≈ ${pesos(costoDia(plan))} al día</span><h1 class="cabeza-titulo">Comida</h1></header>
    ${semanaSelector()}
    <div class="resumen-dia">
      <div class="disco">${discoKcal(t.kcal, o.kcal)}<div class="disco-centro"><span class="numero">${num(Math.abs(resta))}</span><small>${resta >= 0 ? 'kcal te quedan' : 'kcal de más'}</small></div></div>
      <div class="macros">
        <div class="macro-fila"><span>Proteína</span><b>${num(t.p)} / ${o.p} g</b>${barraMacro(t.p, o.p, '#aab757')}</div>
        <div class="macro-fila"><span>Carbos</span><b>${num(t.c)} / ${o.c} g</b>${barraMacro(t.c, o.c, '#dba43f')}</div>
        <div class="macro-fila"><span>Grasa</span><b>${num(t.g)} / ${o.g} g</b>${barraMacro(t.g, o.g, '#c99e6b')}</div>
      </div>
    </div>
    <div class="agregar-rapido">
      <button data-a="ir" data-ruta="escaner/foto/${tiempoSugerido()}">${icono('camara')}Foto</button>
      <button data-a="ir" data-ruta="escaner/codigo/${tiempoSugerido()}">${icono('codigo')}Código</button>
      <button data-a="ir" data-ruta="buscar/${tiempoSugerido()}">${icono('buscar')}Buscar</button>
      <button data-a="com:manual" data-t="${tiempoSugerido()}">${icono('sumar')}Rápido</button>
    </div>
    ${bloques}
    <div class="pila-botones" style="margin-top:26px">
      <button class="boton secundario" data-a="ir" data-ruta="plan">${icono('plan')} Plan de la semana</button>
      <button class="boton secundario" data-a="ir" data-ruta="super">${icono('carrito')} Lista del súper con precios</button>
    </div>`;
}

export function agregarRegistro(fecha, r) {
  const dias = estado.comida.dias;
  if (!dias[fecha]) dias[fecha] = [];
  dias[fecha].push({ id: uid(), hora: horaAhora(), ...r, kcal: Math.round(r.kcal), p: Math.round(r.p * 10) / 10, c: Math.round(r.c * 10) / 10, g: Math.round(r.g * 10) / 10 });
  marcar('comida');
}

function hojaManual(t) {
  const panel = abrirHoja(`<h2 class="hoja-titulo">Agregar rápido</h2>
    <p class="hoja-texto">Para cuando ya sabes las calorías (por ejemplo, de la etiqueta).</p>
    <label class="campo"><span>¿Qué comiste?</span><input id="mNombre" placeholder="Tacos de asada" /></label>
    <div class="dos-columnas">
      <label class="campo"><span>Calorías</span><input id="mKcal" inputmode="numeric" placeholder="450" /></label>
      <label class="campo"><span>Proteína (g)</span><input id="mP" inputmode="decimal" placeholder="25" /></label>
      <label class="campo"><span>Carbos (g)</span><input id="mC" inputmode="decimal" placeholder="opcional" /></label>
      <label class="campo"><span>Grasa (g)</span><input id="mG" inputmode="decimal" placeholder="opcional" /></label>
    </div>
    ${chipsTiempo(t)}
    <div class="pila-botones"><button class="boton primario" id="mOk">Agregar</button></div>`);
  activarChips(panel);
  panel.querySelector('#mOk').onclick = () => {
    const nombre = panel.querySelector('#mNombre').value.trim() || 'Comida';
    const kcal = parseFloat(panel.querySelector('#mKcal').value);
    if (!kcal || kcal < 0) return aviso('Escribe las calorías.');
    const n = (s) => parseFloat(String(panel.querySelector(s).value).replace(',', '.')) || 0;
    agregarRegistro(diaSel || hoy(), { t: panel.dataset.t, nombre, kcal, p: n('#mP'), c: n('#mC'), g: n('#mG'), origen: 'manual' });
    cerrarHoja();
    aviso('Agregado.');
    refrescar();
  };
}

export function chipsTiempo(t) {
  return `<span class="campo-etiqueta">¿En qué comida?</span><div class="chips" data-chips-tiempo>${TIEMPOS.map(([id, nombre]) => `<button type="button" class="chip ${id === t ? 'activo' : ''}" data-t="${id}">${esc(nombre)}</button>`).join('')}</div>`;
}

export function activarChips(panel) {
  const cont = panel.querySelector('[data-chips-tiempo]');
  const act = cont.querySelector('.activo');
  panel.dataset.t = act ? act.dataset.t : 'comida';
  cont.querySelectorAll('.chip').forEach((c) => {
    c.onclick = () => {
      cont.querySelectorAll('.chip').forEach((x) => x.classList.remove('activo'));
      c.classList.add('activo');
      panel.dataset.t = c.dataset.t;
    };
  });
}

// ---------- Buscar alimento ----------
let filtro = '';
let catSel = '';
function renderBuscar(t = tiempoSugerido()) {
  const q = filtro.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const lista = ALIMENTOS.filter((a) => (!catSel || a.cat === catSel) && (!q || a.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)));
  return `<header class="cabeza"><span class="cabeza-fecha"><a href="#/comida">Comida</a></span><h1 class="cabeza-titulo">Buscar alimento</h1></header>
    <input class="entrada" type="search" placeholder="Pollo, huevo, tortilla…" value="${esc(filtro)}" data-i="com:filtro" data-t="${t}" autocomplete="off" />
    <div class="chips" style="margin:12px 0 4px"><button class="chip ${!catSel ? 'activo' : ''}" data-a="com:cat" data-v="">Todo</button>${CATEGORIAS.map(([id, n]) => `<button class="chip ${catSel === id ? 'activo' : ''}" data-a="com:cat" data-v="${id}">${esc(n)}</button>`).join('')}</div>
    <ul class="lista" id="resultados">${lista.map((a) => filaAlimento(a, t)).join('') || '<p class="vacio">No encontré eso. Prueba con la cámara o agrega rápido.</p>'}</ul>`;
}

function filaAlimento(a, t) {
  const base = a.unidad === 'g' || a.unidad === 'ml' ? `${a.base} ${a.unidad}` : `1 ${unidadTexto(a.unidad, 1)}`;
  return `<button class="fila" data-a="com:elegir" data-id="${a.id}" data-t="${t}"><span class="fila-cuerpo"><span class="fila-titulo">${esc(a.nombre)}</span><span class="fila-sub" style="display:block">${base}: ${num(a.kcal)} kcal, ${num(a.p, a.p < 10 ? 1 : 0)} g proteína</span></span>${icono('sumar', 'flecha')}</button>`;
}

function hojaCantidad(id, t) {
  const a = AL[id];
  const porPeso = a.unidad === 'g' || a.unidad === 'ml';
  const paso = porPeso ? 10 : 0.5;
  let cant = porPeso ? a.casera?.[0] || 100 : 1;
  const panel = abrirHoja(`<h2 class="hoja-titulo">${esc(a.nombre)}</h2>
    ${a.nota ? `<p class="hoja-texto">${esc(a.nota)}</p>` : ''}
    <span class="campo-etiqueta">Cantidad (${esc(porPeso ? a.unidad : unidadTexto(a.unidad, 2))})</span>
    <div class="paso" style="height:60px"><button type="button" data-d="${-paso}">−</button><input id="qCant" inputmode="decimal" value="${cant}" /><button type="button" data-d="${paso}">+</button></div>
    <p class="tenue" id="qInfo" style="margin-top:10px"></p>
    ${chipsTiempo(t)}
    <div class="pila-botones"><button class="boton primario" id="qOk">Agregar</button></div>`);
  activarChips(panel);
  const inp = panel.querySelector('#qCant');
  const info = panel.querySelector('#qInfo');
  const actualizar = () => {
    const c = parseFloat(String(inp.value).replace(',', '.')) || 0;
    const n = nutrientes(id, c);
    info.textContent = `${num(n.kcal)} kcal, ${num(n.p, 1)} g proteína, ${num(n.c)} g carbos, ${num(n.g, 1)} g grasa`;
  };
  inp.oninput = actualizar;
  panel.querySelectorAll('[data-d]').forEach((b) => {
    b.onclick = () => {
      const c = parseFloat(String(inp.value).replace(',', '.')) || 0;
      inp.value = Math.max(0, Math.round((c + Number(b.dataset.d)) * 10) / 10);
      actualizar();
    };
  });
  actualizar();
  panel.querySelector('#qOk').onclick = () => {
    const c = parseFloat(String(inp.value).replace(',', '.')) || 0;
    if (c <= 0) return aviso('Pon una cantidad.');
    const n = nutrientes(id, c);
    agregarRegistro(diaSel || hoy(), { t: panel.dataset.t, nombre: a.nombre, ...n, origen: 'base', ref: id, cant: c, cantTexto: cantidadTexto(id, c) });
    cerrarHoja();
    aviso(`${a.nombre} agregado.`);
    ir('comida');
  };
}

// ---------- Plan de la semana ----------
let semanaPlan = null;
function renderPlan() {
  if (!semanaPlan) semanaPlan = lunesDe(hoy());
  const o = objetivos();
  let costoSemana = 0;
  const dias = Array.from({ length: 7 }, (_, i) => {
    const f = sumarDias(semanaPlan, i);
    const p = planDelDia(f, o.kcal);
    const costo = costoDia(p);
    costoSemana += costo;
    const tot = Object.values(p).reduce((s, x) => ({ kcal: s.kcal + x.kcal, p: s.p + x.p }), { kcal: 0, p: 0 });
    return `<section style="margin-top:18px">
      <div class="tiempo-cabeza"><h3 style="margin:0">${esc(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][i])} ${deClave(f).getDate()}</h3><span class="tenue chico">${num(tot.kcal)} kcal, ${num(tot.p)} g prot, ≈ ${pesos(costo)}</span></div>
      <ul class="lista">${TIEMPOS.map(([t, n]) => `<button class="fila" data-a="plan:cambiar" data-f="${f}" data-t="${t}"><span class="fila-cuerpo"><span class="fila-sub" style="display:block">${esc(n)}</span><span class="fila-titulo">${esc(p[t].menu.nombre)}</span></span>${icono('cambiar', 'flecha')}</button>`).join('')}</ul>
    </section>`;
  }).join('');
  return `<header class="cabeza"><span class="cabeza-fecha"><a href="#/comida">Comida</a></span><h1 class="cabeza-titulo">Plan de la semana</h1></header>
    <div class="cabeza-fila"><button class="enlace" data-a="plan:semana" data-d="-7">${icono('atras')} Anterior</button><span class="tenue chico">${esc(fechaCorta(semanaPlan))} al ${esc(fechaCorta(sumarDias(semanaPlan, 6)))}</span><button class="enlace" data-a="plan:semana" data-d="7">Siguiente</button></div>
    <p class="tenue">Ajustado a tus ${num(o.kcal)} kcal. Toca una comida para cambiarla. Costo aproximado de la semana: <b style="color:var(--hueso)">${pesos(costoSemana)}</b>.</p>
    ${dias}
    <div class="pila-botones"><button class="boton primario" data-a="ir" data-ruta="super/${semanaPlan}">${icono('carrito')} Lista del súper de esta semana</button></div>`;
}

function hojaCambiar(fecha, t) {
  const o = objetivos();
  const actual = planDelDia(fecha, o.kcal)[t].menu.id;
  const ops = opcionesTiempo(t).map((m) => ({ m, e: escalarMenu(m, o.kcal * REPARTO[t]) }));
  const panel = abrirHoja(`<h2 class="hoja-titulo">${esc(NOMBRE_T[t])}: escoge otra</h2>
    ${ops
      .map(({ m, e }) => `<button class="fila" data-m="${m.id}"><span class="fila-cuerpo"><span class="fila-titulo">${esc(m.nombre)}${m.barato ? ' <span class="etiqueta olivo">barato</span>' : ''}</span><span class="fila-sub" style="display:block">${num(e.kcal)} kcal, ${num(e.p)} g proteína</span></span>${m.id === actual ? icono('check', 'flecha') : ''}</button>`)
      .join('')}`);
  panel.querySelectorAll('[data-m]').forEach((b) => {
    b.onclick = () => {
      if (!estado.plan.cambios[fecha]) estado.plan.cambios[fecha] = {};
      estado.plan.cambios[fecha][t] = b.dataset.m;
      marcar('plan');
      cerrarHoja();
      refrescar();
    };
  });
}

// ---------- Súper ----------
function renderSuper(lunes) {
  const l = listaSuper(lunes || lunesDe(hoy()));
  const comprados = estado.plan.comprados[l.lunes] || {};
  const tiendasTotales = TIENDAS.filter((t) => t.total !== false);
  // solo las tiendas que tienen algo de la lista (Similares casi nunca, Oxxo a veces)
  const columnas = TIENDAS.filter((t) => l.items.some((it) => it.tiendas[t.id]));
  const mejorTienda = tiendasTotales.reduce((m, t) => (!m || (l.totales[t.id].suma < l.totales[m.id].suma && l.totales[t.id].faltan <= l.totales[m.id].faltan) ? t : m), null);
  return `<header class="cabeza"><span class="cabeza-fecha"><a href="#/comida">Comida</a>, semana del ${esc(fechaCorta(l.lunes))}</span><h1 class="cabeza-titulo">Lista del súper</h1></header>
    <p class="tenue">Todo lo de tu plan para 7 días, con precios aproximados de noviembre 2026. Si en tu tienda está diferente, <a href="#/precios">corrígelo aquí</a>.</p>
    <div class="totales">${tiendasTotales
      .map((t) => `<div class="total-tienda ${mejorTienda && t.id === mejorTienda.id ? 'mejor' : ''}"><small class="tenue">${esc(t.corto)}</small><span class="numero">${pesos(l.totales[t.id].suma)}</span>${l.totales[t.id].faltan ? `<small class="mas-tenue">sin ${l.totales[t.id].faltan}</small>` : '<small class="mas-tenue">completo</small>'}</div>`)
      .join('')}</div>
    <div class="aviso-caja olivo">Comprando cada cosa donde está más barata: <b>${pesos(l.combinado)}</b> a la semana.</div>
    <p class="tenue chico">Lo de despensa (arroz, avena, aceite, frijol…) te dura varias semanas, así que en el total solo cuenta lo que usas. En Ley, los martes son de fruta y verdura: ahí sale más barato surtir eso.</p>
    <table class="tabla-precios" style="margin-top:8px">
      <thead><tr><th>Producto</th>${columnas.map((t) => `<th>${esc(t.corto)}</th>`).join('')}</tr></thead>
      <tbody>${l.items
        .map((it) => {
          const c = it.mejor ? it.tiendas[it.mejor] : null;
          const cantidad = c ? (c.granel ? `${num(c.paquetes, 1)} × ${c.pres}` : `${c.paquetes} × ${c.pres}${c.dura ? ', te dura varias semanas' : ''}`) : '';
          const hecho = !!comprados[it.id];
          return `<tr class="${hecho ? 'comprado' : ''}">
            <td><label style="display:flex;gap:8px;align-items:flex-start;cursor:pointer"><input type="checkbox" data-c="super:comprado" data-l="${l.lunes}" data-id="${it.id}" ${hecho ? 'checked' : ''} style="width:20px;height:20px;margin-top:2px;accent-color:#aab757"><span><span style="${hecho ? 'text-decoration:line-through;color:var(--ceniza)' : 'font-weight:600'}">${esc(it.a.nombre)}</span><br><span class="mas-tenue mini">${esc(cantidadTexto(it.id, redondeoCantidad(it.id, it.cantidad)))}${cantidad ? ' → ' + esc(cantidad) : ''}</span></span></label></td>
            ${columnas.map((t) => {
              const x = it.tiendas[t.id];
              if (!x) return '<td class="no-hay">—</td>';
              return `<td class="${t.id === it.mejor ? 'barato' : ''}">${pesos(x.costo)}${x.est ? '<span class="est">~</span>' : ''}</td>`;
            }).join('')}
          </tr>`;
        })
        .join('')}</tbody>
    </table>
    <p class="tenue mini" style="margin-top:10px">~ = precio estimado. Lo demás lo vi en las tiendas en línea de Walmart, Bodega Aurrera y Farmacias Similares, folletos de Ley en Sinaloa y Oxxo en Rappi (nov 2026). Los precios cambian por sucursal. Los suplementos de Similares están en <a href="#/precios">Precios</a>.</p>`;
}

// ---------- Precios ----------
function renderPrecios() {
  return `<header class="cabeza"><span class="cabeza-fecha"><a href="#/mas">Más</a></span><h1 class="cabeza-titulo">Precios</h1></header>
    <p class="tenue">Precios aproximados por presentación. Cambia el que veas diferente en tu tienda de Guasave; la lista del súper usa lo que pongas aquí.</p>
    ${CATEGORIAS.map(([cat, nombre]) => `<details class="acordeon"><summary>${esc(nombre)}</summary><div class="contenido">${ALIMENTOS.filter((a) => a.cat === cat)
      .map((a) => `<div style="padding:10px 0;border-bottom:1px solid var(--borde)">
        <div class="cabeza-fila"><b style="color:var(--hueso)">${esc(a.nombre)}</b>${estado.precios[a.id] ? `<button class="enlace" data-a="pre:reset" data-id="${a.id}">Restablecer</button>` : ''}</div>
        ${a.nota ? `<div class="mini mas-tenue">${esc(a.nota)}</div>` : ''}
        <div class="dos-columnas" style="margin-top:6px">${TIENDAS.filter((t) => a.precios[t.id])
          .map((t) => {
            const pr = precio(a.id, t.id);
            return `<label class="campo" style="margin:4px 0"><span>${esc(t.corto)}: ${esc(pr[1])}${pr[3] ? ' (estimado)' : ''}</span><input inputmode="decimal" data-c="pre:cambiar" data-id="${a.id}" data-t="${t.id}" value="${pr[0]}" /></label>`;
          })
          .join('')}</div>
      </div>`)
      .join('')}</div></details>`).join('')}`;
}

registrar({
  'com:dia': (el) => {
    diaSel = el.dataset.v;
    refrescar();
  },
  'com:semana': (el) => {
    diaSel = sumarDias(diaSel || hoy(), Number(el.dataset.d));
    refrescar();
  },
  'com:quitar': (el) => {
    const f = diaSel || hoy();
    const lista = estado.comida.dias[f] || [];
    const quitado = lista.find((r) => r.id === el.dataset.id);
    estado.comida.dias[f] = lista.filter((r) => r.id !== el.dataset.id);
    marcar('comida');
    refrescar();
    if (quitado) {
      aviso('Quitado.', {
        texto: 'Deshacer',
        hacer: () => {
          estado.comida.dias[f].push(quitado);
          marcar('comida');
          refrescar();
        },
      });
    }
  },
  'com:comi': (el) => {
    const t = el.dataset.t;
    const f = diaSel || hoy();
    const p = planDelDia(f)[t];
    agregarRegistro(f, { t, nombre: p.menu.nombre, kcal: p.kcal, p: p.p, c: p.c, g: p.g, origen: 'plan', ref: p.menu.id });
    aviso('¡Bien! Agregado a tu día.');
    refrescar();
  },
  'com:cambiar': (el) => hojaCambiar(diaSel || hoy(), el.dataset.t),
  'com:agregar': (el) => {
    const t = el.dataset.t;
    abrirHoja(`<h2 class="hoja-titulo">Agregar a ${esc(NOMBRE_T[t].toLowerCase())}</h2>
      <ul class="lista">
        <button class="fila" data-a="ir" data-ruta="escaner/foto/${t}">${icono('camara')}<span class="fila-cuerpo"><span class="fila-titulo">Foto del plato</span><span class="fila-sub" style="display:block">La IA calcula calorías y de qué está hecho</span></span></button>
        <button class="fila" data-a="ir" data-ruta="escaner/codigo/${t}">${icono('codigo')}<span class="fila-cuerpo"><span class="fila-titulo">Código de barras</span><span class="fila-sub" style="display:block">Para productos empacados</span></span></button>
        <button class="fila" data-a="ir" data-ruta="buscar/${t}">${icono('buscar')}<span class="fila-cuerpo"><span class="fila-titulo">Buscar alimento</span><span class="fila-sub" style="display:block">Pollo, huevo, tortillas…</span></span></button>
        <button class="fila" data-a="com:manual" data-t="${t}">${icono('sumar')}<span class="fila-cuerpo"><span class="fila-titulo">Escribir calorías</span><span class="fila-sub" style="display:block">Si ya sabes cuántas son</span></span></button>
      </ul>`);
  },
  'com:manual': (el) => {
    cerrarHoja();
    setTimeout(() => hojaManual(el.dataset.t), 210);
  },
  'com:filtro': (el) => {
    filtro = el.value;
    const t = el.dataset.t;
    const q = filtro.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const lista = ALIMENTOS.filter((a) => (!catSel || a.cat === catSel) && (!q || a.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)));
    document.getElementById('resultados').innerHTML = lista.map((a) => filaAlimento(a, t)).join('') || '<p class="vacio">No encontré eso. Prueba con la cámara o agrega rápido.</p>';
  },
  'com:cat': (el) => {
    catSel = el.dataset.v;
    refrescar();
  },
  'com:elegir': (el) => hojaCantidad(el.dataset.id, el.dataset.t),
  'plan:cambiar': (el) => hojaCambiar(el.dataset.f, el.dataset.t),
  'plan:semana': (el) => {
    semanaPlan = sumarDias(semanaPlan || lunesDe(hoy()), Number(el.dataset.d));
    refrescar();
  },
  'super:comprado': (el) => {
    const l = el.dataset.l;
    if (!estado.plan.comprados[l]) estado.plan.comprados[l] = {};
    estado.plan.comprados[l][el.dataset.id] = el.checked;
    marcar('plan');
    refrescar();
  },
  'pre:cambiar': (el) => {
    const v = parseFloat(String(el.value).replace(',', '.'));
    if (!estado.precios[el.dataset.id]) estado.precios[el.dataset.id] = {};
    if (Number.isFinite(v) && v >= 0) estado.precios[el.dataset.id][el.dataset.t] = v;
    else delete estado.precios[el.dataset.id][el.dataset.t];
    marcar('precios');
    aviso('Precio guardado.');
  },
  'pre:reset': (el) => {
    delete estado.precios[el.dataset.id];
    marcar('precios');
    refrescar();
  },
});

export const vistaComida = { tab: 'comida', render: renderComida };
export const vistaBuscar = {
  tab: 'comida',
  render: (t) => renderBuscar(t),
  montar: (raiz) => {
    const inp = raiz.querySelector('input[type="search"]');
    if (inp && !filtro) inp.focus({ preventScroll: true });
  },
};
export const vistaPlan = { tab: 'comida', render: renderPlan };
export const vistaSuper = { tab: 'comida', render: (l) => renderSuper(l) };
export const vistaPrecios = { tab: 'mas', render: renderPrecios };
export function diaComida() {
  return diaSel || hoy();
}
