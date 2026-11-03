// Agenda: tareas, exámenes y entregas (tesis incluida) con cuenta regresiva, y el servicio social.
import { registrar, refrescar } from '../nucleo.js';
import { esc, hoy, sumarDias, deClave, abrirHoja, cerrarHoja, aviso, confirmar } from '../util.js';
import { icono } from '../iconos.js';
import {
  TIPOS, TIPO, pendientes, hechos, faltan, textoFaltan, colorFaltan, fechaConDia, guardarPendiente,
  alternarHecho, borrarPendiente, ss, reporteSS, marcarReporte, diasParaTerminarSS,
} from '../agenda.js';
import { marcar } from '../store.js';

const conAnio = (f) => deClave(f).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

// Fila de un pendiente (también la usa Hoy)
export function filaPendiente(p, desde = hoy()) {
  const n = faltan(p.fecha, desde);
  const sub = `${TIPO[p.tipo] || 'Tarea'}${p.materia ? ' de ' + p.materia : ''}, ${fechaConDia(p.fecha)}`;
  return `<div class="agenda-fila ${p.hecho ? 'hecho' : ''}">
    <button class="caja-check" data-a="age:hecho" data-id="${esc(p.id)}" aria-label="${p.hecho ? 'Marcar como pendiente' : 'Marcar como hecho'}">${p.hecho ? icono('check') : ''}</button>
    <button class="fila-cuerpo agenda-texto" data-a="age:editar" data-id="${esc(p.id)}"><span class="fila-titulo">${esc(p.titulo)}</span><span class="fila-sub" style="display:block">${esc(sub)}</span></button>
    ${p.hecho ? '' : `<span class="etiqueta ${colorFaltan(n)}">${esc(textoFaltan(n))}</span>`}
  </div>`;
}

// Aviso del reporte mensual del servicio social (también lo usa Hoy)
export function filaReporte(r) {
  return `<div class="agenda-fila">
    <button class="caja-check" data-a="age:reporte" data-mes="${r.mes}" aria-label="Ya entregué el reporte"></button>
    <span class="fila-cuerpo"><span class="fila-titulo">${r.ultimo ? 'Último reporte' : 'Reporte mensual'} del servicio social</span><span class="fila-sub" style="display:block">${esc(fechaConDia(r.fecha))}. Palomea cuando lo entregues.</span></span>
    <span class="etiqueta ${colorFaltan(r.faltan)}">${esc(textoFaltan(r.faltan))}</span>
  </div>`;
}

function render() {
  const lista = pendientes();
  const vencidos = lista.filter((p) => faltan(p.fecha) < 0);
  const vienen = lista.filter((p) => faltan(p.fecha) >= 0);
  const listos = hechos().slice(0, 20);
  const s = ss();
  const r = reporteSS();
  const termina = diasParaTerminarSS();
  return `<header class="cabeza"><span class="cabeza-fecha"><a href="#/hoy">Hoy</a></span><h1 class="cabeza-titulo">Agenda</h1></header>
    <p class="tenue">Tareas, exámenes y entregas de la escuela y de la tesis. Los que vienen pronto salen en Hoy con su cuenta regresiva y en tu resumen de las 5 am.</p>
    <div class="pila-botones" style="margin-top:6px"><button class="boton primario" data-a="age:nuevo">${icono('sumar')} Agregar tarea, examen o entrega</button></div>

    ${vencidos.length ? `<h2 class="seccion">Vencidos</h2>${vencidos.map((p) => filaPendiente(p)).join('')}` : ''}
    <h2 class="seccion">Lo que viene</h2>
    ${vienen.length ? vienen.map((p) => filaPendiente(p)).join('') : '<p class="vacio">Nada pendiente. Cuando te dejen algo, agrégalo con su fecha.</p>'}

    <h2 class="seccion">Servicio social</h2>
    ${r ? filaReporte(r) : `<p class="tenue chico">${s.avisos === false ? 'Avisos del reporte apagados.' : 'Sin reportes pendientes.'}</p>`}
    <p class="tenue chico" style="margin-top:10px">Del ${esc(conAnio(s.inicio || hoy()))} al ${esc(conAnio(s.fin || hoy()))}${termina !== null && termina >= 0 ? `: ${termina === 0 ? 'hoy terminas' : `faltan ${termina} días`}` : ''}.</p>
    <div class="dos-columnas">
      <label class="campo"><span>Día del reporte cada mes</span><input data-c="age:ssDia" inputmode="numeric" value="${esc(s.dia)}"></label>
      <label class="campo"><span>Termina el</span><input type="date" data-c="age:ssFin" value="${esc(s.fin || '')}"></label>
    </div>
    <div class="fila"><span class="fila-cuerpo"><span class="fila-titulo">Avisarme del reporte</span><span class="fila-sub" style="display:block">Sale en Hoy desde una semana antes</span></span><label class="interruptor"><input type="checkbox" data-c="age:ssAvisos" ${s.avisos !== false ? 'checked' : ''}><span></span></label></div>

    ${listos.length ? `<details class="acordeon" style="margin-top:14px"><summary>Ya hechos (${listos.length})</summary><div class="contenido">${listos.map((p) => filaPendiente(p)).join('')}</div></details>` : ''}`;
}

