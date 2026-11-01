// Genera public/sw.js con la lista de archivos para que la app funcione sin internet en el gym.
// Correr después de cambiar archivos de public/:  node scripts/lista-sw.mjs
// (las pruebas fallan si se te olvida)
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../public/', import.meta.url));

export function listarArchivos() {
  const r = [];
  const recorrer = (dir) => {
    for (const n of readdirSync(dir).sort()) {
      const ruta = join(dir, n);
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else r.push(relative(raiz, ruta).split('\\').join('/'));
    }
  };
  recorrer(raiz);
  return r.filter((f) => f !== 'sw.js' && !f.endsWith('.txt'));
}

export function generar() {
  const archivos = listarArchivos();
  const h = createHash('sha256');
  for (const f of archivos) h.update(f).update(readFileSync(join(raiz, f)));
  const version = h.digest('hex').slice(0, 10);
  return `// Generado por scripts/lista-sw.mjs — no lo edites a mano.
// Guarda la app en el teléfono para que funcione sin señal en el gym.
const VERSION = '${version}';
const CACHE = 'gym-' + VERSION;
const ARCHIVOS = ${JSON.stringify(['./', ...archivos], null, 0).replace(/","/g, '",\n  "').replace('[', '[\n  ').replace(/]$/, ',\n]')};

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('gym-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function conTiempo(promesa, ms) {
  return new Promise((ok, mal) => {
    const t = setTimeout(() => mal(new Error('tiempo')), ms);
    promesa.then((r) => { clearTimeout(t); ok(r); }, (e) => { clearTimeout(t); mal(e); });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  // Fotos, letras y librerías casi no cambian: primero la copia guardada
  if (/^\\/(img|fonts|vendor)\\//.test(url.pathname)) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req)));
    return;
  }
  // Lo demás: primero internet (para tener la versión nueva) y si no hay señal, la copia guardada
  e.respondWith(
    conTiempo(fetch(req), 3500)
      .then((r) => {
        if (r && r.ok) {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return r;
      })
      .catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(join(raiz, 'sw.js'), generar());
  console.log('sw.js actualizado con', listarArchivos().length, 'archivos');
}
