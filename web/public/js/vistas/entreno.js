// Pestaña de entreno: fase actual, rutinas, camino de principiante a pro, biblioteca e historial.
import { estado, marcar } from '../store.js';
import { registrar, refrescar, ir } from '../nucleo.js';
import { esc, hoy, num, kg, fechaCorta, fechaRelativa, diaCorto, confirmar, aviso, mmss } from '../util.js';
import { icono } from '../iconos.js';
import { EJ, EJERCICIOS, imagenes, urlVideo } from '../datos/ejercicios.js';
import { FASES, FASE, RUTINAS } from '../datos/programa.js';
import { barraCamino, chispa } from '../graficos.js';
import { faseActual, siguienteRutina, semanaFase, sesionesFase, requisitos, diasEntreno, historial, mejorMarca, e1rm, esDescarga } from '../calc.js';
import { iniciarSesion } from './sesion.js';
import * as nativo from '../nativo.js';

const NOMBRE_DIA = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function filaEjercicio(pl) {
  const e = EJ[pl.ej];
  const rango = pl.seg ? `${pl.seg[0]}–${pl.seg[1]} s` : `${pl.reps[0]}${pl.reps[1] !== pl.reps[0] ? '–' + pl.reps[1] : ''}`;
  return `<a class="fila" href="#/ejercicio/${e.id}" style="color:inherit;text-decoration:none">
    <img class="miniatura" src="${imagenes(e.id)[0]}" alt="" loading="lazy">
    <span class="fila-cuerpo"><span class="fila-titulo">${esc(e.nombre)}</span><span class="fila-sub" style="display:block">${pl.series} × ${rango}${pl.lado ? ' por lado' : ''}</span></span>
    ${icono('flecha', 'flecha')}
  </a>`;
}

