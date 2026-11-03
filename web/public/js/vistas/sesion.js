// El entreno en vivo: calentamiento → ejercicios con registro de series y descanso → cardio → estiramientos → resumen.
import { estado, marcar, guardarYa } from '../store.js';
import { registrar, refrescar, ir } from '../nucleo.js';
import { esc, hoy, uid, mmss, num, kg, abrirHoja, cerrarHoja, confirmar, aviso, pitido, fechaRelativa, redondea } from '../util.js';
import { icono } from '../iconos.js';
import { EJ, imagenes, urlVideo } from '../datos/ejercicios.js';
import { RUTINAS, CALENTAMIENTOS, ENFRIAMIENTO, FASE, FASES } from '../datos/programa.js';
import { siguienteRutina, faseActual, sugerencia, historial, mejorMarca, e1rm, esDescarga, aproximacion, requisitos } from '../calc.js';
import * as nativo from '../nativo.js';

let reloj = null;
let avisado = false;
let ultimoResumen = null;

const activa = () => estado.entreno.activa;

function prepararEjercicio(plan, ejId, sesionId, descarga) {
  const p = { ...plan };
  if (descarga) p.series = Math.max(1, Math.ceil(p.series / 2));
  const sug = sugerencia(p, ejId, sesionId);
  let kgBase = sug.kg ?? null;
  if (descarga && kgBase) kgBase = redondea(kgBase * 0.9, 0.5);
  if (kgBase === null) {
    const h = historial(ejId, sesionId)[0];
    if (h) kgBase = Math.max(...h.series.map((s) => Number(s.kg) || 0)) || null;
  }
  const series = Array.from({ length: p.series }, () => ({ kg: kgBase ?? '', reps: '', seg: '', hecho: false }));
  return { ej: ejId, original: plan.ej, plan: p, series, sug };
}

export function iniciarSesion(rutinaId) {
  if (activa()) return ir('sesion');
  const r = rutinaId ? RUTINAS[rutinaId] : siguienteRutina();
  const f = faseActual();
  const id = uid();
  const descarga = esDescarga();
  estado.entreno.activa = {
    id, fecha: hoy(), inicio: Date.now(), fase: f.id, rutina: r.id, nombre: r.nombre, zona: r.zona,
    paso: 'calentamiento', descarga, calentamiento: {}, enfriamiento: {}, descanso: null,
    ejercicios: r.ejercicios.map((pl) => prepararEjercicio(pl, pl.ej, id, descarga)),
    cardio: r.cardio ? { ...r.cardio, hecho: false, seg: 0, corriendo: null } : null,
  };
  marcar('entreno');
  ir('sesion');
}

// ---------- Partes de la pantalla ----------

function barraSuperior(a) {
  const total = a.ejercicios.length + 2;
  let pos = 0;
  if (typeof a.paso === 'number') pos = a.paso + 1;
  else if (a.paso === 'cardio' || a.paso === 'enfriamiento') pos = a.ejercicios.length + 1;
  return `<div class="sesion-barra">
    <button class="icono-boton" data-a="ses:salir" aria-label="Salir del entreno">${icono('cerrar')}</button>
    <span class="progreso-sesion"><i style="width:${Math.round((pos / total) * 100)}%"></i></span>
    <span class="cronometro" id="crono">${mmss((Date.now() - a.inicio) / 1000)}</span>
  </div>`;
}

function demo(id, clase = '') {
  const [a, b] = imagenes(id);
  return `<div class="demo ${clase}"><img src="${a}" alt="" loading="lazy"><img src="${b}" alt="" loading="lazy"></div>`;
}

