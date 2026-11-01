// Cámara: foto del plato → la IA calcula calorías y de qué está hecho; o código de barras → Open Food Facts.
import { estado } from '../store.js';
import { registrar, refrescar, ir } from '../nucleo.js';
import { esc, num, aviso, hoy } from '../util.js';
import { icono } from '../iconos.js';
import { objetivos } from '../calc.js';
import * as nativo from '../nativo.js';
import { agregarRegistro, chipsTiempo, activarChips, diaComida } from './comida.js';

let stream = null;
let bucle = null;
let modo = 'foto';
let tiempo = 'comida';
let foto = null; // dataURL capturada
let lector = null;

function base() {
  return nativo.baseApi(estado.config);
}

// ---------- Cámara ----------
async function prenderCamara() {
  apagarCamara();
  const video = document.getElementById('video');
  const est = document.getElementById('estadoCam');
  if (!video) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (est) est.textContent = 'Este navegador no deja usar la cámara. Usa "Elegir foto".';
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
    video.srcObject = stream;
    await video.play().catch(() => {});
    if (est) est.textContent = modo === 'foto' ? 'Encuadra el plato completo, con buena luz.' : 'Pon el código de barras dentro del recuadro.';
    if (modo === 'codigo') empezarLectura(video);
  } catch (err) {
    if (est) {
      est.textContent =
        err && err.name === 'NotAllowedError'
          ? 'Sin permiso de cámara. Actívalo en Ajustes del teléfono → Apps → GYM → Permisos.'
          : 'No pude abrir la cámara. Usa "Elegir foto" o escribe el código.';
    }
  }
}

function apagarCamara() {
  clearInterval(bucle);
  bucle = null;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}

function cuadro(video, max = 1024) {
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 960;
  const esc2 = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * esc2);
  c.height = Math.round(h * esc2);
  c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
  return c;
}

function imagenAJpeg(img, max = 1024) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const f = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * f);
  c.height = Math.round(h * f);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82);
}

// ---------- Código de barras ----------
function cargarZxing() {
  if (window.ZXing) return Promise.resolve(window.ZXing);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'vendor/zxing.min.js';
    s.onload = () => res(window.ZXing);
    s.onerror = rej;
    document.head.appendChild(s);
  });
}

async function empezarLectura(video) {
  let detector = null;
  if ('BarcodeDetector' in window) {
    try {
      detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    } catch {
      detector = null;
    }
  }
  let Z = null;
  if (!detector) {
    try {
      Z = await cargarZxing();
      const hints = new Map();
      hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]);
      hints.set(Z.DecodeHintType.TRY_HARDER, true);
      lector = new Z.MultiFormatReader();
      lector.setHints(hints);
    } catch {
      const est = document.getElementById('estadoCam');
      if (est) est.textContent = 'No pude cargar el lector. Escribe el código abajo.';
      return;
    }
  }
  const canvas = document.createElement('canvas');
  let ocupado = false;
  clearInterval(bucle);
  bucle = setInterval(async () => {
    if (ocupado || !video.videoWidth) return;
    ocupado = true;
    try {
      let codigo = null;
      if (detector) {
        const r = await detector.detect(video);
        if (r && r.length) codigo = r[0].rawValue;
      } else {
        // recorta la franja del centro, donde está la guía
        const w = video.videoWidth;
        const h = video.videoHeight;
        const cw = Math.round(w * 0.8);
        const ch = Math.round(h * 0.3);
        canvas.width = cw;
        canvas.height = ch;
        canvas.getContext('2d').drawImage(video, (w - cw) / 2, (h - ch) / 2, cw, ch, 0, 0, cw, ch);
        try {
          const lum = new Z.HTMLCanvasElementLuminanceSource(canvas);
          const bmp = new Z.BinaryBitmap(new Z.HybridBinarizer(lum));
          codigo = lector.decode(bmp).getText();
        } catch {
          codigo = null;
        }
      }
      if (codigo && /^\d{8,14}$/.test(codigo)) {
        clearInterval(bucle);
        bucle = null;
        nativo.vibrar(80);
        buscarProducto(codigo);
      }
    } finally {
      ocupado = false;
    }
  }, 280);
}

