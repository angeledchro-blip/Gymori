// Pantalla principal (tu agenda del día): qué toca en el gym, comida, horario, escuela y servicio social,
// agua, checklist, peso y nivel.
import { estado, marcar, diario, horario } from '../store.js';
import { registrar, refrescar, ir } from '../nucleo.js';
import { esc, hoy, fechaLarga, num, kg, abrirHoja, cerrarHoja, aviso, sumarDias, diaSemana, hora12, minutosDe } from '../util.js';
import { icono } from '../iconos.js';
import { barraPesas, discoKcal, barraMacro } from '../graficos.js';
import {
  objetivos, totalesDia, siguienteRutina, esDiaDeEntreno, sesionDe, faseActual, semanaFase, esDescarga,
  tendencia, sugerenciaAjuste, nivel, rachaSemanas, pesoActual, diasEntreno, pesoAnterior, historial,
} from '../calc.js';
import { EJ } from '../datos/ejercicios.js';
import { proximos, reporteSS } from '../agenda.js';
import * as nativo from '../nativo.js';
import { iniciarSesion } from './sesion.js';
import { filaPendiente, filaReporte } from './agenda.js';
import { faltanParaLaAlarma } from './mas.js';

const CHECKS = {
  creatina: ['Creatina', '3 a 5 g, a cualquier hora'],
  pasos: ['Pasos', ''],
  proteina: ['Llegué a mi proteína', ''],
  sueno: ['Dormí 7 horas o más', ''],
  plantas: ['Regar a Maboroshi e Ibuki', 'Tus melones'],
  guitarra: ['Un rato de guitarra', 'Aunque sean 15 minutos de púa'],
  cardio: ['Cardio del día', '20 a 30 min en zona 2'],
};

// Horas de sueño entre la hora de dormir y la alarma
function horasSueno(h) {
  const dormir = minutosDe(h.dormir);
  const despertar = minutosDe(estado.config.horaAlarma || '04:45');
  if (dormir === null || despertar === null) return null;
  return ((despertar - dormir + 1440) % 1440) / 60;
}

function bloqueHorario() {
  const h = horario();
  const entrena = esDiaDeEntreno() && !sesionDe(hoy()).length;
  const escuela = diaSemana(hoy()) <= 5;
  const sueno = horasSueno(h);
  const filas = [
    ...(estado.config.horaAlarma ? [['despertar', estado.config.horaAlarma, 'Despertar', 'Tu alarma']] : []),
    ['desayuno', h.desayuno, 'Desayuno', entrena ? 'Antes del gym, para no entrenar en ayunas' : ''],
    ...(entrena ? [['gym', h.gym, 'Gym', 'Calentamiento, rutina y cardio']] : []),
    ['comida', h.comida, 'Comida', entrena && escuela ? 'Después del gym y de bañarte, antes de la escuela' : escuela ? 'Antes de la escuela' : ''],
    ...(escuela ? [['escuela', h.escuela, 'Escuela', `Hasta las ${hora12(h.salida)}`]] : []),
    ['colacion', h.colacion, 'Colación', escuela ? 'En la escuela' : ''],
    ['cena', h.cena, 'Cena', 'Al llegar a casa; 2 a 3 h antes de dormir'],
    ['dormir', h.dormir, 'Dormir', `${sueno ? `${textoHoras(sueno)} hasta tu alarma. ` : ''}Pantallas fuera a las ${hora12(minutosAHora(minutosDe(h.dormir) - 30))}`],
  ].sort((a, b) => minutosDe(a[1]) - minutosDe(b[1]));
  const d = new Date();
  const ahora = d.getHours() * 60 + d.getMinutes();
  const sig = filas.find((f) => minutosDe(f[1]) > ahora);
  return `<div class="seccion-fila"><h2>Tu horario</h2><a class="enlace" href="#/ajustes">Cambiar</a></div>
    <ul class="horario">${filas
      .map(([id, hhmm, titulo, sub]) => `<li class="${sig && sig[0] === id ? 'siguiente' : minutosDe(hhmm) <= ahora ? 'pasado' : ''}"><span class="hora">${esc(hora12(hhmm))}</span><span class="fila-cuerpo"><span class="fila-titulo">${esc(titulo)}</span>${sub ? `<span class="fila-sub" style="display:block">${esc(sub)}</span>` : ''}</span></li>`)
      .join('')}</ul>`;
}

