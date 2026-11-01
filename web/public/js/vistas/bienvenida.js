// Primera vez: datos básicos, meta y días de gym.
import { estado, marcar, guardarYa } from '../store.js';
import { registrar, refrescar, ir } from '../nucleo.js';
import { esc, hoy, diaCorto, aviso } from '../util.js';
import { objetivos } from '../calc.js';
import { FASES } from '../datos/programa.js';
import * as nativo from '../nativo.js';

let paso = 0;
const b = {
  nombre: '', sexo: 'h', edad: '', nacimiento: '', estatura: '', peso: '', meta: '75', ritmo: 'normal', actividad: 1.45,
  dias: [1, 3, 5], hora: '05:00', fase: 'f1',
};

const ACTIVIDAD = [
  [1.3, 'Poco movimiento', 'Escuela o trabajo sentado y casi no caminas.'],
  [1.45, 'Moderado', 'Gym 3 días y un trabajo de pie (como el Oxxo).'],
  [1.6, 'Activo', 'Gym 4 a 5 días y caminas bastante.'],
  [1.75, 'Muy activo', 'Gym casi diario y trabajo físico.'],
];
const RITMOS = [
  ['suave', 'Tranquilo', 'Bajas más o menos 0.4 kg por semana.'],
  ['normal', 'Normal', 'Más o menos 0.6 kg por semana. El recomendado.'],
  ['rapido', 'Rápido', 'Más o menos 0.8 kg por semana; cuesta más.'],
];
const TOTAL = 5;

function puntos() {
  return `<div class="pasos-onb">${Array.from({ length: TOTAL }, (_, i) => `<i class="${i < paso ? 'si' : ''}"></i>`).join('')}</div>`;
}