export function normalizarOFF(codigo, p) {
  const n = p.nutriments || {};
  const kcal = n['energy-kcal_100g'] ?? (n.energy_100g ? n.energy_100g / 4.184 : null);
  return {
    codigo,
    nombre: p.product_name_es || p.product_name || 'Producto sin nombre',
    marca: (p.brands || '').split(',')[0].trim(),
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

async function buscarProducto(codigo) {
  const res = document.getElementById('resultado');
  if (res) res.innerHTML = `<div class="cargando"><span class="girando"></span> Buscando ${esc(codigo)}…</div>`;
  let prod = null;
  let error = null;
  try {
    const r = await fetch(`${base()}/api/producto/${encodeURIComponent(codigo)}`);
    if (r.ok) prod = (await r.json()).producto || null;
    else if (r.status === 404) {
      const d = await r.json().catch(() => ({}));
      if (d && d.noEncontrado) error = 'no';
    }
  } catch {
    /* sigue con Open Food Facts directo */
  }
  if (!prod && error !== 'no') {
    try {
      const campos = 'product_name,product_name_es,brands,quantity,serving_size,serving_quantity,nutriments,ingredients_text,ingredients_text_es,nutriscore_grade,nova_group,image_front_small_url';
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(codigo)}.json?fields=${campos}`);
      const d = await r.json();
      if (d && d.status === 1 && d.product) prod = normalizarOFF(codigo, d.product);
      else error = 'no';
    } catch {
      error = 'red';
    }
  }
  if (!res || !document.body.contains(res)) return;
  if (!prod) {
    res.innerHTML = `<div class="aviso-caja ${error === 'red' ? 'vino' : ''}">${error === 'red' ? 'Sin internet: no pude buscar el producto.' : `No encontré el código ${esc(codigo)} en Open Food Facts.`} Puedes tomarle foto a la etiqueta en modo "Foto del plato" o agregarlo a mano.</div>
      <div class="fila-botones"><button class="boton secundario" data-a="esc:otraVez">Escanear otro</button><button class="boton secundario" data-a="esc:modo" data-v="foto">Foto de la etiqueta</button></div>`;
    return;
  }
  mostrarProducto(prod);
}

function mostrarProducto(prod) {
  const res = document.getElementById('resultado');
  const p = prod.por100;
  const sinDatos = p.kcal === null;
  const gr = prod.porcionG || 100;
  res.innerHTML = `<div class="panel">
      <div class="cabeza-fila"><div><div class="fila-titulo" style="font-family:var(--display);font-size:22px">${esc(prod.nombre)}</div><div class="tenue chico">${esc([prod.marca, prod.cantidad].filter(Boolean).join(', '))}</div></div>${prod.imagen ? `<img src="${esc(prod.imagen)}" alt="" style="width:56px;height:56px;object-fit:contain;border-radius:8px;background:#fff">` : ''}</div>
      ${sinDatos ? '<div class="aviso-caja">Este producto no trae calorías registradas. Tómale foto a la etiqueta.</div>' : `
      <table class="tabla-precios" style="margin-top:10px"><thead><tr><th>Por 100 g</th><th></th></tr></thead><tbody>
        <tr><td>Calorías</td><td>${num(p.kcal)} kcal</td></tr>
        <tr><td>Proteína</td><td>${num(p.p, 1)} g</td></tr>
        <tr><td>Carbohidratos</td><td>${num(p.c, 1)} g${p.azucar !== null ? ` (azúcar ${num(p.azucar, 1)} g)` : ''}</td></tr>
        <tr><td>Grasa</td><td>${num(p.g, 1)} g</td></tr>
        ${p.sodio !== null ? `<tr><td>Sodio</td><td>${num(p.sodio)} mg</td></tr>` : ''}
      </tbody></table>`}
      ${prod.ingredientes ? `<h3>De qué está hecho</h3><p class="tenue chico">${esc(prod.ingredientes)}</p>` : ''}
      ${prod.nova ? `<p class="tenue chico">${prod.nova >= 4 ? 'Ultraprocesado (NOVA 4): cómelo de vez en cuando.' : `Nivel de procesamiento NOVA ${prod.nova}.`}</p>` : ''}
    </div>
    ${sinDatos ? '' : `<label class="campo"><span>¿Cuánto comiste? (gramos o ml)${prod.porcion ? `. Porción de la etiqueta: ${esc(prod.porcion)}` : ''}</span>
      <div class="paso" style="height:56px"><button type="button" data-a="esc:gr" data-d="-10">−</button><input id="prodGr" inputmode="decimal" value="${gr}" data-i="esc:grInput"><button type="button" data-a="esc:gr" data-d="10">+</button></div></label>
      <p class="tenue" id="prodCalc"></p>
      <div id="chipsProd">${chipsTiempo(tiempo)}</div>
      <div class="pila-botones"><button class="boton primario" data-a="esc:agregarProd">Agregar a mi día</button><button class="boton secundario" data-a="esc:otraVez">Escanear otro</button></div>`}`;
  res.dataset.prod = JSON.stringify(prod);
  if (!sinDatos) {
    activarChips(document.getElementById('chipsProd'));
    calcularProducto();
  }
}

function calcularProducto() {
  const res = document.getElementById('resultado');
  const prod = JSON.parse(res.dataset.prod || 'null');
  const gr = parseFloat(String(document.getElementById('prodGr').value).replace(',', '.')) || 0;
  const f = gr / 100;
  const p = prod.por100;
  document.getElementById('prodCalc').textContent = `${num(p.kcal * f)} kcal, ${num(p.p * f, 1)} g proteína, ${num(p.c * f)} g carbos, ${num(p.g * f, 1)} g grasa`;
  return { gr, kcal: p.kcal * f, p: p.p * f, c: p.c * f, g: p.g * f, prod };
}

// ---------- Foto → IA ----------
function mostrarFoto() {
  const cam = document.getElementById('camara');
  cam.innerHTML = `<img class="foto" src="${foto}" alt="Tu foto"><div class="estado-camara">¿Se ve bien todo el plato?</div>`;
  document.getElementById('controles').innerHTML = `
    <label class="campo"><span>¿Algo que no se vea en la foto? (opcional)</span><input id="notaFoto" placeholder="Ej. frito en aceite, 2 tortillas de harina" /></label>
    <div class="fila-botones"><button class="boton secundario" data-a="esc:otraVez">Otra foto</button><button class="boton primario" data-a="esc:analizar">Calcular calorías</button></div>`;
}

async function analizar() {
  const res = document.getElementById('resultado');
  const nota = (document.getElementById('notaFoto')?.value || '').trim();
  res.innerHTML = `<div class="cargando"><span class="girando"></span> Revisando tu plato…</div>`;
  const o = objetivos();
  let datos = null;
  let error = null;
  try {
    const r = await fetch(`${base()}/api/comida/analizar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imagen: foto, nota, tiempo, objetivo: { kcal: o.kcal, proteina: o.p } }),
    });
    const d = await r.json().catch(() => null);
    if (r.ok && d && d.total) datos = d;
    else if (r.status === 404 && !(d && d.error)) error = 'La IA todavía no está conectada: falta publicar la parte de Cloudflare (instrucciones en el README del repo). Mientras, usa "Buscar" o "Rápido".';
    else error = (d && d.error) || `La IA respondió con error ${r.status}.`;
  } catch {
    error = 'Sin conexión con la IA. Revisa tu internet e intenta otra vez.';
  }
  if (!document.body.contains(res)) return;
  if (!datos) {
    res.innerHTML = `<div class="aviso-caja vino">${esc(error)}</div>`;
    return;
  }
  mostrarAnalisis(datos);
}

