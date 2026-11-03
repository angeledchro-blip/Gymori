// Puente con la app de Android (window.GymNativo). En el navegador todo tiene un plan B.

const N = () => (typeof window !== 'undefined' && window.GymNativo) || null;

export const enApp = () => !!N();

function llamar(metodo, ...args) {
  const n = N();
  if (!n || typeof n[metodo] !== 'function') return null;
  try {
    return n[metodo](...args);
  } catch (err) {
    console.warn('GymNativo.' + metodo, err);
    return null;
  }
}

function json(texto, defecto) {
  if (!texto) return defecto;
  try {
    return JSON.parse(texto);
  } catch {
    return defecto;
  }
}

// ---------- Datos ----------
export const datos = {
  leer(clave) {
    if (enApp()) return llamar('leer', clave);
    try {
      return localStorage.getItem('gym:' + clave);
    } catch {
      return null;
    }
  },
  guardar(clave, valor) {
    if (enApp()) return llamar('guardar', clave, valor) !== false;
    try {
      localStorage.setItem('gym:' + clave, valor);
      return true;
    } catch {
      return false;
    }
  },
  borrar(clave) {
    if (enApp()) return llamar('borrar', clave);
    try {
      localStorage.removeItem('gym:' + clave);
    } catch {
      /* nada */
    }
  },
};

// ---------- Alarmas ----------
export const alarmas = {
  leer: () => json(llamar('alarmasLeer'), null),
  guardar: (lista) => json(llamar('alarmasGuardar', JSON.stringify(lista)), null),
  probar: (seg = 10) => json(llamar('alarmaProbar', seg), null),
  mensaje: (texto) => llamar('mensajeAlarma', String(texto || '')),
  elegirTono: () => llamar('elegirTono'),
  tono: () => llamar('tonoActual') || 'Tono de alarma del teléfono',
};

// Resumen del día (notificación de las 5 am): { activo, hora, dias: { 'AAAA-MM-DD': { titulo, texto } } }
export const resumen = {
  guardar: (datosJson) => json(llamar('resumenGuardar', datosJson), null),
  probar: () => json(llamar('resumenProbar'), null),
};

export const permisos = {
  estado: () => json(llamar('permisos'), null),
  pedir: (tipo) => llamar('pedirPermiso', tipo),
};

// ---------- Varios ----------
export function vibrar(ms = 300) {
  if (enApp()) return llamar('vibrar', ms);
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* nada */
  }
}

export const pantallaEncendida = (si) => llamar('pantallaEncendida', !!si);

export function abrirUrl(url) {
  if (enApp()) return llamar('abrirUrl', url);
  window.open(url, '_blank', 'noopener');
}

export function exportar(nombre, contenido) {
  if (enApp()) return llamar('exportar', nombre, contenido) || 'No se pudo guardar el archivo.';
  const blob = new Blob([contenido], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
  return 'Respaldo descargado.';
}

export const version = () => llamar('version') || 'web';
export const origen = () => llamar('origen') || 'navegador';

// Dirección del Worker de Cloudflare para la IA. Si la página ya viene del Worker, es la misma.
export function baseApi(config) {
  const propia = (config && config.apiBase) || '';
  if (propia) return propia.replace(/\/+$/, '');
  if (enApp() && origen() === 'local') {
    return String(llamar('urlRemota') || '').replace(/\/+$/, '');
  }
  return '';
}

export function eventosPendientes() {
  return json(llamar('consumirEventos'), []);
}
