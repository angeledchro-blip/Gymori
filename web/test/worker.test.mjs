// Pruebas del Worker con una IA falsa, D1 simulado sobre node:sqlite y fetch simulado.
// Correr con: node --test test/worker.test.mjs   (desde la carpeta web/)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import worker, { extraerJSON, normalizarAnalisis, normalizarOFF } from '../src/index.js';

function d1Falso() {
  const db = new DatabaseSync(':memory:');
  const preparar = (sql, args = []) => ({
    bind: (...a) => preparar(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => db.prepare(sql).run(...args),
  });
  return { prepare: (sql) => preparar(sql), _db: db };
}

const IMAGEN = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==';
const RESPUESTA = {
  es_comida: true,
  platillo: 'Tacos de asada',
  descripcion: 'Tres tacos con carne asada y cebolla',
  confianza: 'media',
  ingredientes: [
    { nombre: 'tortilla de maíz (3)', gramos: 90, kcal: 192, proteina: 5, carbos: 40, grasa: 2.4 },
    { nombre: 'carne asada', gramos: 120, kcal: 250, proteina: 30, carbos: 0, grasa: 14 },
  ],
  consejo: 'Va bien con tu plan.',
};

const pedir = (env, ruta, cuerpo, metodo) =>
  worker.fetch(
    new Request('https://gym.test' + ruta, cuerpo ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) } : { method: metodo || 'GET' }),
    env,
    { waitUntil() {} }
  );

test('estado dice qué IA está activa', async () => {
  let r = await pedir({ AI: {}, CF_VERSION_METADATA: { id: 'v9' } }, '/api/estado');
  assert.equal(r.status, 200);
  let d = await r.json();
  assert.equal(d.ia, 'workers-ai');
  assert.equal(d.build, 'v9');
  r = await pedir({ AI: {}, ANTHROPIC_API_KEY: 'x' }, '/api/estado');
  d = await r.json();
  assert.equal(d.ia, 'claude');
});

test('responde CORS para la app que corre desde el APK', async () => {
  const r = await pedir({}, '/api/comida/analizar', null, 'OPTIONS');
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
  const r2 = await pedir({ AI: {} }, '/api/estado');
  assert.equal(r2.headers.get('access-control-allow-origin'), '*');
});

test('lo que no es /api/ se sirve de los archivos de la app', async () => {
  let pedido = null;
  const env = { ASSETS: { fetch: async (req) => { pedido = new URL(req.url).pathname; return new Response('hola'); } } };
  const r = await pedir(env, '/index.html');
  assert.equal(await r.text(), 'hola');
  assert.equal(pedido, '/index.html');
});

test('analiza la foto con Workers AI y recalcula los totales', async () => {
  let recibido = null;
  const env = {
    DB: d1Falso(),
    AI: { run: async (modelo, entrada) => { recibido = { modelo, entrada }; return { response: '```json\n' + JSON.stringify({ ...RESPUESTA, total: { kcal: 9999 } }) + '\n```' }; } },
  };
  const r = await pedir(env, '/api/comida/analizar', { imagen: IMAGEN, nota: 'con 3 tortillas', objetivo: { kcal: 2100, proteina: 150 }, tiempo: 'comida' });
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.platillo, 'Tacos de asada');
  assert.equal(d.total.kcal, 442); // suma de ingredientes, no el total inventado
  assert.equal(d.total.proteina, 35);
  assert.equal(d.ingredientes.length, 2);
  assert.match(d.motor, /llama-4-scout/);
  assert.match(recibido.entrada.messages[1].content[0].text, /3 tortillas/);
  assert.match(recibido.entrada.messages[1].content[0].text, /2100 kcal/);
  assert.equal(recibido.entrada.messages[1].content[1].image_url.url, IMAGEN);
});

test('si la IA no manda JSON la primera vez, reintenta', async () => {
  let n = 0;
  const env = { AI: { run: async () => (++n === 1 ? { response: 'Claro, aquí está tu análisis' } : { response: JSON.stringify(RESPUESTA) }) } };
  const r = await pedir(env, '/api/comida/analizar', { imagen: IMAGEN });
  assert.equal(r.status, 200);
  assert.equal(n, 2);
});