function renderEntreno() {
  const f = faseActual();
  const sig = siguienteRutina();
  const ses = sesionesFase(f.id).length;
  const req = f.requisito.sesiones || 0;
  const activa = estado.entreno.activa;
  const ultimas = [...estado.entreno.sesiones].reverse().slice(0, 8);
  return `<header class="cabeza"><span class="cabeza-fecha">Fase ${f.num}, semana ${semanaFase()}${esDescarga() ? ' (descarga)' : ''}</span><h1 class="cabeza-titulo">Entreno</h1></header>
    <button class="panel" data-a="ir" data-ruta="camino" style="display:block;width:100%;text-align:left;border:0;cursor:pointer;color:inherit">
      <div class="cabeza-fila"><span class="fila-titulo" style="font-family:var(--display);font-size:24px">Fase ${f.num}: ${esc(f.nombre)}</span>${icono('flecha', 'flecha')}</div>
      <p class="tenue chico" style="margin:4px 0 8px">${esc(f.enfoque)}</p>
      ${req ? `<span class="pista"><i style="width:${Math.min(100, (ses / req) * 100)}%;background:var(--mostaza)"></i></span><span class="tenue mini">${ses} de ${req} entrenamientos para la siguiente fase</span>` : '<span class="tenue mini">Fase final: sigue sumando récords.</span>'}
    </button>

    <div class="seccion-fila"><h2>${activa ? 'En curso' : 'Siguiente'}: ${esc(activa ? activa.nombre : sig.nombre)}</h2></div>
    <ul class="lista">${(activa ? activa.ejercicios.map((x) => ({ ...x.plan, ej: x.ej })) : sig.ejercicios).map(filaEjercicio).join('')}</ul>
    <div class="pila-botones"><button class="boton primario" data-a="${activa ? 'ir' : 'ent:empezar'}" data-ruta="sesion" data-id="${sig.id}">${activa ? 'Continuar entreno' : 'Empezar ' + esc(sig.nombre)}</button></div>

    <h2 class="seccion">Rutinas de esta fase</h2>
    <p class="tenue chico">Se van turnando solas: si faltas un día, sigues con la que tocaba. Si quieres hacer otra hoy, escógela aquí.</p>
    <ul class="lista">${f.rotacion
      .map((id, i) => {
        const r = RUTINAS[id];
        const dias = diasEntreno();
        const dia = f.rotacion.length % dias.length === 0 ? `${NOMBRE_DIA[dias[i % dias.length]]}${f.rotacion.length > dias.length ? (i < dias.length ? ', semana 1' : ', semana 2') : ''}: ` : '';
        return `<li class="fila"><span class="fila-cuerpo"><span class="fila-titulo">${esc(r.nombre)}</span><span class="fila-sub" style="display:block">${esc(dia)}${r.ejercicios.length} ejercicios, unos ${r.min} min${r.cardio ? `, ${r.cardio.min} min de cardio` : ''}</span></span>
          <button class="boton secundario chico" data-a="ent:empezar" data-id="${id}" ${activa ? 'disabled' : ''}>Hacer</button></li>`;
      })
      .join('')}</ul>
    <p class="tenue chico">Días de gym: ${diasEntreno().map(diaCorto).join(', ')}. <a href="#/ajustes">Cambiar</a></p>

    <h2 class="seccion">Reglas de la fase</h2>
    <ul style="padding-left:20px;margin:0;color:var(--polvo)">${f.reglas.map((r) => `<li style="margin-bottom:6px">${esc(r)}</li>`).join('')}</ul>
    <p class="tenue" style="margin-top:8px"><b style="color:var(--hueso)">Cardio:</b> ${esc(f.cardio)}</p>

    <div class="seccion-fila"><h2>Historial</h2><a class="enlace" href="#/ejercicios">Todos los ejercicios</a></div>
    ${ultimas.length
      ? `<ul class="lista">${ultimas
          .map((s) => `<li class="fila"><span class="fila-cuerpo"><span class="fila-titulo">${esc(s.nombre)}</span><span class="fila-sub" style="display:block">${esc(fechaRelativa(s.fecha))}, ${Math.round((s.fin - s.inicio) / 60000)} min, ${num(s.volumen)} kg${s.records ? `, ${s.records} ${s.records === 1 ? 'récord' : 'récords'}` : ''}</span></span><span class="etiqueta">Fase ${FASE[s.fase]?.num || ''}</span></li>`)
          .join('')}</ul>`
      : '<p class="vacio">Aquí vas a ver tus entrenos. El primero es el más difícil.</p>'}`;
}

// ---------- Camino ----------
function renderCamino() {
  const f = faseActual();
  const idx = FASES.findIndex((x) => x.id === f.id);
  return `<header class="cabeza"><span class="cabeza-fecha"><a href="#/entreno">Entreno</a></span><h1 class="cabeza-titulo">De principiante a pro</h1></header>
    ${barraCamino(f.num)}
    <p class="tenue">Cada fase le pone un disco más a tu barra. Subes cuando cumples los requisitos; no hay prisa: es mejor pasar con buena técnica.</p>
    ${FASES.map((fase, i) => {
      const estadoF = i < idx ? 'hecha' : i === idx ? 'actual' : 'bloqueada';
      const req = requisitos(fase);
      const reqHtml =
        i === idx
          ? `<div style="margin-top:8px">${req.items
              .map((it) => `<div class="req ${it.hecho ? 'ok' : ''}"><span class="marca-req">${it.hecho ? '✓' : '○'}</span><span>${esc(it.texto)}${it.meta ? `: ${it.actual} de ${it.meta}` : ''}</span></div>`)
              .join('')}${fase.requisito.texto ? `<p class="tenue mini" style="margin-top:6px">${esc(fase.requisito.texto)}</p>` : ''}</div>`
          : '';
      const sig = FASES[i + 1];
      const boton = i === idx && sig
        ? req.cumple
          ? `<button class="boton primario chico" style="margin-top:10px" data-a="cam:subir" data-id="${sig.id}">Pasar a fase ${sig.num}</button>`
          : `<button class="enlace" data-a="cam:forzar" data-id="${sig.id}">Ya tengo experiencia: pasar a la fase ${sig.num}</button>`
        : '';
      return `<div class="fase ${estadoF}">
        <div class="tenue mini">${esc(fase.semanas)}, ${fase.dias} días por semana</div>
        <div class="fase-nombre">Fase ${fase.num}: ${esc(fase.nombre)}</div>
        <p class="tenue chico" style="margin:4px 0 0">${esc(fase.enfoque)}</p>
        ${reqHtml}${boton}
      </div>`;
    }).join('')}`;
}