function pasoHtml() {
  if (paso === 0) {
    return `<div class="cuerpo">
      <div class="marca">Gymori</div>
      <p class="tenue" style="font-size:19px;margin-top:14px">Tu rutina del día, lo que vas a comer con precios de Guasave y una alarma que no se apaga hasta que de verdad te levantas.</p>
      <p class="tenue">Te hago unas preguntas rápidas para calcular tus calorías y tu plan. Todo se queda en tu teléfono.</p>
    </div>
    <button class="boton primario ancho" data-a="onb:sig">Empezar</button>`;
  }
  if (paso === 1) {
    return `<div class="cuerpo">${puntos()}
      <h1 class="cabeza-titulo">¿Cómo te llamo?</h1>
      <label class="campo"><span>Tu nombre o apodo</span><input data-campo="nombre" value="${esc(b.nombre)}" autocomplete="nickname" placeholder="Nombre" /></label>
      <span class="campo-etiqueta">Sexo (para calcular tus calorías)</span>
      <div class="chips">
        <button class="chip ${b.sexo === 'h' ? 'activo' : ''}" data-a="onb:sexo" data-v="h">Hombre</button>
        <button class="chip ${b.sexo === 'm' ? 'activo' : ''}" data-a="onb:sexo" data-v="m">Mujer</button>
      </div>
    </div>
    <div class="fila-botones"><button class="boton secundario" data-a="onb:ant">Atrás</button><button class="boton primario" data-a="onb:sig">Siguiente</button></div>`;
  }
  if (paso === 2) {
    return `<div class="cuerpo">${puntos()}
      <h1 class="cabeza-titulo">Tus medidas</h1>
      <p class="tenue">Pésate en la mañana, después de ir al baño y antes de desayunar.</p>
      <div class="dos-columnas">
        <label class="campo"><span>Peso actual (kg)</span><input data-campo="peso" inputmode="decimal" value="${esc(b.peso)}" placeholder="85.0" /></label>
        <label class="campo"><span>Estatura (cm)</span><input data-campo="estatura" inputmode="numeric" value="${esc(b.estatura)}" placeholder="172" /></label>
      </div>
      <label class="campo"><span>Fecha de nacimiento</span><input type="date" data-campo="nacimiento" value="${esc(b.nacimiento)}" max="${hoy()}" /></label>
    </div>
    <div class="fila-botones"><button class="boton secundario" data-a="onb:ant">Atrás</button><button class="boton primario" data-a="onb:sig">Siguiente</button></div>`;
  }
  if (paso === 3) {
    return `<div class="cuerpo">${puntos()}
      <h1 class="cabeza-titulo">Tu meta</h1>
      <label class="campo"><span>Peso meta (kg)</span><input data-campo="meta" inputmode="decimal" value="${esc(b.meta)}" /></label>
      <span class="campo-etiqueta">¿Qué tan rápido?</span>
      <div class="opciones">${RITMOS.map(([v, t, d]) => `<button class="opcion ${b.ritmo === v ? 'activa' : ''}" data-a="onb:ritmo" data-v="${v}"><b>${t}</b><span>${d}</span></button>`).join('')}</div>
      <span class="campo-etiqueta" style="margin-top:16px">Tu actividad en la semana</span>
      <div class="opciones">${ACTIVIDAD.map(([v, t, d]) => `<button class="opcion ${b.actividad === v ? 'activa' : ''}" data-a="onb:act" data-v="${v}"><b>${t}</b><span>${d}</span></button>`).join('')}</div>
    </div>
    <div class="fila-botones"><button class="boton secundario" data-a="onb:ant">Atrás</button><button class="boton primario" data-a="onb:sig">Siguiente</button></div>`;
  }
  if (paso === 4) {
    return `<div class="cuerpo">${puntos()}
      <h1 class="cabeza-titulo">Tu semana de gym</h1>
      <span class="campo-etiqueta">¿Qué días vas? (para empezar, 3 días)</span>
      <div class="chips dias">${[1, 2, 3, 4, 5, 6, 7].map((d) => `<button class="chip ${b.dias.includes(d) ? 'activo' : ''}" data-a="onb:dia" data-v="${d}">${diaCorto(d)}</button>`).join('')}</div>
      <label class="campo"><span>Hora de la alarma esos días</span><input type="time" data-campo="hora" value="${esc(b.hora)}" /></label>
      <span class="campo-etiqueta">¿Dónde empiezas?</span>
      <div class="opciones">
        ${FASES.slice(0, 2)
          .map((f) => `<button class="opcion ${b.fase === f.id ? 'activa' : ''}" data-a="onb:fase" data-v="${f.id}"><b>Fase ${f.num}: ${f.nombre}</b><span>${f.id === 'f1' ? 'Si tienes un buen rato sin entrenar. Recomendado.' : 'Si entrenaste seguido en los últimos 2 meses.'}</span></button>`)
          .join('')}
      </div>
    </div>
    <div class="fila-botones"><button class="boton secundario" data-a="onb:ant">Atrás</button><button class="boton primario" data-a="onb:sig">Ver mi plan</button></div>`;
  }
  // Resumen
  aplicar(false);
  const o = objetivos();
  return `<div class="cuerpo">${puntos()}
    <h1 class="cabeza-titulo">Tu plan${b.nombre ? ', ' + esc(b.nombre) : ''}</h1>
    <div class="cifras" style="grid-template-columns:1fr 1fr">
      <div class="cifra"><span class="numero">${o.kcal.toLocaleString('es-MX')}</span><small>kcal al día</small></div>
      <div class="cifra"><span class="numero">${o.p} g</span><small>de proteína</small></div>
      <div class="cifra"><span class="numero">${o.c} g</span><small>de carbohidratos</small></div>
      <div class="cifra"><span class="numero">${o.g} g</span><small>de grasa</small></div>
    </div>
    <p class="tenue">Gastas unas ${o.tdee.toLocaleString('es-MX')} kcal al día; comiendo ${o.kcal.toLocaleString('es-MX')} bajarías alrededor de ${Math.abs(o.esperado).toFixed(1)} kg por semana. La app lo ajusta según cómo vayas.</p>
    <p class="tenue">Empiezas en la fase ${b.fase === 'f1' ? '1 (Regreso)' : '2 (Principiante)'} con ${b.dias.length} días de gym.</p>
  </div>
  <div class="fila-botones"><button class="boton secundario" data-a="onb:ant">Atrás</button><button class="boton primario" data-a="onb:fin">Empezar</button></div>`;
}