function textoHoras(horas) {
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

function minutosAHora(m) {
  const t = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

function saludo() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function bloqueEntreno() {
  const activa = estado.entreno.activa;
  if (activa) {
    const hechas = (activa.ejercicios || []).filter((e) => (e.series || []).some((s) => s.hecho)).length;
    return `<section class="hoy-entreno">
      <div class="rotulo">Tienes un entreno a medias</div>
      <div class="nombre-rutina">${esc(activa.nombre)}</div>
      <div class="detalle">Llevas ${hechas} de ${activa.ejercicios.length} ejercicios.</div>
      <div class="fila-botones"><button class="boton primario" data-a="hoy:continuar">Continuar</button></div>
    </section>`;
  }
  const hechasHoy = sesionDe(hoy());
  const sig = siguienteRutina();
  const f = faseActual();
  if (hechasHoy.length) {
    const s = hechasHoy[hechasHoy.length - 1];
    const min = Math.round(((s.fin || s.inicio) - s.inicio) / 60000);
    return `<section class="hoy-entreno">
      <div class="hecho-hoy">${icono('check')} Entreno de hoy listo</div>
      <div class="nombre-rutina">${esc(s.nombre)}</div>
      <div class="detalle">${min} minutos, ${num(s.volumen || 0)} kg movidos${s.records ? `, ${s.records} ${s.records === 1 ? 'récord' : 'récords'}` : ''}.</div>
      <div class="detalle" style="margin-top:8px">Siguiente: ${esc(sig.nombre)}</div>
    </section>`;
  }
  const descarga = esDescarga() ? '<span class="etiqueta mostaza" style="margin-left:8px">Semana de descarga</span>' : '';
  if (esDiaDeEntreno()) {
    return `<section class="hoy-entreno">
      <div class="rotulo">Hoy toca${descarga}</div>
      <div class="nombre-rutina">${esc(sig.nombre)}</div>
      <div class="detalle">${sig.ejercicios.length} ejercicios, unos ${sig.min} minutos. Fase ${f.num}, semana ${semanaFase()}.</div>
      ${barraPesas(sig.ejercicios)}
      ${pesosDeLaVezPasada(sig)}
      <button class="boton primario" data-a="hoy:empezar">Empezar entreno</button>
    </section>`;
  }
  // día de descanso: ¿cuándo toca?
  let prox = null;
  for (let i = 1; i <= 7; i++) {
    const f2 = sumarDias(hoy(), i);
    if (diasEntreno().includes(diaSemana(f2))) {
      prox = i === 1 ? 'mañana' : `el ${['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'][diaSemana(f2)]}`;
      break;
    }
  }
  return `<section class="hoy-entreno">
    <div class="rotulo">Hoy descansas</div>
    <div class="nombre-rutina">Descanso activo</div>
    <div class="detalle">Camina o haz 20 a 30 minutos de cardio suave. ${prox ? `Toca ${esc(sig.nombre)} ${prox}.` : ''}</div>
    <div class="fila-botones"><button class="boton secundario" data-a="hoy:empezar">Entrenar de todos modos</button></div>
  </section>`;
}

// Si a la alarma le falta un permiso para que salga su ventana, se avisa arriba
function avisoAlarma() {
  if (!nativo.enApp()) return '';
  const alarmas = nativo.alarmas.leer();
  if (!alarmas || !(alarmas.alarmas || []).some((a) => a.activa)) return '';
  const faltan = faltanParaLaAlarma(nativo.permisos.estado());
  if (!faltan.length) return '';
  return `<a class="aviso-caja" href="#/alarmas" style="display:block;color:inherit;text-decoration:none"><b>Tu alarma puede sonar sin que salga su ventana.</b> Falta activar: ${esc(faltan.join(', '))}. Toca aquí para arreglarlo.</a>`;
}

// Peso de la vez pasada en cada máquina de la rutina que toca
function pesosDeLaVezPasada(rutina) {
  const filas = rutina.ejercicios.map((pl) => {
    const e = EJ[pl.ej];
    let dato = 'nuevo';
    if (pl.seg) {
      const h = historial(pl.ej)[0];
      if (h) dato = `${Math.max(0, ...h.series.map((s) => Number(s.seg) || 0))} s`;
    } else {
      const p = pesoAnterior(pl.ej);
      if (p) dato = `${kg(p.kg)} × ${p.reps}`;
    }
    return `<li><span>${esc(e.nombre)}</span><b class="${dato === 'nuevo' ? 'nuevo' : ''}">${esc(dato)}</b></li>`;
  });
  return `<details class="pesos-hoy" open><summary>Pesos de la vez pasada</summary><ul>${filas.join('')}</ul></details>`;
}

// Escuela, tesis y servicio social: lo que viene en 2 semanas y el reporte mensual
function bloqueAgenda() {
  const lista = proximos({ dias: 14, max: 5 });
  const r = reporteSS();
  const conReporte = r && r.faltan <= 7;
  return `<div class="seccion-fila"><h2>Escuela y servicio</h2><a class="enlace" href="#/agenda">Ver agenda</a></div>
    ${conReporte ? filaReporte(r) : ''}
    ${lista.map((p) => filaPendiente(p)).join('')}
    ${!lista.length && !conReporte ? '<p class="tenue chico" style="margin:0 0 6px">Sin tareas, exámenes ni entregas en las próximas 2 semanas.</p>' : ''}
    <button class="enlace" data-a="age:nuevo">${icono('sumar')} Agregar tarea, examen o entrega</button>`;
}

function bloqueComida() {
  const o = objetivos();
  const t = totalesDia(hoy());
  const resta = Math.round(o.kcal - t.kcal);
  const sug = sugerenciaAjuste();
  return `<div class="seccion-fila"><h2>Comida</h2><button class="enlace" data-a="ir" data-ruta="comida">Ver el día</button></div>
    <button class="resumen-dia" data-a="ir" data-ruta="comida" style="background:none;border:0;padding:0;width:100%;text-align:left;cursor:pointer">
      <div class="disco">${discoKcal(t.kcal, o.kcal)}<div class="disco-centro"><span class="numero">${num(Math.abs(resta))}</span><small>${resta >= 0 ? 'kcal te quedan' : 'kcal de más'}</small></div></div>
      <div class="macros">
        <div class="macro-fila"><span>Proteína</span><b>${num(t.p)} / ${o.p} g</b>${barraMacro(t.p, o.p, '#aab757')}</div>
        <div class="macro-fila"><span>Carbos</span><b>${num(t.c)} / ${o.c} g</b>${barraMacro(t.c, o.c, '#dba43f')}</div>
        <div class="macro-fila"><span>Grasa</span><b>${num(t.g)} / ${o.g} g</b>${barraMacro(t.g, o.g, '#c99e6b')}</div>
      </div>
    </button>
    ${sug ? `<div class="aviso-caja">${esc(sug.texto)}<br><button class="boton chico mostaza" data-a="hoy:ajuste" data-v="${sug.delta}">Aplicar ${sug.delta > 0 ? '+' : ''}${sug.delta} kcal</button></div>` : ''}
    ${o.modo === 'mantener' ? '<div class="aviso-caja olivo">Llegaste a tu meta. Tus calorías ya están en mantenimiento: ahora a cuidar lo ganado.</div>' : ''}`;
}

function bloqueAgua() {
  const d = diario(hoy());
  const meta = estado.config.aguaMeta || 12;
  const vasos = Array.from({ length: meta }, (_, i) => `<button class="vaso ${i < d.agua ? 'lleno' : ''}" data-a="hoy:agua" data-v="${i + 1}" aria-label="Vaso ${i + 1}"></button>`).join('');
  const litros = (v) => (v * 0.25).toFixed(2).replace(/\.?0+$/, '');
  return `<div class="seccion-fila"><h2>Agua</h2><span class="tenue chico">${litros(d.agua)} de ${litros(meta)} L</span></div>
    <div class="vasos">${vasos}</div>`;
}

function bloqueChecklist() {
  const d = diario(hoy());
  const lista = estado.config.checklist || ['creatina', 'pasos', 'proteina', 'sueno'];
  const pasos = faseActual().pasos;
  return `<h2 class="seccion">Pendientes del día</h2>
    ${lista
      .map((k) => {
        const [t, sub] = CHECKS[k] || [k, ''];
        const subt = k === 'pasos' ? `${num(pasos)} pasos` : k === 'sueno' ? `Hora de dormir: ${hora12(horario().dormir)}` : sub;
        const hecho = !!(d.checks || {})[k];
        return `<button class="check-fila ${hecho ? 'hecho' : ''}" data-a="hoy:check" data-v="${k}">
          <span class="caja-check">${hecho ? icono('check') : ''}</span>
          <span class="fila-cuerpo"><span class="fila-titulo">${esc(t)}</span>${subt ? `<span class="fila-sub" style="display:block">${esc(subt)}</span>` : ''}</span>
        </button>`;
      })
      .join('')}`;
}

function bloquePeso() {
  const t = tendencia();
  const actual = pesoActual();
  const o = objetivos();
  const registradoHoy = estado.peso.registros.some((r) => r.fecha === hoy());
  return `<h2 class="seccion">Peso</h2>
    <div class="peso-hoy">
      <div>
        <span class="numero">${actual ? num(t.promedio || actual, 1) : '—'}</span> <span class="tenue">kg</span>
        <div class="tenue chico">${t.ritmo !== null ? `${t.ritmo <= 0 ? 'Bajando' : 'Subiendo'} ${num(Math.abs(t.ritmo), 2)} kg por semana` : 'Promedio de 7 días'}. Meta: ${kg(o.meta)}</div>
      </div>
      <button class="boton ${registradoHoy ? 'secundario' : 'primario'} chico" data-a="hoy:peso">${registradoHoy ? 'Corregir' : 'Pesarme'}</button>
    </div>`;
}

function bloqueNivel() {
  const n = nivel();
  const r = rachaSemanas();
  return `<h2 class="seccion">Tu nivel</h2>
    <button class="nivel" data-a="ir" data-ruta="camino" style="background:none;border:0;padding:0;width:100%;text-align:left;cursor:pointer">
      <span class="nivel-num">${n.n}</span>
      <span class="fila-cuerpo">
        <span class="fila-titulo">${esc(n.titulo)}: ${num(n.xp)} XP</span>
        ${barraMacro(n.xp - n.desde, n.hasta - n.desde, '#dba43f')}
        <span class="fila-sub" style="display:block;margin-top:4px">${r.racha ? `Racha de ${r.racha} ${r.racha === 1 ? 'semana' : 'semanas'} cumpliendo` : `Esta semana: ${r.estaSemana} de ${r.meta} entrenos para empezar racha`}</span>
      </span>
    </button>`;
}

function render() {
  const nombre = estado.perfil.nombre ? `, ${esc(estado.perfil.nombre)}` : '';
  const alarma = nativo.enApp() ? `<button class="etiqueta olivo" data-a="ir" data-ruta="alarmas" style="border:0;cursor:pointer;padding:6px 10px">${icono('alarma')} ${esc(estado.config.horaAlarma || '')}</button>` : '';
  return `<header class="cabeza">
      <div class="cabeza-fila"><span class="cabeza-fecha">${esc(fechaLarga(hoy()))}</span>${alarma}</div>
      <h1 class="cabeza-titulo">${saludo()}${nombre}</h1>
    </header>
    ${avisoAlarma()}
    ${bloqueEntreno()}
    ${bloqueComida()}
    ${bloqueHorario()}
    ${bloqueAgenda()}
    ${bloqueAgua()}
    ${bloqueChecklist()}
    ${bloquePeso()}
    ${bloqueNivel()}`;
}

export function hojaPeso(alGuardar) {
  const actual = estado.peso.registros.find((r) => r.fecha === hoy());
  const valor = actual ? actual.kg : pesoActual() || '';
  const panel = abrirHoja(`<h2 class="hoja-titulo">Peso de hoy</h2>
    <p class="hoja-texto">En ayunas, después de ir al baño.</p>
    <div class="paso" style="height:64px">
      <button type="button" data-d="-0.1" aria-label="Menos">−</button>
      <input id="pesoHoy" inputmode="decimal" value="${valor}" aria-label="Peso en kg" />
      <button type="button" data-d="0.1" aria-label="Más">+</button>
    </div>
    <div class="pila-botones"><button class="boton primario" id="guardarPeso">Guardar</button></div>`);
  const inp = panel.querySelector('#pesoHoy');
  panel.querySelectorAll('[data-d]').forEach((bt) => {
    bt.onclick = () => {
      const v = parseFloat(String(inp.value).replace(',', '.')) || 0;
      inp.value = (Math.round((v + Number(bt.dataset.d)) * 10) / 10).toFixed(1);
    };
  });
  panel.querySelector('#guardarPeso').onclick = () => {
    const v = parseFloat(String(inp.value).replace(',', '.'));
    if (!v || v < 30 || v > 300) return aviso('Escribe un peso válido en kg.');
    estado.peso.registros = estado.peso.registros.filter((r) => r.fecha !== hoy());
    estado.peso.registros.push({ fecha: hoy(), kg: Math.round(v * 10) / 10 });
    marcar('peso');
    cerrarHoja();
    aviso('Peso guardado.');
    if (alGuardar) alGuardar();
    else refrescar();
  };
}

registrar({
  'hoy:empezar': () => iniciarSesion(),
  'hoy:continuar': () => ir('sesion'),
  'hoy:agua': (el) => {
    const d = diario(hoy());
    const v = Number(el.dataset.v);
    d.agua = d.agua === v ? v - 1 : v;
    marcar('diario');
    if (d.agua === (estado.config.aguaMeta || 12)) aviso('Meta de agua cumplida.');
    refrescar();
  },
  'hoy:check': (el) => {
    const d = diario(hoy());
    d.checks = d.checks || {};
    d.checks[el.dataset.v] = !d.checks[el.dataset.v];
    marcar('diario');
    refrescar();
  },
  'hoy:peso': () => hojaPeso(),
  'hoy:ajuste': (el) => {
    estado.perfil.kcalAjuste = (Number(estado.perfil.kcalAjuste) || 0) + Number(el.dataset.v);
    estado.perfil.ultimoAjuste = hoy();
    marcar('perfil');
    aviso('Calorías ajustadas.');
    refrescar();
  },
});

export const vistaHoy = { tab: 'hoy', render };