function hojaPendiente(p) {
  const nuevo = !p;
  const d = p || { titulo: '', tipo: 'tarea', materia: '', fecha: sumarDias(hoy(), 1) };
  let tipo = d.tipo;
  const panel = abrirHoja(`<h2 class="hoja-titulo">${nuevo ? 'Agregar a la agenda' : 'Editar'}</h2>
    <label class="campo"><span>¿Qué es?</span><input id="pTitulo" value="${esc(d.titulo)}" placeholder="Examen del parcial 2" maxlength="120"></label>
    <div class="chips" id="pTipo">${TIPOS.map(([id, n]) => `<button type="button" class="chip ${id === tipo ? 'activo' : ''}" data-t="${id}">${n}</button>`).join('')}</div>
    <div class="dos-columnas">
      <label class="campo"><span>Materia (opcional)</span><input id="pMateria" value="${esc(d.materia || '')}" placeholder="Tesis" maxlength="60"></label>
      <label class="campo"><span>Fecha</span><input type="date" id="pFecha" value="${esc(d.fecha)}"></label>
    </div>
    <div class="pila-botones"><button class="boton primario" id="pOk">Guardar</button>${nuevo ? '' : '<button class="boton peligro" id="pBorrar">Borrar</button>'}</div>`);
  panel.querySelectorAll('#pTipo .chip').forEach((c) => {
    c.onclick = () => {
      tipo = c.dataset.t;
      panel.querySelectorAll('#pTipo .chip').forEach((x) => x.classList.toggle('activo', x === c));
    };
  });
  panel.querySelector('#pOk').onclick = () => {
    const titulo = panel.querySelector('#pTitulo').value.trim();
    const fecha = panel.querySelector('#pFecha').value;
    if (!titulo) return aviso('Escribe qué es.');
    if (!fecha) return aviso('Pon la fecha.');
    guardarPendiente({ id: p && p.id, titulo, tipo, materia: panel.querySelector('#pMateria').value, fecha });
    cerrarHoja();
    aviso(nuevo ? 'Agregado a la agenda.' : 'Guardado.');
    refrescar();
  };
  const borrar = panel.querySelector('#pBorrar');
  if (borrar) {
    borrar.onclick = () => {
      cerrarHoja();
      setTimeout(() => confirmar('¿Borrar de la agenda?', p.titulo, [
        { texto: 'Sí, borrar', clase: 'peligro', hacer: () => { borrarPendiente(p.id); refrescar(); } },
        { texto: 'Cancelar', clase: 'secundario' },
      ]), 210);
    };
  }
  if (nuevo) setTimeout(() => panel.querySelector('#pTitulo')?.focus(), 250);
}

registrar({
  'age:nuevo': () => hojaPendiente(null),
  'age:editar': (el) => {
    const p = pendientesTodos().find((x) => x.id === el.dataset.id);
    if (p) hojaPendiente(p);
  },
  'age:hecho': (el) => {
    const p = alternarHecho(el.dataset.id);
    refrescar();
    if (p && p.hecho) aviso('¡Listo! Tachado de la agenda.', { texto: 'Deshacer', hacer: () => { alternarHecho(p.id); refrescar(); } });
  },
  'age:reporte': (el) => {
    const mes = el.dataset.mes;
    marcarReporte(mes, true);
    refrescar();
    aviso('Reporte entregado.', { texto: 'Deshacer', hacer: () => { marcarReporte(mes, false); refrescar(); } });
  },
  'age:ssDia': (el) => {
    const v = parseInt(el.value, 10);
    if (!(v >= 1 && v <= 31)) return aviso('Pon un día del 1 al 31.');
    ss().dia = v;
    marcar('agenda');
    refrescar();
  },
  'age:ssFin': (el) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(el.value)) return;
    ss().fin = el.value;
    marcar('agenda');
    refrescar();
  },
  'age:ssAvisos': (el) => {
    ss().avisos = el.checked;
    marcar('agenda');
    refrescar();
  },
});

function pendientesTodos() {
  return [...pendientes(), ...hechos()];
}

export const vistaAgenda = { tab: 'hoy', render };