function mostrarAnalisis(d) {
  const res = document.getElementById('resultado');
  res.dataset.analisis = JSON.stringify(d);
  const conf = { alta: ['olivo', 'Confianza alta'], media: ['mostaza', 'Confianza media'], baja: ['vino', 'Confianza baja'] }[d.confianza] || ['mostaza', 'Estimado'];
  res.innerHTML = `<div class="panel">
      <div class="cabeza-fila"><div class="fila-titulo" style="font-family:var(--display);font-size:24px">${esc(d.platillo)}</div><span class="etiqueta ${conf[0]}">${conf[1]}</span></div>
      ${d.descripcion ? `<p class="tenue chico" style="margin-top:4px">${esc(d.descripcion)}</p>` : ''}
      <h3>Lo que tiene</h3>
      <ul class="lista">${(d.ingredientes || [])
        .map((i) => `<li class="fila" style="min-height:44px;padding:8px 0"><span class="fila-cuerpo"><span class="fila-titulo">${esc(i.nombre)}</span><span class="fila-sub" style="display:block">${num(i.gramos)} g, ${num(i.proteina, 1)} g proteína</span></span><span class="fila-dato">${num(i.kcal)}</span></li>`)
        .join('')}</ul>
      <div class="cifras" style="margin-bottom:0">
        <div class="cifra"><span class="numero" id="aKcal">${num(d.total.kcal)}</span><small>kcal</small></div>
        <div class="cifra"><span class="numero" id="aP">${num(d.total.proteina)}</span><small>g proteína</small></div>
        <div class="cifra"><span class="numero" id="aCG">${num(d.total.carbos)}/${num(d.total.grasa)}</span><small>carbos / grasa</small></div>
      </div>
      ${d.consejo ? `<p style="margin-top:12px">${esc(d.consejo)}</p>` : ''}
      <p class="mas-tenue mini" style="margin:6px 0 0">Calculado con ${esc(d.motor || 'IA')}. Es una estimación: el aceite y las porciones escondidas pueden cambiarlo.</p>
    </div>
    <label class="campo"><span>¿Te comiste todo? Porción: <b id="porTxt">1×</b></span><input type="range" id="porcion" min="0.25" max="2" step="0.25" value="1" data-i="esc:porcion" style="width:100%;accent-color:#aab757"></label>
    <div id="chipsIA">${chipsTiempo(tiempo)}</div>
    <div class="pila-botones"><button class="boton primario" data-a="esc:agregarIA">Agregar a mi día</button><button class="boton secundario" data-a="esc:otraVez">Tomar otra foto</button></div>`;
  activarChips(document.getElementById('chipsIA'));
}

