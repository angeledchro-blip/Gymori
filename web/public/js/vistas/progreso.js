// Progreso: peso con tendencia y proyección, cintura, fuerza y constancia.
import { estado, marcar } from '../store.js';
import { registrar, refrescar } from '../nucleo.js';
import { esc, hoy, num, kg, fechaCorta, fechaLarga, sumarDias, lunesDe, abrirHoja, cerrarHoja, aviso, diasEntre } from '../util.js';
import { graficaPeso, chispa } from '../graficos.js';
import { EJ } from '../datos/ejercicios.js';
import { tendencia, objetivos, proyeccion, registrosPeso, pesoInicial, historial, e1rm, nivel, rachaSemanas, sugerenciaAjuste } from '../calc.js';
import { hojaPeso } from './hoy.js';

let rango = 60;
const LEVANTAMIENTOS = ['sentadilla_barra', 'press_banca', 'rumano_barra', 'remo_pecho', 'peso_muerto', 'press_militar', 'press_hombro_maquina', 'jalon_supino', 'pendulo', 'prensa', 'hip_thrust'];

function bloquePeso() {
  const r = registrosPeso();
  const t = tendencia();
  const o = objetivos();
  const ini = pesoInicial();
  const pr = proyeccion();
  const cambio = ini && t.promedio ? t.promedio - ini : null;
  const sug = sugerenciaAjuste();
  return `<div class="cifras">
      <div class="cifra"><span class="numero">${t.promedio ? num(t.promedio, 1) : '—'}</span><small>kg, promedio 7 días</small></div>
      <div class="cifra"><span class="numero">${cambio !== null ? (cambio > 0 ? '+' : '') + num(cambio, 1) : '—'}</span><small>kg desde el inicio</small></div>
      <div class="cifra"><span class="numero">${t.promedio ? num(Math.max(0, t.promedio - o.meta), 1) : '—'}</span><small>kg para tu meta</small></div>
    </div>
    ${r.length >= 2
      ? `<div class="chips" style="margin-bottom:8px">${[[30, '30 días'], [60, '60 días'], [180, '6 meses'], [9999, 'Todo']].map(([d, n]) => `<button class="chip ${rango === d ? 'activo' : ''}" data-a="pro:rango" data-v="${d}">${n}</button>`).join('')}</div>${graficaPeso(r, o.meta, rango)}`
      : '<p class="vacio">Pésate unos días para ver tu gráfica. Lo que cuenta es la tendencia, no un día suelto.</p>'}
    ${t.ritmo !== null ? `<p class="tenue" style="margin-top:8px">Vas ${t.ritmo <= 0 ? 'bajando' : 'subiendo'} <b style="color:var(--hueso)">${num(Math.abs(t.ritmo), 2)} kg por semana</b> (${num(Math.abs((t.ritmo / t.promedio) * 100), 1)} % de tu peso). Lo ideal: entre 0.5 y 1 %.</p>` : ''}
    ${pr && pr.real ? `<p class="tenue">A este ritmo llegas a ${o.meta} kg alrededor del <b style="color:var(--hueso)">${esc(fechaLarga(pr.real.fecha))}</b>.</p>` : ''}
    ${pr && !pr.real && pr.plan ? `<p class="tenue">Si sigues el plan, llegarías a ${o.meta} kg cerca del <b style="color:var(--hueso)">${esc(fechaLarga(pr.plan.fecha))}</b>.</p>` : ''}
    ${o.modo === 'mantener' ? '<div class="aviso-caja olivo">Estás en tu meta. Ahora el plan es mantener y seguir subiendo de fuerza.</div>' : ''}
    ${sug ? `<div class="aviso-caja">${esc(sug.texto)}<br><button class="boton chico mostaza" data-a="hoy:ajuste" data-v="${sug.delta}">Aplicar ${sug.delta > 0 ? '+' : ''}${sug.delta} kcal</button></div>` : ''}
    <div class="fila-botones"><button class="boton primario" data-a="pro:peso">Registrar peso</button><button class="boton secundario" data-a="pro:cintura">Medir cintura</button></div>
    ${r.length ? `<details class="acordeon" style="margin-top:10px"><summary>Registros de peso</summary><div class="contenido"><ul class="lista">${[...r]
      .reverse()
      .slice(0, 60)
      .map((x) => `<li class="fila" style="min-height:44px;padding:8px 0"><span class="fila-cuerpo">${esc(fechaCorta(x.fecha))}</span><span class="fila-dato">${kg(x.kg)}</span><button class="quitar" data-a="pro:borrarPeso" data-f="${x.fecha}" aria-label="Borrar">×</button></li>`)
      .join('')}</ul></div></details>` : ''}`;
}

