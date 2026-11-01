// Worker de Cloudflare de Gymori: sirve la app (public/) y la API de la cámara.
//   GET  /api/estado              → versión y qué IA está activa
//   POST /api/comida/analizar     → foto del plato → calorías, macros e ingredientes (IA)
//   GET  /api/producto/:codigo    → código de barras → Open Food Facts
// IA: si existe el secreto ANTHROPIC_API_KEY usa Claude; si no, la IA gratis de Cloudflare (Workers AI).

const MAX_IMAGEN_BYTES = 6 * 1024 * 1024;
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const MODELO_CLAUDE = 'claude-sonnet-5-5';
const MODELO_WORKERS_AI = '@cf/meta/llama-4-scout-17b-16e-instruct';
const LIMITE_DIA = 60;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    try {
      if (url.pathname === '/api/estado' && request.method === 'GET') {
        return json({
          ok: true,
          build: env.CF_VERSION_METADATA?.id || null,
          ia: env.ANTHROPIC_API_KEY ? 'claude' : env.AI ? 'workers-ai' : 'ninguna',
        });
      }
      if (url.pathname === '/api/comida/analizar' && request.method === 'POST') {
        return await analizarComida(request, env);
      }
      const m = /^\/api\/producto\/(\d{8,14})$/.exec(url.pathname);
      if (m && request.method === 'GET') {
        return await producto(m[1], ctx);
      }
      return json({ error: 'Ruta no encontrada.' }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: 'Error del servidor: ' + (err?.message || String(err)) }, 500);
    }
  },
};

// ---------- Límite diario (para que nadie se acabe tu IA) ----------

async function contarUso(env) {
  if (!env.DB) return { ok: true };
  const limite = Number(env.LIMITE_DIA || LIMITE_DIA);
  const hoy = new Date().toISOString().slice(0, 10);
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS uso (fecha TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)').run();
  const fila = await env.DB.prepare('SELECT n FROM uso WHERE fecha = ?').bind(hoy).first();
  if (limite > 0 && fila && fila.n >= limite) return { ok: false, limite };
  await env.DB.prepare('INSERT INTO uso (fecha, n) VALUES (?, 1) ON CONFLICT(fecha) DO UPDATE SET n = n + 1').bind(hoy).run();
  return { ok: true };
}

// ---------- Foto del plato ----------

const SISTEMA = `Eres el nutriólogo deportivo de Sky dentro de su app de gym. Sky vive en Guasave, Sinaloa, y está bajando de grasa cuidando su músculo. Te manda la foto de lo que va a comer.

Tu trabajo: identificar la comida y estimar sus calorías y macros con la mayor precisión posible.
- Usa referencias de porciones mexicanas: tortilla de maíz ≈ 30 g (64 kcal), tortilla de harina mediana ≈ 40 g (125 kcal), taza de arroz cocido ≈ 160 g, taza de frijoles ≈ 170 g, pieza de pan bolillo ≈ 60 g.
- Fíjate en el tamaño del plato, los cubiertos y las manos para calcular gramos.
- Cuenta el aceite o la grasa que no se ve (frito, guisado, empanizado, aderezos, crema, queso derretido).
- Si es una etiqueta de "Información nutrimental", léela y calcula para el paquete completo o la porción que se ve.
- Si no hay comida en la foto, pon "es_comida": false.

Responde SOLO con un objeto JSON válido, sin texto antes ni después, con esta forma:
{
  "es_comida": true,
  "platillo": "nombre corto del platillo",
  "descripcion": "una frase con lo que ves y el tamaño de la porción",
  "confianza": "alta" | "media" | "baja",
  "ingredientes": [
    { "nombre": "tortilla de maíz (3 piezas)", "gramos": 90, "kcal": 192, "proteina": 5, "carbos": 40, "grasa": 2.4 }
  ],
  "consejo": "1 o 2 frases, en español de México y tono de compa, sobre cómo encaja en su plan y una mejora fácil y barata"
}`;

function parsearImagen(valor) {
  if (typeof valor !== 'string') return null;
  const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(valor.trim());
  if (!m || !TIPOS_IMAGEN.includes(m[1])) return null;
  return { tipo: m[1], b64: m[2], bytes: Math.floor((m[2].length * 3) / 4) };
}