// ---------- Vista ----------
function render(m = 'foto', t = 'comida') {
  modo = m === 'codigo' ? 'codigo' : 'foto';
  tiempo = t || 'comida';
  return `<header class="cabeza"><span class="cabeza-fecha"><a href="#/comida">Comida</a></span><h1 class="cabeza-titulo">${modo === 'foto' ? 'Foto del plato' : 'Código de barras'}</h1></header>
    <div class="segmentos"><button class="${modo === 'foto' ? 'activo' : ''}" data-a="esc:modo" data-v="foto">Foto del plato</button><button class="${modo === 'codigo' ? 'activo' : ''}" data-a="esc:modo" data-v="codigo">Código de barras</button></div>
    <div class="camara" id="camara">
      <video id="video" playsinline muted autoplay></video>
      ${modo === 'codigo' ? '<div class="guia-codigo"></div>' : ''}
      <div class="estado-camara" id="estadoCam">Abriendo la cámara…</div>
    </div>
    <div id="controles">
      ${modo === 'foto'
        ? `<button class="disparador" data-a="esc:tomar" aria-label="Tomar foto"></button>
           <label class="boton secundario ancho" style="margin-top:14px">${icono('camara')} Elegir foto de la galería<input type="file" accept="image/*" data-c="esc:archivo" hidden></label>
           <p class="tenue chico" style="margin-top:10px">También sirve para la etiqueta de información nutrimental de un producto.</p>`
        : `<div class="fila-botones"><input class="entrada" id="codigoManual" inputmode="numeric" placeholder="O escribe el código" style="flex:2"><button class="boton secundario" data-a="esc:buscarCodigo" style="flex:1">Buscar</button></div>`}
    </div>
    <div id="resultado" style="margin-top:14px"></div>`;
}