function bloqueCintura() {
  const c = [...(estado.peso.cintura || [])].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  if (!c.length) return '';
  const ult = c[c.length - 1];
  const primero = c[0];
  return `<h2 class="seccion">Cintura</h2>
    <div class="cabeza-fila"><div><span class="numero" style="font-size:34px">${num(ult.cm, 1)}</span> <span class="tenue">cm</span><div class="tenue chico">${c.length > 1 ? `${ult.cm - primero.cm <= 0 ? 'Bajaste' : 'Subiste'} ${num(Math.abs(ult.cm - primero.cm), 1)} cm desde ${esc(fechaCorta(primero.fecha))}` : `Medida el ${esc(fechaCorta(ult.fecha))}`}</div></div>${chispa(c.map((x) => x.cm))}</div>
    <p class="tenue chico">Si la cintura baja y el peso no tanto, estás perdiendo grasa y ganando músculo. Va bien.</p>`;
}

function bloqueFuerza() {
  const filas = [];
  for (const id of LEVANTAMIENTOS) {
    const h = historial(id);
    if (!h.length) continue;
    const valores = h.slice(0, 12).reverse().map((x) => Math.max(...x.series.map((s) => e1rm(s.kg, s.reps))));
    const mejor = Math.max(...valores);
    if (!(mejor > 0)) continue;
    filas.push(`<a class="fila" href="#/ejercicio/${id}" style="color:inherit;text-decoration:none"><span class="fila-cuerpo"><span class="fila-titulo">${esc(EJ[id].nombre)}</span><span class="fila-sub" style="display:block">1 rep estimada: ${kg(Math.round(mejor * 2) / 2)}</span></span>${chispa(valores)}</a>`);
  }
  return `<h2 class="seccion">Fuerza</h2>${filas.length ? `<ul class="lista">${filas.join('')}</ul>` : '<p class="tenue">Cuando entrenes vas a ver aquí cómo suben tus marcas en los ejercicios principales.</p>'}`;
}

function bloqueConstancia() {
  const semanas = 12;
  const inicio = lunesDe(sumarDias(hoy(), -7 * (semanas - 1)));
  const fechas = new Set(estado.entreno.sesiones.map((s) => s.fecha));
  const celdas = [];
  // columnas = semanas, filas = días (L a D)
  for (let d = 0; d < 7; d++) {
    for (let w = 0; w < semanas; w++) {
      const f = sumarDias(inicio, w * 7 + d);
      const clase = f > hoy() ? 'futuro' : fechas.has(f) ? 'si' : '';
      celdas.push(`<i class="${clase}" title="${esc(fechaCorta(f))}"></i>`);
    }
  }
  const r = rachaSemanas();
  const n = nivel();
  const total = estado.entreno.sesiones.length;
  return `<h2 class="seccion">Constancia</h2>
    <div class="calendario" aria-label="Entrenos de las últimas 12 semanas">${celdas.join('')}</div>
    <p class="tenue chico" style="margin-top:8px">Últimas 12 semanas: cada cuadro es un día y los verdes son entrenos. Llevas ${total} ${total === 1 ? 'entreno' : 'entrenos'} en total.</p>
    <div class="cifras">
      <div class="cifra"><span class="numero">${r.racha}</span><small>semanas de racha</small></div>
      <div class="cifra"><span class="numero">${n.n}</span><small>nivel (${esc(n.titulo)})</small></div>
      <div class="cifra"><span class="numero">${num(n.xp)}</span><small>XP totales</small></div>
    </div>`;
}

function render() {
  return `<header class="cabeza"><span class="cabeza-fecha">Meta: ${kg(objetivos().meta)}</span><h1 class="cabeza-titulo">Progreso</h1></header>
    ${bloquePeso()}${bloqueCintura()}${bloqueFuerza()}${bloqueConstancia()}`;
}

registrar({
  'pro:rango': (el) => {
    rango = Number(el.dataset.v);
    refrescar();
  },
  'pro:peso': () => hojaPeso(),
  'pro:borrarPeso': (el) => {
    estado.peso.registros = estado.peso.registros.filter((r) => r.fecha !== el.dataset.f);
    marcar('peso');
    refrescar();
  },
  'pro:cintura': () => {
    const panel = abrirHoja(`<h2 class="hoja-titulo">Cintura</h2><p class="hoja-texto">Mide a la altura del ombligo, relajado y sin apretar la cinta.</p>
      <label class="campo"><span>Centímetros</span><input id="cint" inputmode="decimal" placeholder="90" /></label>
      <div class="pila-botones"><button class="boton primario" id="cintOk">Guardar</button></div>`);
    panel.querySelector('#cintOk').onclick = () => {
      const v = parseFloat(String(panel.querySelector('#cint').value).replace(',', '.'));
      if (!v || v < 40 || v > 200) return aviso('Escribe una medida válida en cm.');
      estado.peso.cintura = (estado.peso.cintura || []).filter((x) => x.fecha !== hoy());
      estado.peso.cintura.push({ fecha: hoy(), cm: v });
      marcar('peso');
      cerrarHoja();
      refrescar();
    };
  },
});

export const vistaProgreso = { tab: 'progreso', render };