function listaMovs(movs, marcados, tipo) {
  return movs
    .map(([id, dosis]) => {
      const e = EJ[id];
      const hecho = !!marcados[id];
      return `<div class="mov">
        <button class="caja-check" style="${hecho ? 'background:var(--olivo);border-color:var(--olivo);color:#1a1a0b' : ''}" data-a="ses:mov" data-tipo="${tipo}" data-id="${id}" aria-label="Marcar ${esc(e.nombre)}">${hecho ? icono('check') : ''}</button>
        <img class="miniatura" src="${imagenes(id)[0]}" alt="" loading="lazy" data-a="ses:verEj" data-id="${id}">
        <span class="fila-cuerpo" data-a="ses:verEj" data-id="${id}"><span class="fila-titulo">${esc(e.nombre)}</span><span class="fila-sub" style="display:block">${esc(dosis)}</span></span>
      </div>`;
    })
    .join('');
}

function pantallaCalentamiento(a) {
  const c = CALENTAMIENTOS[a.zona] || CALENTAMIENTOS.full;
  return `<h1 class="ej-titulo">Calentamiento</h1>
    <p class="meta-ej">Unos 10 minutos. Así entras con el cuerpo caliente y sin lastimarte.</p>
    <div class="panel"><b>1. Cardio suave.</b> <span class="tenue">${esc(c.general)}</span></div>
    <h2 class="seccion">2. Movilidad</h2>
    ${listaMovs(c.movs, a.calentamiento, 'calentamiento')}
    <p class="tenue chico" style="margin-top:14px">En el primer ejercicio te digo qué series de aproximación hacer antes de las pesadas.</p>`;
}

function textoMeta(pl) {
  const rango = pl.seg ? `${pl.seg[0]}${pl.seg[1] !== pl.seg[0] ? '–' + pl.seg[1] : ''} segundos` : `${pl.reps[0]}${pl.reps[1] !== pl.reps[0] ? '–' + pl.reps[1] : ''} repeticiones`;
  const rir = pl.rir === 0 ? 'hasta el fallo técnico' : `deja ${pl.rir} en reserva`;
  return `${pl.series} ${pl.series === 1 ? 'serie' : 'series'} de ${rango}${pl.lado ? ' por lado' : ''}, ${rir}. Descanso ${mmss(pl.desc)}.`;
}

function bloqueUltima(item, a) {
  const h = historial(item.ej, a.id)[0];
  const etiquetas = { subir: 'Sube', igual: 'Mantén', bajar: 'Ajusta', nuevo: 'Nuevo' };
  const s = item.sug || {};
  const antes = h
    ? `<div class="tenue chico" style="margin-top:4px">La vez pasada (${esc(fechaRelativa(h.fecha))}): ${h.series
        .map((x) => (item.plan.seg ? `${x.seg || 0} s` : `${x.kg ? kg(x.kg) + ' × ' : ''}${x.reps || 0}`))
        .join(', ')}</div>`
    : '';
  return `<div class="ultima ${s.tipo || 'nuevo'}"><div><span class="tipo">${etiquetas[s.tipo] || 'Tip'}:</span> ${esc(s.texto || '')}${antes}</div></div>`;
}

function filaSerie(item, i, s, conKg) {
  const ej = EJ[item.ej];
  const pasoKg = ej.carga === 'mancuerna' ? 1 : ej.carga === 'barra' ? 2.5 : Math.abs(ej.inc) || 2.5;
  const pl = item.plan;
  const objetivo = pl.seg ? pl.seg[1] : pl.reps[1];
  const campo = pl.seg ? 'seg' : 'reps';
  const kgCelda = conKg
    ? `<div class="paso"><button data-a="ses:mas" data-i="${i}" data-campo="kg" data-d="${-pasoKg}" aria-label="Menos peso">−</button><input inputmode="decimal" data-c="ses:valor" data-i="${i}" data-campo="kg" value="${esc(s.kg)}" placeholder="kg" aria-label="Kilos serie ${i + 1}"><button data-a="ses:mas" data-i="${i}" data-campo="kg" data-d="${pasoKg}" aria-label="Más peso">+</button></div>`
    : '';
  return `<div class="serie ${s.hecho ? 'hecha' : ''}" style="${conKg ? '' : 'grid-template-columns:30px 1fr 52px'}">
    <span class="serie-num">${i + 1}</span>
    ${kgCelda}
    <div class="paso"><button data-a="ses:mas" data-i="${i}" data-campo="${campo}" data-d="${pl.seg ? -5 : -1}" aria-label="Menos">−</button><input inputmode="numeric" data-c="ses:valor" data-i="${i}" data-campo="${campo}" value="${esc(s[campo])}" placeholder="${objetivo}" aria-label="${pl.seg ? 'Segundos' : 'Repeticiones'} serie ${i + 1}"><button data-a="ses:mas" data-i="${i}" data-campo="${campo}" data-d="${pl.seg ? 5 : 1}" aria-label="Más">+</button></div>
    <button class="palomita" data-a="ses:hecha" data-i="${i}" aria-label="Serie ${i + 1} hecha">${icono('check')}</button>
  </div>`;
}