async function analizarComida(request, env) {
  let cuerpo;
  try {
    cuerpo = await request.json();
  } catch {
    return json({ error: 'La petición no trae JSON válido.' }, 400);
  }
  const imagen = parsearImagen(cuerpo?.imagen);
  if (!imagen) return json({ error: 'No llegó la foto (o no es JPG, PNG o WEBP). Tómala otra vez.' }, 400);
  if (imagen.bytes > MAX_IMAGEN_BYTES) return json({ error: 'La foto pesa demasiado. Tómala de nuevo.' }, 413);
  if (!env.ANTHROPIC_API_KEY && !env.AI) return json({ error: 'No hay IA conectada: falta el binding AI o el secreto ANTHROPIC_API_KEY en Cloudflare.' }, 503);

  const uso = await contarUso(env).catch(() => ({ ok: true }));
  if (!uso.ok) return json({ error: `Ya se usaron las ${uso.limite} fotos de hoy. Mañana se reinicia.` }, 429);

  const nota = typeof cuerpo.nota === 'string' ? cuerpo.nota.slice(0, 300).trim() : '';
  const obj = cuerpo.objetivo || {};
  const partes = ['Analiza esta foto.'];
  if (nota) partes.push(`Sky aclara: "${nota}"`);
  if (Number(obj.kcal)) partes.push(`Su meta del día: ${Math.round(obj.kcal)} kcal y ${Math.round(Number(obj.proteina) || 0)} g de proteína.`);
  if (typeof cuerpo.tiempo === 'string') partes.push(`Es su ${cuerpo.tiempo.slice(0, 20)}.`);
  const texto = partes.join('\n');

  let crudo;
  try {
    crudo = env.ANTHROPIC_API_KEY ? await conClaude(env, imagen, texto) : await conWorkersAI(env, imagen, texto);
  } catch (err) {
    console.error(err);
    return json({ error: 'La IA no pudo revisar la foto: ' + (err?.message || String(err)) }, 502);
  }
  let datos = extraerJSON(crudo.texto);
  if (!datos && !env.ANTHROPIC_API_KEY) {
    // segundo intento, más estricto
    try {
      crudo = await conWorkersAI(env, imagen, texto + '\nIMPORTANTE: responde únicamente el objeto JSON.');
      datos = extraerJSON(crudo.texto);
    } catch {
      datos = null;
    }
  }
  if (!datos) return json({ error: 'La IA no respondió bien. Intenta con otra foto.' }, 502);
  if (datos.es_comida === false) return json({ error: 'No vi comida en la foto. Tómala con el plato completo y buena luz.' }, 422);
  const r = normalizarAnalisis(datos);
  if (!r.ingredientes.length) return json({ error: 'No pude identificar los ingredientes. Intenta con otra foto.' }, 422);
  return json({ ...r, motor: crudo.motor });
}

