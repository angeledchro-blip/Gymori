// Más: alarmas, ajustes, guía, respaldo y créditos.
import { estado, marcar, exportarTodo, importarTodo, borrarTodo, guardarYa, horario, HORARIO_RECOMENDADO } from '../store.js';
import { registrar, refrescar, ir } from '../nucleo.js';
import { esc, hoy, diaCorto, nombreDia, abrirHoja, cerrarHoja, confirmar, aviso, uid, fechaLarga, claveFecha } from '../util.js';
import { icono } from '../iconos.js';
import { FASES, FASE } from '../datos/programa.js';
import { GUIA } from '../datos/guia.js';
import { objetivos, edad, siguienteRutina } from '../calc.js';
import { sincronizarResumen } from '../resumen.js';
import * as nativo from '../nativo.js';

// ---------- Menú ----------
function renderMas() {
  const filas = [
    ['agenda', 'calendario', 'Agenda', 'Tareas, exámenes, entregas y servicio social'],
    ['alarmas', 'alarma', 'Alarma de gym', 'Se apaga dejando presionado 10 segundos'],
    ['camino', 'disco', 'Camino de principiante a pro', 'Tus fases y lo que falta para subir'],
    ['ejercicios', 'pesa', 'Ejercicios', 'Fotos del movimiento y técnica'],
    ['plan', 'plan', 'Plan de comida de la semana', 'Menús con comida de Guasave'],
    ['super', 'carrito', 'Lista del súper', 'Lo que cuesta en Bodega, Walmart, Ley, Oxxo y Similares'],
    ['precios', 'etiqueta', 'Precios', 'Corrige los precios de tu tienda'],
    ['aprende', 'libro', 'Aprende', 'Calorías, proteína, técnica y suplementos'],
    ['ajustes', 'usuario', 'Perfil y ajustes', 'Peso meta, días de gym, respaldo'],
  ];
  return `<header class="cabeza"><h1 class="cabeza-titulo">Más</h1></header>
    <ul class="lista">${filas
      .map(([r, ic, t, s]) => `<a class="fila" href="#/${r}" style="color:inherit;text-decoration:none"><span style="color:var(--olivo)">${icono(ic)}</span><span class="fila-cuerpo"><span class="fila-titulo">${esc(t)}</span><span class="fila-sub" style="display:block">${esc(s)}</span></span>${icono('flecha', 'flecha')}</a>`)
      .join('')}</ul>
    <p class="tenue mini" style="margin-top:20px">Versión ${esc(nativo.version())}, ${esc(nativo.origen())}.</p>`;
}

// ---------- Alarmas ----------
function leerAlarmas() {
  const d = nativo.alarmas.leer();
  return { lista: (d && d.alarmas) || [], proxima: (d && d.proxima) || 0 };
}

function textoDias(dias) {
  if (!dias || !dias.length) return 'Una sola vez';
  const s = [...dias].sort();
  if (s.length === 7) return 'Todos los días';
  if (s.join() === '1,2,3,4,5') return 'Lunes a viernes';
  return s.map((d) => diaCorto(d)).join(', ');
}

function filaPermiso(id, ok, titulo, texto, boton = 'Activar') {
  return `<li class="fila"><span class="fila-cuerpo"><span class="fila-titulo">${esc(titulo)}</span><span class="fila-sub" style="display:block">${esc(texto)}</span></span>${ok ? `<span class="permiso-ok">${icono('check')}</span>` : `<button class="boton chico secundario" data-a="ala:permiso" data-v="${id}">${esc(boton)}</button>`}</li>`;
}

// Lo que le falta a la alarma para que salga su pantalla o la ventana emergente (también lo usa Hoy)
export function faltanParaLaAlarma(per) {
  if (!per) return [];
  const f = [];
  if (per.notificaciones === false) f.push('notificaciones');
  if (per.ventanas === false) f.push('ventana emergente');
  if (per.pantallaCompleta === false) f.push('pantalla completa');
  if (per.xiaomiBloqueo === false) f.push('mostrar en pantalla de bloqueo');
  if (per.xiaomiSegundoPlano === false) f.push('ventanas emergentes en segundo plano');
  return f;
}