function leerCampos() {
  document.querySelectorAll('[data-campo]').forEach((el) => {
    b[el.dataset.campo] = el.value.trim();
  });
}

function numero(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function validar() {
  if (paso === 2) {
    const p = numero(b.peso);
    const e = numero(b.estatura);
    if (!p || p < 35 || p > 250) return 'Escribe tu peso en kilos (por ejemplo 86.5).';
    if (!e || e < 120 || e > 230) return 'Escribe tu estatura en centímetros (por ejemplo 172).';
    if (!b.nacimiento) return 'Pon tu fecha de nacimiento.';
  }
  if (paso === 3) {
    const m = numero(b.meta);
    if (!m || m < 35 || m > 200) return 'Escribe tu peso meta en kilos.';
  }
  if (paso === 4 && b.dias.length < 2) return 'Escoge al menos 2 días.';
  return null;
}

// Pasa el borrador al estado (al final se guarda)
function aplicar(guardar) {
  const p = estado.perfil;
  p.nombre = b.nombre;
  p.sexo = b.sexo;
  p.nacimiento = b.nacimiento;
  p.estatura = numero(b.estatura) || p.estatura;
  p.pesoInicial = numero(b.peso) || p.pesoInicial;
  p.meta = numero(b.meta) || p.meta;
  p.ritmo = b.ritmo;
  p.actividad = b.actividad;
  if (guardar) {
    const c = estado.config;
    c.fase = b.fase;
    c.faseInicio = hoy();
    c.dias[b.fase] = [...b.dias].sort();
    if (b.fase === 'f1') c.dias.f2 = [...b.dias].sort();
    c.horaAlarma = b.hora || '05:00';
    c.onboarding = true;
    const peso = numero(b.peso);
    if (peso) {
      estado.peso.registros = estado.peso.registros.filter((r) => r.fecha !== hoy());
      estado.peso.registros.push({ fecha: hoy(), kg: peso });
    }
    marcar('perfil', 'config', 'peso');
    guardarYa();
  }
}

registrar({
  'onb:sig': () => {
    leerCampos();
    const error = validar();
    if (error) return aviso(error);
    paso = Math.min(TOTAL, paso + 1);
    refrescar();
  },
  'onb:ant': () => {
    leerCampos();
    paso = Math.max(0, paso - 1);
    refrescar();
  },
  'onb:sexo': (el) => {
    leerCampos();
    b.sexo = el.dataset.v;
    refrescar();
  },
  'onb:ritmo': (el) => {
    leerCampos();
    b.ritmo = el.dataset.v;
    refrescar();
  },
  'onb:act': (el) => {
    leerCampos();
    b.actividad = Number(el.dataset.v);
    refrescar();
  },
  'onb:dia': (el) => {
    leerCampos();
    const d = Number(el.dataset.v);
    b.dias = b.dias.includes(d) ? b.dias.filter((x) => x !== d) : [...b.dias, d];
    refrescar();
  },
  'onb:fase': (el) => {
    leerCampos();
    b.fase = el.dataset.v;
    refrescar();
  },
  'onb:fin': () => {
    aplicar(true);
    if (nativo.enApp()) {
      nativo.alarmas.guardar([{ id: 'gym', hora: estado.config.horaAlarma, dias: [...b.dias].sort(), etiqueta: 'Gym', activa: true }]);
      nativo.permisos.pedir('notificaciones');
    }
    paso = 0;
    ir('hoy', true);
  },
});

export const bienvenida = {
  sinNav: true,
  render: () => `<div class="bienvenida">${pasoHtml()}</div>`,
};