function pantallaEjercicio(a, idx) {
  const item = a.ejercicios[idx];
  const ej = EJ[item.ej];
  const pl = item.plan;
  const conKg = !pl.seg && ej.carga !== 'tiempo';
  let aprox = '';
  const primeroConPeso = a.ejercicios.findIndex((x) => ['barra', 'maquina', 'mancuerna', 'polea'].includes(EJ[x.ej].carga) && !x.plan.seg);
  if (idx === primeroConPeso) {
    const kgT = Number(item.series[0]?.kg) || null;
    const pesado = !!(pl.reps && pl.reps[1] <= 6);
    const ap = aproximacion(kgT, ej, pesado);
    aprox = ap
      ? `<div class="aviso-caja olivo"><b>Antes, series de aproximación:</b> ${ap.map(([r, k]) => `${r} reps con ${kg(k)}`).join(', ')}. No se anotan.</div>`
      : `<div class="aviso-caja olivo">Antes de tus series haz 1 o 2 series de 10 ${ej.carga === 'barra' ? 'con la barra vacía' : 'ligeras'} para calentar el movimiento.</div>`;
  }
  const alt = (pl.alt || []).length ? `<button class="enlace" data-a="ses:cambiar" data-i="${idx}">${icono('cambiar')} Cambiar</button>` : '';
  const cabecera = conKg
    ? `<div class="serie-cabecera"><span>#</span><span>${ej.carga === 'corporal' ? 'Extra (kg)' : ej.inc < 0 ? 'Asistencia (kg)' : 'Kilos'}</span><span>Reps</span><span></span></div>`
    : `<div class="serie-cabecera" style="grid-template-columns:30px 1fr 52px"><span>#</span><span>${pl.seg ? 'Segundos' : 'Reps'}</span><span></span></div>`;
  return `<div class="cabeza-fila" style="margin-top:6px"><span class="tenue chico">Ejercicio ${idx + 1} de ${a.ejercicios.length}${a.descarga ? ' (descarga)' : ''}</span>${alt}</div>
    <h1 class="ej-titulo">${esc(ej.nombre)}</h1>
    <div data-a="ses:verEj" data-id="${ej.id}" style="cursor:pointer">${demo(ej.id)}</div>
    <p class="meta-ej" style="margin-top:10px">${esc(textoMeta(pl))}</p>
    ${pl.nota ? `<div class="aviso-caja">${esc(pl.nota)}</div>` : ''}
    ${bloqueUltima(item, a)}
    ${aprox}
    <div class="series">${cabecera}${item.series.map((s, i) => filaSerie(item, i, s, conKg)).join('')}</div>
    <div class="fila-botones" style="margin-top:4px">
      <button class="boton fantasma chico" data-a="ses:serie" data-d="1">${icono('sumar')} Serie</button>
      <button class="boton fantasma chico" data-a="ses:serie" data-d="-1" ${item.series.length <= 1 ? 'disabled' : ''}>Quitar serie</button>
    </div>
    <details class="acordeon" style="margin-top:14px"><summary>Cómo se hace</summary><div class="contenido">
      <ol style="padding-left:20px;margin:0 0 10px">${ej.pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
      ${ej.errores.length ? `<p><b style="color:var(--vino-claro)">Evita:</b> ${esc(ej.errores.join(' '))}</p>` : ''}
      <button class="boton secundario chico" data-a="ses:video" data-id="${ej.id}">${icono('video')} Ver video en YouTube</button>
    </div></details>`;
}