function cambiarFase(id) {
  const c = estado.config;
  c.fase = id;
  c.faseInicio = hoy();
  if (!c.dias[id]) c.dias[id] = FASE[id].diasDefault;
  marcar('config');
  aviso(`Bienvenido a la fase ${FASE[id].num}: ${FASE[id].nombre}.`);
  refrescar();
}

// ---------- Detalle de ejercicio ----------
function renderEjercicio(id) {
  const e = EJ[id];
  if (!e) return '<div class="vacio">Ese ejercicio no existe.</div>';
  const h = historial(id).slice(0, 8);
  const mejor = mejorMarca(id);
  const serie1rm = historial(id)
    .slice(0, 12)
    .reverse()
    .map((x) => Math.max(...x.series.map((s) => e1rm(s.kg, s.reps))));
  return `<header class="cabeza"><span class="cabeza-fecha"><button class="enlace" data-a="atras">Regresar</button></span><h1 class="cabeza-titulo">${esc(e.nombre)}</h1></header>
    <div class="demo">${imagenes(id).map((s) => `<img src="${s}" alt="">`).join('')}<span class="demo-marca">Inicio y final del movimiento</span></div>
    ${e.img && EJ[e.img] ? `<p class="tenue mini" style="margin-top:6px">Las fotos son de ${esc(EJ[e.img].nombre.toLowerCase())}, que es casi el mismo movimiento.</p>` : ''}
    <p class="tenue" style="margin-top:10px">${esc(e.musculos)}. ${esc(e.equipo)}.</p>
    <h2 class="seccion">Cómo se hace</h2>
    <ol style="padding-left:20px;margin:0">${e.pasos.map((p) => `<li style="margin-bottom:6px">${esc(p)}</li>`).join('')}</ol>
    ${e.errores.length ? `<h3>Errores comunes</h3><ul style="padding-left:20px;margin:0;color:var(--polvo)">${e.errores.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    <div class="pila-botones"><button class="boton secundario" data-a="ent:video" data-id="${id}">${icono('video')} Ver video en YouTube</button></div>
    ${mejor ? `<h2 class="seccion">Tu marca</h2><div class="cabeza-fila"><div><span class="numero" style="font-size:34px">${kg(Math.round(mejor.e1rm * 2) / 2)}</span><div class="tenue chico">1 repetición estimada (${kg(mejor.kg)} × ${mejor.reps}, ${esc(fechaCorta(mejor.fecha))})</div></div>${chispa(serie1rm)}</div>` : ''}
    ${h.length
      ? `<h2 class="seccion">Historial</h2><ul class="lista">${h
          .map((x) => `<li class="fila"><span class="fila-cuerpo"><span class="fila-titulo">${esc(fechaRelativa(x.fecha))}</span><span class="fila-sub" style="display:block">${x.series.map((s) => (s.seg ? `${s.seg} s` : `${s.kg ? kg(s.kg) + ' × ' : ''}${s.reps}`)).join(', ')}</span></span></li>`)
          .join('')}</ul>`
      : ''}`;
}

// ---------- Biblioteca ----------
const GRUPOS = [
  ['Pierna y glúteo', ['sentadilla_barra', 'pendulo', 'prensa', 'prensa_alta', 'hack', 'sentadilla_goblet', 'extension', 'femoral_acostado', 'femoral_sentado', 'femoral_pie', 'rumano_barra', 'rumano_mancuernas', 'peso_muerto', 'hip_thrust', 'puente_barra', 'abductor', 'zancadas', 'step_up', 'pantorrilla_pie', 'pantorrilla_sentado', 'pantorrilla_prensa', 'hiperextension']],
  ['Pecho', ['press_banca', 'press_inclinado', 'press_inclinado_maquina', 'press_pecho_maquina', 'aperturas', 'cruces_polea', 'lagartijas', 'lagartijas_inclinadas']],
  ['Espalda', ['remo_pecho', 'jalon_supino', 'jalon', 'jalon_cerrado', 'remo_polea', 'remo_mancuerna', 'remo_barra', 'remo_t', 'dominadas', 'dominadas_asistidas', 'pullover_polea', 'face_pull']],
  ['Hombro', ['press_hombro_maquina', 'press_hombro_mancuernas', 'press_militar', 'laterales', 'laterales_polea', 'pajaros_maquina', 'encogimientos']],
  ['Brazos y antebrazo', ['curl_barra_ez', 'curl_inclinado', 'curl_mancuernas', 'curl_martillo', 'curl_predicador', 'curl_muneca', 'curl_muneca_inv', 'triceps_barra_v', 'triceps_unilateral', 'triceps_polea', 'triceps_cuerda', 'triceps_tras_nuca', 'fondos', 'fondos_maquina', 'press_frances']],
  ['Abdomen', ['plancha', 'plancha_lateral', 'dead_bug', 'crunch_polea', 'crunch_maquina', 'elevacion_piernas', 'elevacion_piernas_banco', 'pallof']],
  ['Cardio', ['caminadora', 'bici', 'eliptica', 'escaladora', 'remo_cardio', 'cuerda']],
  ['Calentamiento y estiramientos', EJERCICIOS.filter((e) => e.carga === 'movilidad').map((e) => e.id)],
];

function renderBiblioteca() {
  return `<header class="cabeza"><span class="cabeza-fecha"><a href="#/entreno">Entreno</a></span><h1 class="cabeza-titulo">Ejercicios</h1></header>
    <p class="tenue">${EJERCICIOS.length} ejercicios con fotos del movimiento. Toca uno para ver cómo se hace y tu historial.</p>
    ${GRUPOS.map(([g, ids]) => `<details class="acordeon"><summary>${esc(g)} <span class="tenue chico" style="margin-left:auto;margin-right:10px">${ids.length}</span></summary><div class="contenido"><ul class="lista">${ids
      .map((id) => `<a class="fila" href="#/ejercicio/${id}" style="color:inherit;text-decoration:none"><img class="miniatura" src="${imagenes(id)[0]}" alt="" loading="lazy"><span class="fila-cuerpo"><span class="fila-titulo">${esc(EJ[id].nombre)}</span><span class="fila-sub" style="display:block">${esc(EJ[id].musculos)}</span></span></a>`)
      .join('')}</ul></div></details>`).join('')}
    <p class="tenue mini" style="margin-top:16px">Fotos: Free Exercise DB (dominio público).</p>`;
}

registrar({
  'ent:empezar': (el) => iniciarSesion(el.dataset.id),
  'ent:video': (el) => nativo.abrirUrl(urlVideo(EJ[el.dataset.id])),
  'cam:subir': (el) => cambiarFase(el.dataset.id),
  'cam:forzar': (el) => {
    const f = FASE[el.dataset.id];
    confirmar(`¿Pasar a la fase ${f.num}?`, 'Hazlo solo si ya dominas la técnica de la fase actual. Siempre puedes regresar desde Ajustes.', [
      { texto: `Sí, pasar a ${f.nombre}`, clase: 'primario', hacer: () => cambiarFase(f.id) },
      { texto: 'Mejor no', clase: 'secundario' },
    ]);
  },
});

export const vistaEntreno = { tab: 'entreno', render: renderEntreno };
export const vistaCamino = { tab: 'entreno', render: renderCamino };
export const vistaEjercicio = { tab: 'entreno', render: renderEjercicio };
export const vistaBiblioteca = { tab: 'entreno', render: renderBiblioteca };