function montar() {
  foto = null;
  prenderCamara();
}

function desmontar() {
  apagarCamara();
}

registrar({
  'esc:modo': (el) => ir(`escaner/${el.dataset.v}/${tiempo}`, true),
  'esc:tomar': () => {
    const video = document.getElementById('video');
    if (!video || !video.videoWidth) return aviso('La cámara todavía no está lista.');
    foto = cuadro(video).toDataURL('image/jpeg', 0.82);
    nativo.vibrar(30);
    apagarCamara();
    mostrarFoto();
  },
  'esc:archivo': (el) => {
    const f = el.files && el.files[0];
    if (!f) return;
    const lectorArchivo = new FileReader();
    lectorArchivo.onload = () => {
      const img = new Image();
      img.onload = () => {
        foto = imagenAJpeg(img);
        apagarCamara();
        mostrarFoto();
      };
      img.src = lectorArchivo.result;
    };
    lectorArchivo.readAsDataURL(f);
  },
  'esc:analizar': () => analizar(),
  'esc:otraVez': () => {
    foto = null;
    refrescar();
  },
  'esc:porcion': (el) => {
    const d = JSON.parse(document.getElementById('resultado').dataset.analisis || 'null');
    if (!d) return;
    const f = Number(el.value);
    document.getElementById('porTxt').textContent = `${f}×`;
    document.getElementById('aKcal').textContent = num(d.total.kcal * f);
    document.getElementById('aP').textContent = num(d.total.proteina * f);
    document.getElementById('aCG').textContent = `${num(d.total.carbos * f)}/${num(d.total.grasa * f)}`;
  },
  'esc:agregarIA': () => {
    const res = document.getElementById('resultado');
    const d = JSON.parse(res.dataset.analisis || 'null');
    if (!d) return;
    const f = Number(document.getElementById('porcion').value) || 1;
    const t = document.getElementById('chipsIA').dataset.t || tiempo;
    agregarRegistro(diaComida(), {
      t, nombre: d.platillo, kcal: d.total.kcal * f, p: d.total.proteina * f, c: d.total.carbos * f, g: d.total.grasa * f,
      origen: 'ia', cantTexto: f === 1 ? 'según la foto' : `${f}× de la foto`,
    });
    aviso('Agregado a tu día.');
    ir('comida');
  },
  'esc:gr': (el) => {
    const inp = document.getElementById('prodGr');
    inp.value = Math.max(0, (parseFloat(inp.value) || 0) + Number(el.dataset.d));
    calcularProducto();
  },
  'esc:grInput': () => calcularProducto(),
  'esc:agregarProd': () => {
    const x = calcularProducto();
    if (!x.gr) return aviso('Pon cuántos gramos comiste.');
    const t = document.getElementById('chipsProd').dataset.t || tiempo;
    agregarRegistro(diaComida(), {
      t, nombre: x.prod.marca ? `${x.prod.nombre} (${x.prod.marca})` : x.prod.nombre, kcal: x.kcal, p: x.p, c: x.c, g: x.g,
      origen: 'codigo', ref: x.prod.codigo, cantTexto: `${num(x.gr)} g`,
    });
    aviso('Agregado a tu día.');
    ir('comida');
  },
  'esc:buscarCodigo': () => {
    const v = (document.getElementById('codigoManual').value || '').replace(/\D/g, '');
    if (v.length < 8) return aviso('El código tiene de 8 a 13 números.');
    clearInterval(bucle);
    buscarProducto(v);
  },
});

export const vistaEscaner = { tab: 'comida', render, montar, desmontar };