function pantallaCardio(a) {
  const c = a.cardio;
  const ej = EJ[c.ej];
  const seg = c.seg + (c.corriendo ? (Date.now() - c.corriendo) / 1000 : 0);
  return `<h1 class="ej-titulo">Cardio: ${esc(ej.nombre)}</h1>
    ${demo(ej.id, 'chica')}
    <p class="meta-ej" style="margin-top:10px">${c.min} minutos en zona 2. ${esc(ej.pasos[0])}</p>
    <div class="panel" style="text-align:center">
      <div class="numero" id="cardioTiempo" style="font-size:64px;line-height:1">${mmss(seg)}</div>
      <div class="tenue chico">de ${c.min}:00</div>
      <div class="fila-botones"><button class="boton ${c.corriendo ? 'secundario' : 'primario'}" data-a="ses:cardioReloj">${c.corriendo ? 'Pausar' : seg > 0 ? 'Seguir' : 'Iniciar'}</button></div>
    </div>
    ${c.hecho ? '<p class="permiso-ok" style="margin-top:12px">Cardio marcado como hecho.</p>' : ''}`;
}

function pantallaEnfriamiento(a) {
  const l = ENFRIAMIENTO[a.zona] || ENFRIAMIENTO.full;
  return `<h1 class="ej-titulo">Estiramientos</h1>
    <p class="meta-ej">5 minutos para bajar pulsaciones. Estira suave, sin rebotar.</p>
    ${listaMovs(l, a.enfriamiento, 'enfriamiento')}`;
}

function pantallaResumen() {
  const s = ultimoResumen && estado.entreno.sesiones.find((x) => x.id === ultimoResumen);
  if (!s) return '<div class="vacio">No hay resumen.<br><button class="boton primario" data-a="ir" data-ruta="hoy">Ir a hoy</button></div>';
  const min = Math.round((s.fin - s.inicio) / 60000);
  const series = s.ejercicios.reduce((n, e) => n + e.series.length, 0);
  const req = requisitos(FASE[s.fase]);
  const sigFase = FASES[FASES.findIndex((f) => f.id === s.fase) + 1];
  const subir = req.cumple && sigFase && estado.config.fase === s.fase;
  return `<header class="cabeza"><span class="cabeza-fecha">Entreno terminado</span><h1 class="cabeza-titulo">${esc(s.nombre)}</h1></header>
    <div class="cifras">
      <div class="cifra"><span class="numero">${min}</span><small>minutos</small></div>
      <div class="cifra"><span class="numero">${num(s.volumen)}</span><small>kg movidos</small></div>
      <div class="cifra"><span class="numero">${series}</span><small>series</small></div>
    </div>
    <div class="panel"><span class="numero" style="font-size:30px;color:var(--mostaza)">+${s.xp} XP</span>
      <p class="tenue" style="margin:4px 0 0">${s.records ? `Rompiste ${s.records} ${s.records === 1 ? 'récord' : 'récords'}: ${esc(s.recordsLista.join(', '))}.` : 'Sin récords hoy; lo importante es la constancia.'}</p></div>
    ${subir ? `<div class="aviso-caja olivo"><b>Cumpliste todo para la fase ${sigFase.num}: ${esc(sigFase.nombre)}.</b><br><button class="boton primario chico" data-a="ir" data-ruta="camino">Ver el camino</button></div>` : ''}
    <h2 class="seccion">Lo que hiciste</h2>
    <ul class="lista">${s.ejercicios
      .map(
        (e) => `<li class="fila"><span class="fila-cuerpo"><span class="fila-titulo">${esc(EJ[e.ej].nombre)}</span><span class="fila-sub" style="display:block">${e.series
          .map((x) => (x.seg ? `${x.seg} s` : `${x.kg ? kg(x.kg) + ' × ' : ''}${x.reps}`))
          .join(', ') || 'Sin series'}</span></span></li>`
      )
      .join('')}</ul>
    <div class="pila-botones"><button class="boton primario" data-a="ir" data-ruta="hoy">Listo</button></div>`;
}