function renderAlarmas() {
  if (!nativo.enApp()) {
    return `<header class="cabeza"><span class="cabeza-fecha"><a href="#/mas">Más</a></span><h1 class="cabeza-titulo">Alarma de gym</h1></header>
      <div class="aviso-caja">La alarma solo funciona en la app de Android (aquí estás en el navegador). Instala el APK para usarla.</div>`;
  }
  const { lista, proxima } = leerAlarmas();
  const per = nativo.permisos.estado() || {};
  const prox = proxima ? new Date(proxima) : null;
  return `<header class="cabeza"><span class="cabeza-fecha"><a href="#/mas">Más</a></span><h1 class="cabeza-titulo">Alarma de gym</h1></header>
    <p class="tenue">Para apagarla tienes que dejar presionado el botón 10 segundos. Si lo sueltas antes, vuelve a empezar.</p>
    ${prox ? `<div class="aviso-caja olivo">Siguiente alarma: ${esc(fechaLarga(claveFecha(prox)))} a las ${String(prox.getHours()).padStart(2, '0')}:${String(prox.getMinutes()).padStart(2, '0')}.</div>` : '<div class="aviso-caja">No hay alarmas activas.</div>'}
    <ul class="lista">${lista
      .map((a) => `<li class="fila"><button data-a="ala:editar" data-id="${esc(a.id)}" style="background:none;border:0;padding:0;text-align:left;flex:1;cursor:pointer;color:inherit">
          <span class="numero" style="font-size:40px;line-height:1;${a.activa ? '' : 'color:var(--ceniza)'}">${esc(a.hora)}</span>
          <span class="fila-sub" style="display:block">${esc(a.etiqueta || 'Alarma')}, ${esc(textoDias(a.dias))}</span></button>
        <label class="interruptor" aria-label="Activar alarma"><input type="checkbox" data-c="ala:activa" data-id="${esc(a.id)}" ${a.activa ? 'checked' : ''}><span></span></label></li>`)
      .join('') || '<p class="vacio">Sin alarmas todavía.</p>'}</ul>
    <div class="pila-botones">
      <button class="boton primario" data-a="ala:nueva">${icono('sumar')} Agregar alarma</button>
      <button class="boton secundario" data-a="ala:probar">Probar: sonará en 10 segundos</button>
    </div>
    <h2 class="seccion">Tono</h2>
    <div class="cabeza-fila"><span class="tenue">${esc(nativo.alarmas.tono())}</span><button class="enlace" data-a="ala:tono">Cambiar</button></div>
    <h2 class="seccion">Para que no falle</h2>
    <p class="tenue chico">Cuando suena, sale la pantalla de la alarma con el disco de 10 segundos. Si Android no la deja salir, sale una ventana emergente encima de todo, y al prender o desbloquear el teléfono la vuelve a sacar: así sabes qué está sonando. Activa todo esto una vez y luego dale a "Probar" con el teléfono bloqueado.</p>
    <ul class="lista">
      ${filaPermiso('notificaciones', per.notificaciones, 'Notificaciones', 'Sin esto la alarma no puede mostrarse.')}
      ${filaPermiso('ventanas', per.ventanas, 'Ventana emergente', per.xiaomi ? 'En la pantalla que se abre activa "Mostrar ventanas emergentes", "Mostrar ventanas emergentes mientras se ejecuta en segundo plano" y "Mostrar en pantalla de bloqueo".' : 'Para que la alarma salga encima de cualquier app.')}
      ${per.xiaomi && 'xiaomiSegundoPlano' in per ? filaPermiso('ventanas', per.xiaomiSegundoPlano, 'Xiaomi: ventanas emergentes en segundo plano', 'Para que se abra la pantalla de la alarma aunque no estés en la app.') : ''}
      ${per.xiaomi && 'xiaomiBloqueo' in per ? filaPermiso('ventanas', per.xiaomiBloqueo, 'Xiaomi: mostrar en pantalla de bloqueo', 'Para que salga aunque el teléfono esté bloqueado.') : ''}
      ${filaPermiso('pantallaCompleta', per.pantallaCompleta, 'Pantalla completa', 'Para que aparezca aunque el teléfono esté bloqueado.')}
      ${filaPermiso('alarmasExactas', per.alarmasExactas, 'Alarmas exactas', 'Para que suene a la hora en punto.')}
      ${filaPermiso('bateria', per.bateria, 'Sin límite de batería', 'Que Android no la duerma en la noche.')}
      ${per.xiaomi ? filaPermiso('xiaomi', false, 'Xiaomi: inicio automático', 'En la pantalla que se abre activa "Inicio automático" (si ya está, no le muevas).', 'Revisar') : ''}
    </ul>`;
}