test('usa Claude cuando hay ANTHROPIC_API_KEY', async () => {
  const original = globalThis.fetch;
  let llamada = null;
  globalThis.fetch = async (url, init) => {
    llamada = { url: String(url), init };
    return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(RESPUESTA) }] }), { status: 200 });
  };
  try {
    const r = await pedir({ ANTHROPIC_API_KEY: 'sk-prueba' }, '/api/comida/analizar', { imagen: IMAGEN });
    assert.equal(r.status, 200);
    const d = await r.json();
    assert.equal(d.motor, 'claude-sonnet-5-5');
    assert.match(llamada.url, /\/v1\/messages$/);
    const cuerpo = JSON.parse(llamada.init.body);
    assert.equal(cuerpo.messages[0].content[0].source.media_type, 'image/jpeg');
    assert.equal(llamada.init.headers['x-api-key'], 'sk-prueba');
  } finally {
    globalThis.fetch = original;
  }
});

test('rechaza fotos inválidas y lo que no es comida', async () => {
  let r = await pedir({ AI: {} }, '/api/comida/analizar', { imagen: 'hola' });
  assert.equal(r.status, 400);
  const env = { AI: { run: async () => ({ response: JSON.stringify({ es_comida: false }) }) } };
  r = await pedir(env, '/api/comida/analizar', { imagen: IMAGEN });
  assert.equal(r.status, 422);
});

test('respeta el límite diario de fotos', async () => {
  const env = { DB: d1Falso(), LIMITE_DIA: '2', AI: { run: async () => ({ response: JSON.stringify(RESPUESTA) }) } };
  assert.equal((await pedir(env, '/api/comida/analizar', { imagen: IMAGEN })).status, 200);
  assert.equal((await pedir(env, '/api/comida/analizar', { imagen: IMAGEN })).status, 200);
  const r = await pedir(env, '/api/comida/analizar', { imagen: IMAGEN });
  assert.equal(r.status, 429);
});

test('busca un código de barras en Open Food Facts', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /world\.openfoodfacts\.org\/api\/v2\/product\/7501055300075\.json/);
    return new Response(
      JSON.stringify({
        status: 1,
        product: {
          product_name: 'Atún en agua', brands: 'Dolores, Pinsa', quantity: '140 g', serving_size: '100 g', serving_quantity: '100',
          nutriments: { 'energy-kcal_100g': 116, proteins_100g: 26, carbohydrates_100g: 0, fat_100g: 1.2, sodium_100g: 0.4 },
          ingredients_text_es: 'Atún, agua, sal',
        },
      }),
      { status: 200 }
    );
  };
  try {
    const r = await pedir({}, '/api/producto/7501055300075');
    assert.equal(r.status, 200);
    const d = await r.json();
    assert.equal(d.producto.marca, 'Dolores');
    assert.equal(d.producto.por100.kcal, 116);
    assert.equal(d.producto.por100.sodio, 400);
    assert.equal(d.producto.ingredientes, 'Atún, agua, sal');
  } finally {
    globalThis.fetch = original;
  }
});

test('código que no existe → 404 con noEncontrado', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ status: 0 }), { status: 404 });
  try {
    const r = await pedir({}, '/api/producto/12345678');
    assert.equal(r.status, 404);
    assert.equal((await r.json()).noEncontrado, true);
  } finally {
    globalThis.fetch = original;
  }
});

test('extraerJSON y normalizar aguantan respuestas raras', () => {
  assert.equal(extraerJSON('nada'), null);
  assert.deepEqual(extraerJSON('Aquí: {"a":1} listo'), { a: 1 });
  const n = normalizarAnalisis({ platillo: 'x', confianza: 'rarísima', ingredientes: [{ nombre: 'a', gramos: '100 g', kcal: '200', proteina: 10 }, { nombre: 'vacío' }] });
  assert.equal(n.confianza, 'media');
  assert.equal(n.ingredientes.length, 1);
  assert.equal(n.total.kcal, 200);
  const p = normalizarOFF('1', { nutriments: { energy_100g: 418.4 } });
  assert.equal(Math.round(p.por100.kcal), 100);
});