function navInferior(a) {
  let izq = '';
  let der = '';
  if (a.paso === 'calentamiento') {
    izq = '<button class="boton secundario" data-a="ses:paso" data-v="0">Saltar</button>';
    der = '<button class="boton primario" data-a="ses:paso" data-v="0">A darle</button>';
  } else if (typeof a.paso === 'number') {
    const ultimo = a.paso === a.ejercicios.length - 1;
    const sig = ultimo ? (a.cardio ? 'cardio' : 'enfriamiento') : a.paso + 1;
    izq = `<button class="boton secundario" data-a="ses:paso" data-v="${a.paso === 0 ? 'calentamiento' : a.paso - 1}">Anterior</button>`;
    der = `<button class="boton primario" data-a="ses:paso" data-v="${sig}">${ultimo ? (a.cardio ? 'Al cardio' : 'Estiramientos') : 'Siguiente'}</button>`;
  } else if (a.paso === 'cardio') {
    izq = `<button class="boton secundario" data-a="ses:paso" data-v="enfriamiento">Saltar</button>`;
    der = `<button class="boton primario" data-a="ses:cardioHecho">Hecho</button>`;
  } else if (a.paso === 'enfriamiento') {
    izq = `<button class="boton secundario" data-a="ses:paso" data-v="${a.cardio ? 'cardio' : a.ejercicios.length - 1}">Anterior</button>`;
    der = `<button class="boton primario" data-a="ses:terminar">Terminar</button>`;
  }
  return `<div class="nav-sesion"><div class="fila-botones" style="margin:0">${izq}${der}</div></div>`;
}

function barraDescanso(a) {
  if (!a.descanso) return '';
  const resta = Math.max(0, (a.descanso.hasta - Date.now()) / 1000);
  const pct = Math.min(100, (1 - resta / a.descanso.total) * 100);
  return `<div class="descanso ${resta <= 0 ? 'listo' : ''}" id="descanso" style="bottom:calc(74px + env(safe-area-inset-bottom))">
    <div class="descanso-dentro">
      <div class="tiempo" id="descansoTiempo">${resta > 0 ? mmss(resta) : '¡Va!'}<small>${resta > 0 ? 'descansando' : 'siguiente serie'}</small></div>
      <button class="boton fantasma chico" data-a="ses:desc" data-d="-15">−15</button>
      <button class="boton fantasma chico" data-a="ses:desc" data-d="15">+15</button>
      <button class="boton secundario chico" data-a="ses:desc" data-d="0">Saltar</button>
      <span class="pista"><i id="descansoBarra" style="width:${pct}%;background:var(--olivo)"></i></span>
    </div>
  </div>`;
}

function render(modo) {
  if (modo === 'resumen') return pantallaResumen();
  const a = activa();
  if (!a) return '<div class="vacio">No hay ningún entreno en curso.<br><button class="boton primario" data-a="hoy:empezar">Empezar uno</button></div>';
  let cuerpo = '';
  if (a.paso === 'calentamiento') cuerpo = pantallaCalentamiento(a);
  else if (a.paso === 'cardio' && a.cardio) cuerpo = pantallaCardio(a);
  else if (a.paso === 'enfriamiento') cuerpo = pantallaEnfriamiento(a);
  else cuerpo = pantallaEjercicio(a, Math.min(Number(a.paso) || 0, a.ejercicios.length - 1));
  return `${barraSuperior(a)}${cuerpo}<div style="height:${a.descanso ? 150 : 40}px"></div>${barraDescanso(a)}${navInferior(a)}`;
}