function hojaAlarma(a) {
  const nueva = !a;
  a = a || { id: uid(), hora: estado.config.horaAlarma || '05:00', dias: [1, 2, 3, 4, 5], etiqueta: 'Gym', activa: true };
  let dias = [...(a.dias || [])];
  const panel = abrirHoja(`<h2 class="hoja-titulo">${nueva ? 'Nueva alarma' : 'Editar alarma'}</h2>
    <label class="campo"><span>Hora</span><input type="time" id="aHora" value="${esc(a.hora)}" style="font-size:28px;height:64px;font-family:var(--display)"></label>
    <span class="campo-etiqueta">Días (sin días = solo una vez)</span>
    <div class="chips dias" id="aDias">${[1, 2, 3, 4, 5, 6, 7].map((d) => `<button type="button" class="chip ${dias.includes(d) ? 'activo' : ''}" data-d="${d}">${diaCorto(d)}</button>`).join('')}</div>
    <label class="campo"><span>Nombre</span><input id="aEtiqueta" value="${esc(a.etiqueta || '')}" placeholder="Gym"></label>
    <div class="pila-botones"><button class="boton primario" id="aOk">Guardar</button>${nueva ? '' : '<button class="boton peligro" id="aBorrar">Borrar alarma</button>'}</div>`);
  panel.querySelectorAll('#aDias .chip').forEach((c) => {
    c.onclick = () => {
      const d = Number(c.dataset.d);
      dias = dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d];
      c.classList.toggle('activo');
    };
  });
  panel.querySelector('#aOk').onclick = () => {
    const hora = panel.querySelector('#aHora').value || '05:00';
    const { lista } = leerAlarmas();
    const nuevaA = { ...a, hora, dias: dias.sort(), etiqueta: panel.querySelector('#aEtiqueta').value.trim() || 'Alarma', activa: true };
    const otras = lista.filter((x) => x.id !== a.id);
    guardarAlarmas([...otras, nuevaA]);
    if (a.id === 'gym' || lista.length <= 1) {
      estado.config.horaAlarma = hora;
      marcar('config');
    }
    cerrarHoja();
  };
  const borrar = panel.querySelector('#aBorrar');
  if (borrar) {
    borrar.onclick = () => {
      guardarAlarmas(leerAlarmas().lista.filter((x) => x.id !== a.id));
      cerrarHoja();
    };
  }
}

function guardarAlarmas(lista) {
  const r = nativo.alarmas.guardar(lista);
  if (r && r.error) aviso(r.error);
  else aviso('Alarma guardada.');
  refrescar();
}