export function extraerJSON(texto) {
  if (!texto) return null;
  const s = String(texto).replace(/```(?:json)?/gi, '');
  const ini = s.indexOf('{');
  const fin = s.lastIndexOf('}');
  if (ini < 0 || fin <= ini) return null;
  try {
    return JSON.parse(s.slice(ini, fin + 1));
  } catch {
    return null;
  }
}

const numero = (v, max) => {
  const n = Number(String(v ?? '').replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0;
};
const redondo = (v, d = 0) => Math.round(v * 10 ** d) / 10 ** d;

export function normalizarAnalisis(d) {
  const ingredientes = (Array.isArray(d.ingredientes) ? d.ingredientes : [])
    .slice(0, 20)
    .map((i) => ({
      nombre: String(i?.nombre || 'Ingrediente').slice(0, 80),
      gramos: redondo(numero(i?.gramos, 3000)),
      kcal: redondo(numero(i?.kcal, 5000)),
      proteina: redondo(numero(i?.proteina, 400), 1),
      carbos: redondo(numero(i?.carbos, 800), 1),
      grasa: redondo(numero(i?.grasa, 400), 1),
    }))
    .filter((i) => i.kcal > 0 || i.gramos > 0);
  const total = ingredientes.reduce(
    (s, i) => ({ kcal: s.kcal + i.kcal, proteina: s.proteina + i.proteina, carbos: s.carbos + i.carbos, grasa: s.grasa + i.grasa }),
    { kcal: 0, proteina: 0, carbos: 0, grasa: 0 }
  );
  const confianza = ['alta', 'media', 'baja'].includes(d.confianza) ? d.confianza : 'media';
  return {
    platillo: String(d.platillo || 'Comida').slice(0, 80),
    descripcion: String(d.descripcion || '').slice(0, 300),
    confianza,
    ingredientes,
    total: { kcal: redondo(total.kcal), proteina: redondo(total.proteina, 1), carbos: redondo(total.carbos, 1), grasa: redondo(total.grasa, 1) },
    consejo: String(d.consejo || '').slice(0, 400),
  };
}

async function conClaude(env, imagen, texto) {
  const modelo = env.MODELO_CLAUDE || MODELO_CLAUDE;
  const cuerpo = {
    model: modelo,
    max_tokens: 2000,
    system: SISTEMA,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: imagen.tipo, data: imagen.b64 } },
          { type: 'text', text: texto },
        ],
      },
    ],
  };
  const base = env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
  const r = await fetch(`${base}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  if (!r.ok) throw new Error(`Claude respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  const salida = (d.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  return { texto: salida, motor: modelo };
}

async function conWorkersAI(env, imagen, texto) {
  const modelo = env.MODELO_WORKERS_AI || MODELO_WORKERS_AI;
  const r = await env.AI.run(modelo, {
    messages: [
      { role: 'system', content: SISTEMA },
      {
        role: 'user',
        content: [
          { type: 'text', text: texto },
          { type: 'image_url', image_url: { url: `data:${imagen.tipo};base64,${imagen.b64}` } },
        ],
      },
    ],
    max_tokens: 1200,
    temperature: 0.2,
  });
  let salida = typeof r === 'string' ? r : r?.response ?? r?.result?.response ?? r?.choices?.[0]?.message?.content ?? '';
  if (salida && typeof salida === 'object') salida = JSON.stringify(salida);
  return { texto: String(salida), motor: modelo };
}

// ---------- Código de barras (Open Food Facts) ----------

const CAMPOS_OFF =
  'product_name,product_name_es,brands,quantity,serving_size,serving_quantity,nutriments,ingredients_text,ingredients_text_es,nutriscore_grade,nova_group,image_front_small_url';

export function normalizarOFF(codigo, p) {
  const n = p.nutriments || {};
  const kcal = n['energy-kcal_100g'] ?? (n.energy_100g ? n.energy_100g / 4.184 : null);
  return {
    codigo,
    nombre: p.product_name_es || p.product_name || 'Producto sin nombre',
    marca: String(p.brands || '').split(',')[0].trim(),
    cantidad: p.quantity || '',
    porcion: p.serving_size || '',
    porcionG: Number(p.serving_quantity) || null,
    por100: {
      kcal: kcal !== null && kcal !== undefined ? Number(kcal) : null,
      p: Number(n.proteins_100g ?? 0),
      c: Number(n.carbohydrates_100g ?? 0),
      g: Number(n.fat_100g ?? 0),
      azucar: n.sugars_100g ?? null,
      sodio: n.sodium_100g !== undefined ? Number(n.sodium_100g) * 1000 : null,
    },
    ingredientes: p.ingredients_text_es || p.ingredients_text || '',
    nutriscore: p.nutriscore_grade || null,
    nova: p.nova_group || null,
    imagen: p.image_front_small_url || null,
  };
}

async function producto(codigo, ctx) {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const llave = new Request(`https://cache.gym/producto/${codigo}`);
  if (cache) {
    const guardado = await cache.match(llave);
    if (guardado) return conCors(guardado);
  }
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${codigo}.json?fields=${CAMPOS_OFF}`, {
    headers: { 'user-agent': 'Gymori-app-personal/1.0 (Guasave, Sinaloa)' },
  });
  if (!r.ok && r.status !== 404) return json({ error: `Open Food Facts respondió ${r.status}.` }, 502);
  const d = await r.json().catch(() => null);
  if (!d || d.status !== 1 || !d.product) return json({ error: 'No encontré ese código.', noEncontrado: true }, 404);
  const resp = json({ producto: normalizarOFF(codigo, d.product) }, 200, { 'cache-control': 'public, max-age=604800' });
  if (cache && ctx && ctx.waitUntil) ctx.waitUntil(cache.put(llave, resp.clone()));
  return resp;
}

// ---------- utilidades ----------

function conCors(resp) {
  const r = new Response(resp.body, resp);
  for (const [k, v] of Object.entries(CORS)) r.headers.set(k, v);
  return r;
}

function json(datos, estado = 200, extra = {}) {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS, ...extra },
  });
}