// ---------- Reloj: cronómetro, descanso y cardio ----------
function tick() {
  const a = activa();
  if (!a) return;
  const crono = document.getElementById('crono');
  if (crono) crono.textContent = mmss((Date.now() - a.inicio) / 1000);
  if (a.descanso) {
    const resta = (a.descanso.hasta - Date.now()) / 1000;
    const el = document.getElementById('descansoTiempo');
    const barra = document.getElementById('descansoBarra');
    if (el) el.innerHTML = resta > 0 ? `${mmss(resta)}<small>descansando</small>` : '¡Va!<small>siguiente serie</small>';
    if (barra) barra.style.width = Math.min(100, (1 - Math.max(0, resta) / a.descanso.total) * 100) + '%';
    if (resta <= 0 && !avisado) {
      avisado = true;
      document.getElementById('descanso')?.classList.add('listo');
      nativo.vibrar(600);
      if (estado.config.sonidoDescanso !== false) pitido(3);
    }
    if (resta < -45) {
      a.descanso = null;
      marcar('entreno');
      refrescar();
    }
  }
  if (a.paso === 'cardio' && a.cardio && a.cardio.corriendo) {
    const seg = a.cardio.seg + (Date.now() - a.cardio.corriendo) / 1000;
    const el = document.getElementById('cardioTiempo');
    if (el) el.textContent = mmss(seg);
    if (seg >= a.cardio.min * 60 && !a.cardio.avisado) {
      a.cardio.avisado = true;
      nativo.vibrar(800);
      pitido(3);
      aviso('Cardio completo.');
    }
  }
}

function montar(raiz, modo) {
  clearInterval(reloj);
  if (modo === 'resumen' || !activa()) {
    nativo.pantallaEncendida(false);
    return;
  }
  reloj = setInterval(tick, 500);
  nativo.pantallaEncendida(true);
}

function desmontar() {
  clearInterval(reloj);
  reloj = null;
  nativo.pantallaEncendida(false);
}

// ---------- Guardar el entreno ----------
function finalizar() {
  const a = activa();
  if (!a) return;
  if (a.cardio && a.cardio.corriendo) {
    a.cardio.seg += (Date.now() - a.cardio.corriendo) / 1000;
    a.cardio.corriendo = null;
  }
  let volumen = 0;
  const records = [];
  const ejercicios = a.ejercicios.map((item) => {
    const hechas = item.series
      .filter((s) => s.hecho)
      .map((s) => ({ kg: s.kg === '' ? 0 : Number(s.kg) || 0, reps: Number(s.reps) || 0, seg: Number(s.seg) || 0, hecho: true }));
    for (const s of hechas) volumen += (s.kg || 0) * (s.reps || 0);
    const mejorHoy = Math.max(0, ...hechas.map((s) => e1rm(s.kg, s.reps)));
    const antes = mejorMarca(item.ej, a.id);
    if (mejorHoy > 0 && antes && mejorHoy > antes.e1rm + 0.01) records.push(EJ[item.ej].nombre);
    return { ej: item.ej, plan: item.plan, series: hechas };
  });
  const cardioHecho = !!(a.cardio && a.cardio.hecho);
  const s = {
    id: a.id, fecha: a.fecha, inicio: a.inicio, fin: Date.now(), fase: a.fase, rutina: a.rutina, nombre: a.nombre,
    ejercicios, volumen: Math.round(volumen), records: records.length, recordsLista: records,
    cardio: a.cardio ? { ej: a.cardio.ej, min: Math.round(a.cardio.seg / 60) || (cardioHecho ? a.cardio.min : 0), hecho: cardioHecho } : null,
    xp: 100 + records.length * 15 + (cardioHecho ? 20 : 0),
  };
  estado.entreno.sesiones.push(s);
  estado.entreno.activa = null;
  marcar('entreno');
  guardarYa();
  ultimoResumen = s.id;
  desmontar();
  ir('sesion/resumen', true);
}