// ---------- Ajustes ----------
function renderAjustes() {
  const p = estado.perfil;
  const c = estado.config;
  const o = objetivos();
  const f = FASE[c.fase];
  const dias = c.dias[c.fase] || f.diasDefault;
  const checks = c.checklist || [];
  const CHECK_NOMBRES = [['creatina', 'Creatina'], ['pasos', 'Pasos'], ['proteina', 'Proteína'], ['sueno', 'Dormir 7 h'], ['plantas', 'Regar plantas'], ['guitarra', 'Guitarra'], ['cardio', 'Cardio']];
  const r = c.resumen || { activo: true, hora: '05:00' };
  return `<header class="cabeza"><span class="cabeza-fecha"><a href="#/mas">Más</a></span><h1 class="cabeza-titulo">Perfil y ajustes</h1></header>
    <h2 class="seccion">Tú</h2>
    <label class="campo"><span>Nombre</span><input data-c="aj:perfil" data-k="nombre" value="${esc(p.nombre)}"></label>
    <div class="dos-columnas">
      <label class="campo"><span>Estatura (cm)</span><input data-c="aj:perfil" data-k="estatura" data-num="1" inputmode="numeric" value="${esc(p.estatura)}"></label>
      <label class="campo"><span>Peso meta (kg)</span><input data-c="aj:perfil" data-k="meta" data-num="1" inputmode="decimal" value="${esc(p.meta)}"></label>
    </div>
    <label class="campo"><span>Fecha de nacimiento (${edad()} años)</span><input type="date" data-c="aj:perfil" data-k="nacimiento" value="${esc(p.nacimiento)}" max="${hoy()}"></label>
    <label class="campo"><span>Ritmo para bajar</span><select data-c="aj:perfil" data-k="ritmo">${[['suave', 'Tranquilo (~0.4 kg por semana)'], ['normal', 'Normal (~0.6 kg por semana)'], ['rapido', 'Rápido (~0.8 kg por semana)']].map(([v, t]) => `<option value="${v}" ${p.ritmo === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="campo"><span>Actividad</span><select data-c="aj:perfil" data-k="actividad" data-num="1">${[[1.3, 'Poco movimiento'], [1.45, 'Moderado (gym 3 días y trabajo de pie)'], [1.6, 'Activo (gym 4–5 días)'], [1.75, 'Muy activo']].map(([v, t]) => `<option value="${v}" ${Number(p.actividad) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <div class="panel"><b>${o.kcal.toLocaleString('es-MX')} kcal</b> <span class="tenue">al día: ${o.p} g proteína, ${o.c} g carbos, ${o.g} g grasa. Gastas unas ${o.tdee.toLocaleString('es-MX')} kcal.</span>
      ${p.kcalAjuste ? `<br><span class="tenue chico">Incluye un ajuste de ${p.kcalAjuste > 0 ? '+' : ''}${p.kcalAjuste} kcal.</span> <button class="enlace" data-a="aj:quitarAjuste">Quitar ajuste</button>` : ''}</div>

    <h2 class="seccion">Entreno</h2>
    <label class="campo"><span>Fase actual</span><select data-c="aj:fase">${FASES.map((x) => `<option value="${x.id}" ${x.id === c.fase ? 'selected' : ''}>Fase ${x.num}: ${x.nombre}</option>`).join('')}</select></label>
    <span class="campo-etiqueta">Días de gym en esta fase (${f.dias} recomendados)</span>
    <div class="chips dias">${[1, 2, 3, 4, 5, 6, 7].map((d) => `<button class="chip ${dias.includes(d) ? 'activo' : ''}" data-a="aj:dia" data-v="${d}">${diaCorto(d)}</button>`).join('')}</div>
    <div class="fila" style="margin-top:8px"><span class="fila-cuerpo"><span class="fila-titulo">Pitido al terminar el descanso</span></span><label class="interruptor"><input type="checkbox" data-c="aj:sonido" ${c.sonidoDescanso !== false ? 'checked' : ''}><span></span></label></div>

    <h2 class="seccion">Horario</h2>
    <p class="tenue chico">El recomendado: te levantas a las 5, desayunas antes del gym, entrenas de 7:45 a 10, comes después de bañarte y entras a la escuela a las 12. Sale en Hoy, en Comida y en tu resumen. La hora de despertar es la de tu alarma.</p>
    <div class="dos-columnas">${[['desayuno', 'Desayuno'], ['gym', 'Gym'], ['comida', 'Comida'], ['escuela', 'Entras a la escuela'], ['salida', 'Sales de la escuela'], ['colacion', 'Colación'], ['cena', 'Cena'], ['dormir', 'Dormir']]
      .map(([k, n]) => `<label class="campo"><span>${n}</span><input type="time" data-c="aj:horario" data-k="${k}" value="${esc(horario()[k])}"></label>`)
      .join('')}</div>
    <button class="enlace" data-a="aj:horarioReset">Volver al horario recomendado</button>

    <h2 class="seccion">Resumen de la mañana</h2>
    <p class="tenue chico">Una notificación con lo del día: qué toca en el gym y con cuánto peso, escuela, lo que viene en tu agenda, el reporte del servicio social y tus pendientes. ${nativo.enApp() ? '' : 'Solo funciona en la app de Android.'}</p>
    <div class="fila"><span class="fila-cuerpo"><span class="fila-titulo">Mandarme el resumen</span></span><label class="interruptor"><input type="checkbox" data-c="aj:resumen" ${r.activo !== false ? 'checked' : ''}><span></span></label></div>
    <label class="campo"><span>A qué hora</span><input type="time" data-c="aj:resumenHora" value="${esc(r.hora || '05:00')}"></label>
    ${nativo.enApp() ? '<button class="boton secundario chico" data-a="aj:resumenProbar">Ver cómo llega</button>' : ''}

    <h2 class="seccion">Pendientes del día</h2>
    <div class="chips">${CHECK_NOMBRES.map(([k, n]) => `<button class="chip ${checks.includes(k) ? 'activo' : ''}" data-a="aj:check" data-v="${k}">${n}</button>`).join('')}</div>
    <label class="campo"><span>Meta de agua (vasos de 250 ml)</span><input data-c="aj:agua" inputmode="numeric" value="${c.aguaMeta || 12}"></label>

    <h2 class="seccion">IA de la cámara</h2>
    <p class="tenue chico">La foto del plato se revisa en tu Worker de Cloudflare. ${nativo.enApp() && nativo.origen() === 'local' ? 'Ahora la app usa su copia interna; la IA se conecta a la dirección del Worker.' : ''}</p>
    <label class="campo"><span>Dirección del Worker (vacío = la de siempre)</span><input data-c="aj:api" value="${esc(c.apiBase || '')}" placeholder="https://gymori.tu-cuenta.workers.dev" inputmode="url"></label>
    <button class="boton secundario chico" data-a="aj:probarApi">Probar conexión</button> <span id="apiEstado" class="tenue chico"></span>

    <h2 class="seccion">Respaldo</h2>
    <p class="tenue chico">Tus datos viven en el teléfono. Haz un respaldo de vez en cuando; si cambias de celular, lo importas.</p>
    <div class="pila-botones">
      <button class="boton secundario" data-a="aj:exportar">${icono('respaldo')} Guardar respaldo</button>
      <label class="boton secundario">Importar respaldo<input type="file" accept="application/json,.json" data-c="aj:importar" hidden></label>
      <button class="boton peligro" data-a="aj:borrar">Borrar todos mis datos</button>
    </div>

    <h2 class="seccion">Créditos</h2>
    <p class="tenue chico">Fotos de ejercicios: Free Exercise DB (dominio público). Letra Barlow (SIL Open Font License). Lector de códigos: ZXing (Apache 2.0). Datos de productos: Open Food Facts (ODbL). Precios: tiendas en línea de Walmart, Bodega Aurrera y Farmacias Similares, folletos de Casa Ley en Sinaloa y Oxxo en Rappi, noviembre 2026.</p>`;
}

// ---------- Aprende ----------
function renderAprende() {
  return `<header class="cabeza"><span class="cabeza-fecha"><a href="#/mas">Más</a></span><h1 class="cabeza-titulo">Aprende</h1></header>
    ${GUIA.map((g) => `<details class="acordeon"><summary>${esc(g.titulo)}</summary><div class="contenido">${g.texto.map((t) => `<p>${esc(t)}</p>`).join('')}</div></details>`).join('')}
    <p class="tenue mini" style="margin-top:16px">Esto es información general, no consejo médico. Si tienes alguna condición de salud, consulta a un médico.</p>`;
}

registrar({
  'ala:nueva': () => hojaAlarma(null),
  'ala:editar': (el) => hojaAlarma(leerAlarmas().lista.find((x) => x.id === el.dataset.id)),
  'ala:activa': (el) => {
    const lista = leerAlarmas().lista.map((x) => (x.id === el.dataset.id ? { ...x, activa: el.checked } : x));
    guardarAlarmas(lista);
  },
  'ala:probar': () => {
    nativo.alarmas.mensaje(`Siguiente: ${siguienteRutina().nombre}`);
    const r = nativo.alarmas.probar(10);
    aviso(r && r.error ? r.error : 'Bloquea el teléfono: en 10 segundos suena.');
  },
  'ala:tono': () => nativo.alarmas.elegirTono(),
  'ala:permiso': (el) => nativo.permisos.pedir(el.dataset.v),
  'aj:perfil': (el) => {
    let v = el.value;
    if (el.dataset.num) {
      v = parseFloat(String(v).replace(',', '.'));
      if (!Number.isFinite(v)) return aviso('Escribe un número.');
    }
    estado.perfil[el.dataset.k] = v;
    marcar('perfil');
    refrescar();
  },
  'aj:quitarAjuste': () => {
    estado.perfil.kcalAjuste = 0;
    marcar('perfil');
    refrescar();
  },
  'aj:fase': (el) => {
    const id = el.value;
    estado.config.fase = id;
    estado.config.faseInicio = hoy();
    marcar('config');
    aviso(`Ahora estás en la fase ${FASE[id].num}.`);
    refrescar();
  },
  'aj:dia': (el) => {
    const c = estado.config;
    const d = Number(el.dataset.v);
    const actuales = c.dias[c.fase] || FASE[c.fase].diasDefault;
    const nuevos = actuales.includes(d) ? actuales.filter((x) => x !== d) : [...actuales, d].sort();
    if (nuevos.length < 1) return;
    c.dias[c.fase] = nuevos;
    marcar('config');
    refrescar();
  },
  'aj:horario': (el) => {
    if (!/^\d{2}:\d{2}$/.test(el.value)) return;
    estado.config.horario = { ...horario(), [el.dataset.k]: el.value };
    marcar('config');
    aviso('Horario guardado.');
  },
  'aj:resumen': (el) => {
    estado.config.resumen = { ...(estado.config.resumen || { hora: '05:00' }), activo: el.checked };
    marcar('config');
    aviso(el.checked ? 'Te llega cada mañana.' : 'Resumen apagado.');
  },
  'aj:resumenHora': (el) => {
    if (!/^\d{2}:\d{2}$/.test(el.value)) return;
    estado.config.resumen = { ...(estado.config.resumen || { activo: true }), hora: el.value };
    marcar('config');
    aviso('Hora del resumen guardada.');
  },
  'aj:resumenProbar': () => {
    sincronizarResumen(true);
    const res = nativo.resumen.probar();
    aviso(res && res.ok ? 'Revisa tus notificaciones.' : 'No pude mandar la notificación. Revisa el permiso de notificaciones.');
  },
  'aj:horarioReset': () => {
    estado.config.horario = { ...HORARIO_RECOMENDADO };
    marcar('config');
    aviso('Listo: horario recomendado.');
    refrescar();
  },
  'aj:sonido': (el) => {
    estado.config.sonidoDescanso = el.checked;
    marcar('config');
  },
  'aj:check': (el) => {
    const c = estado.config;
    const k = el.dataset.v;
    c.checklist = (c.checklist || []).includes(k) ? c.checklist.filter((x) => x !== k) : [...(c.checklist || []), k];
    marcar('config');
    refrescar();
  },
  'aj:agua': (el) => {
    const v = parseInt(el.value, 10);
    if (v >= 4 && v <= 24) {
      estado.config.aguaMeta = v;
      marcar('config');
    }
  },
  'aj:api': (el) => {
    estado.config.apiBase = el.value.trim();
    marcar('config');
    aviso('Dirección guardada.');
  },
  'aj:probarApi': async () => {
    const out = document.getElementById('apiEstado');
    out.textContent = 'Probando…';
    try {
      const r = await fetch(`${nativo.baseApi(estado.config)}/api/estado`, { cache: 'no-store' });
      const d = await r.json();
      out.textContent = r.ok ? `Conectado. IA: ${d.ia === 'claude' ? 'Claude' : 'Workers AI (gratis)'}.` : `Error ${r.status}.`;
    } catch {
      out.textContent = 'No responde. ¿Ya publicaste el Worker en Cloudflare?';
    }
  },
  'aj:exportar': () => {
    const nombre = `gym-respaldo-${hoy()}.json`;
    aviso(nativo.exportar(nombre, exportarTodo()));
  },
  'aj:importar': (el) => {
    const f = el.files && el.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        importarTodo(String(r.result));
        aviso('Respaldo importado.');
        ir('hoy');
      } catch (err) {
        aviso(err.message || 'No pude leer ese archivo.');
      }
    };
    r.readAsText(f);
  },
  'aj:borrar': () =>
    confirmar('¿Borrar todo?', 'Se borra tu perfil, entrenos, comidas y pesos de este teléfono. No se puede deshacer.', [
      {
        texto: 'Sí, borrar todo', clase: 'peligro',
        hacer: () => {
          borrarTodo();
          guardarYa();
          location.hash = '#/hoy';
          location.reload();
        },
      },
      { texto: 'Cancelar', clase: 'secundario' },
    ]),
});

export const vistaMas = { tab: 'mas', render: renderMas };
export const vistaAlarmas = { tab: 'mas', render: renderAlarmas };
export const vistaAjustes = { tab: 'mas', render: renderAjustes };
export const vistaAprende = { tab: 'mas', render: renderAprende };