function irPaso(v) {
  const a = activa();
  if (v === 'calentamiento' || v === 'cardio' || v === 'enfriamiento') a.paso = v;
  else a.paso = Math.max(0, Math.min(a.ejercicios.length - 1, Number(v)));
  if (a.paso === 'cardio' && !a.cardio) a.paso = 'enfriamiento';
  marcar('entreno');
  refrescar();
  window.scrollTo(0, 0);
}

function verEjercicio(id) {
  const ej = EJ[id];
  abrirHoja(`<h2 class="hoja-titulo">${esc(ej.nombre)}</h2>
    <div class="demo">${imagenes(id).map((s) => `<img src="${s}" alt="">`).join('')}</div>
    <p class="tenue" style="margin-top:10px">${esc(ej.musculos)}. ${esc(ej.equipo)}.</p>
    <ol style="padding-left:20px">${ej.pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
    ${ej.errores.length ? `<p><b style="color:var(--vino-claro)">Evita:</b> ${esc(ej.errores.join(' '))}</p>` : ''}
    <div class="pila-botones"><button class="boton secundario" data-a="ses:video" data-id="${id}">${icono('video')} Ver video en YouTube</button></div>`);
}

registrar({
  'ses:paso': (el) => irPaso(el.dataset.v),
  'ses:verEj': (el) => verEjercicio(el.dataset.id),
  'ses:video': (el) => nativo.abrirUrl(urlVideo(EJ[el.dataset.id])),
  'ses:mov': (el) => {
    const a = activa();
    const tipo = el.dataset.tipo;
    a[tipo][el.dataset.id] = !a[tipo][el.dataset.id];
    marcar('entreno');
    refrescar();
  },
  'ses:valor': (el) => {
    const a = activa();
    const item = a.ejercicios[a.paso];
    const s = item.series[Number(el.dataset.i)];
    s[el.dataset.campo] = el.value.trim().replace(',', '.');
    // el peso de la primera serie se copia a las siguientes que no estén hechas
    // (sin volver a pintar la pantalla, para no perder el toque que viene)
    if (el.dataset.campo === 'kg' && Number(el.dataset.i) === 0) {
      item.series.forEach((x, k) => {
        if (k === 0 || x.hecho) return;
        x.kg = s.kg;
        const inp = document.querySelector(`[data-c="ses:valor"][data-campo="kg"][data-i="${k}"]`);
        if (inp) inp.value = s.kg;
      });
    }
    marcar('entreno');
  },
  'ses:mas': (el) => {
    const a = activa();
    const item = a.ejercicios[a.paso];
    const i = Number(el.dataset.i);
    const s = item.series[i];
    const campo = el.dataset.campo;
    const pl = item.plan;
    const base = s[campo] === '' || s[campo] === undefined ? (campo === 'kg' ? 0 : pl.seg ? pl.seg[1] : pl.reps[1]) : Number(s[campo]) || 0;
    const nuevo = Math.max(0, Math.round((base + Number(el.dataset.d)) * 10) / 10);
    s[campo] = nuevo;
    if (campo === 'kg') item.series.slice(i + 1).forEach((x) => { if (!x.hecho) x.kg = nuevo; });
    marcar('entreno');
    refrescar();
  },
  'ses:hecha': (el) => {
    const a = activa();
    const item = a.ejercicios[a.paso];
    const s = item.series[Number(el.dataset.i)];
    const pl = item.plan;
    if (!s.hecho) {
      if (pl.seg) { if (s.seg === '' || s.seg === undefined) s.seg = pl.seg[1]; }
      else if (s.reps === '' || s.reps === undefined) s.reps = pl.reps[1];
      s.hecho = true;
      a.descanso = { hasta: Date.now() + pl.desc * 1000, total: pl.desc };
      avisado = false;
      nativo.vibrar(40);
    } else {
      s.hecho = false;
    }
    marcar('entreno');
    refrescar();
  },
  'ses:serie': (el) => {
    const a = activa();
    const item = a.ejercicios[a.paso];
    if (Number(el.dataset.d) > 0) {
      const ult = item.series[item.series.length - 1] || {};
      item.series.push({ kg: ult.kg ?? '', reps: '', seg: '', hecho: false });
    } else if (item.series.length > 1) {
      item.series.pop();
    }
    marcar('entreno');
    refrescar();
  },
  'ses:desc': (el) => {
    const a = activa();
    if (!a.descanso) return;
    const d = Number(el.dataset.d);
    if (d === 0) a.descanso = null;
    else {
      a.descanso.hasta += d * 1000;
      a.descanso.total = Math.max(5, a.descanso.total + d);
      if (a.descanso.hasta > Date.now()) avisado = false;
    }
    marcar('entreno');
    refrescar();
  },
  'ses:cambiar': (el) => {
    const a = activa();
    const i = Number(el.dataset.i);
    const item = a.ejercicios[i];
    const opciones = [item.original, ...(item.plan.alt || [])].filter((x, k, arr) => x !== item.ej && arr.indexOf(x) === k);
    const panel = abrirHoja(`<h2 class="hoja-titulo">Cambiar ejercicio</h2><p class="hoja-texto">Si la máquina está ocupada o te molesta algo, usa uno de estos.</p>
      ${opciones
        .map((id) => `<button class="fila" data-nuevo="${id}"><img class="miniatura" src="${imagenes(id)[0]}" alt=""><span class="fila-cuerpo"><span class="fila-titulo">${esc(EJ[id].nombre)}</span><span class="fila-sub" style="display:block">${esc(EJ[id].musculos)}</span></span>${icono('flecha', 'flecha')}</button>`)
        .join('')}`);
    panel.querySelectorAll('[data-nuevo]').forEach((b) => {
      b.onclick = () => {
        const nuevoId = b.dataset.nuevo;
        const pl = { ...item.plan, ej: nuevoId };
        const preparado = prepararEjercicio(pl, nuevoId, a.id, a.descarga);
        preparado.original = item.original;
        preparado.plan.alt = item.plan.alt;
        a.ejercicios[i] = preparado;
        marcar('entreno');
        cerrarHoja();
        refrescar();
      };
    });
  },
  'ses:cardioReloj': () => {
    const c = activa().cardio;
    if (c.corriendo) {
      c.seg += (Date.now() - c.corriendo) / 1000;
      c.corriendo = null;
    } else c.corriendo = Date.now();
    marcar('entreno');
    refrescar();
  },
  'ses:cardioHecho': () => {
    const c = activa().cardio;
    if (c.corriendo) {
      c.seg += (Date.now() - c.corriendo) / 1000;
      c.corriendo = null;
    }
    c.hecho = true;
    marcar('entreno');
    irPaso('enfriamiento');
  },
  'ses:terminar': () => finalizar(),
  'ses:salir': () => {
    const a = activa();
    const algo = a && a.ejercicios.some((e) => e.series.some((s) => s.hecho));
    confirmar('¿Salir del entreno?', algo ? 'Puedes guardar lo que llevas o seguir después.' : 'Todavía no anotas ninguna serie.', [
      ...(algo ? [{ texto: 'Guardar y terminar', clase: 'primario', hacer: finalizar }] : []),
      { texto: 'Seguir después', clase: 'secundario', hacer: () => { desmontar(); ir('hoy'); } },
      {
        texto: 'Descartar entreno', clase: 'peligro',
        hacer: () => {
          estado.entreno.activa = null;
          marcar('entreno');
          desmontar();
          ir('hoy');
        },
      },
    ]);
  },
});

export const vistaSesion = { tab: 'entreno', sinNav: true, render, montar, desmontar };
