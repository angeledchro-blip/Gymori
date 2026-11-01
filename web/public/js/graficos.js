// Gráficos en SVG hechos a mano: barra con discos, disco de calorías y gráfica de peso.
import { esc, diasEntre, fechaCorta, sumarDias, hoy } from './util.js';

const COLORES_DISCO = ['#aab757', '#aab757', '#dba43f', '#c99e6b', '#dba43f', '#c99e6b', '#a83e52', '#c99e6b'];

// Barra olímpica con un disco por ejercicio (más series = disco más alto)
export function barraPesas(ejercicios, { ancho = 320, alto = 64 } = {}) {
  const n = ejercicios.length;
  const izq = [];
  const der = [];
  ejercicios.forEach((e, i) => (i % 2 === 0 ? izq : der).push({ e, i }));
  const cy = alto / 2;
  const discos = [];
  const pinta = (lado, lista) => {
    lista.forEach(({ e, i }, k) => {
      const h = Math.max(22, Math.min(alto - 4, 26 + (e.series || 3) * 8 - k * 2));
      const w = 9;
      const x = lado === 'i' ? 70 - (k + 1) * (w + 2.5) : ancho - 70 + k * (w + 2.5) + 2.5;
      discos.push(`<rect x="${x}" y="${cy - h / 2}" width="${w}" height="${h}" rx="2.5" fill="${COLORES_DISCO[i % COLORES_DISCO.length]}"/>`);
    });
  };
  pinta('i', izq);
  pinta('d', der);
  return `<svg class="barra-pesas" viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="${n} ejercicios">
    <rect x="4" y="${cy - 2.5}" width="${ancho - 8}" height="5" rx="2.5" fill="#8a7b6b"/>
    <rect x="66" y="${cy - 8}" width="6" height="16" rx="1.5" fill="#b6a795"/>
    <rect x="${ancho - 72}" y="${cy - 8}" width="6" height="16" rx="1.5" fill="#b6a795"/>
    ${discos.join('')}
  </svg>`;
}

// Disco de calorías: anillo con "centro" como de disco de pesas
export function discoKcal(consumido, meta, tam = 132) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = meta > 0 ? consumido / meta : 0;
  const color = pct > 1.05 ? '#d97d8f' : '#aab757';
  const largo = Math.min(1, pct) * c;
  return `<svg viewBox="0 0 132 132" width="${tam}" height="${tam}" aria-hidden="true">
    <circle cx="66" cy="66" r="${r}" fill="none" stroke="#2c221b" stroke-width="14"/>
    <circle cx="66" cy="66" r="${r}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${largo} ${c}" />
    <circle cx="66" cy="66" r="${r - 13}" fill="none" stroke="#3d3027" stroke-width="1"/>
    <circle cx="66" cy="66" r="${r + 9}" fill="none" stroke="#3d3027" stroke-width="1"/>
  </svg>`;
}

export function barraMacro(valor, meta, color) {
  const pct = meta > 0 ? Math.min(100, (valor / meta) * 100) : 0;
  return `<span class="pista"><i style="width:${pct}%;background:${color}"></i></span>`;
}

// Gráfica de peso con promedio móvil de 7 días y línea de meta
export function graficaPeso(registros, meta, dias = 60) {
  const W = 340;
  const H = 190;
  const m = { l: 34, r: 10, t: 12, b: 24 };
  const fin = hoy();
  let inicio = sumarDias(fin, -(dias - 1));
  const datos = registros.filter((r) => r.fecha >= inicio && r.fecha <= fin);
  if (!datos.length) return '';
  // si hay menos datos que el rango, la gráfica empieza en el primer registro
  if (datos[0].fecha > inicio) inicio = sumarDias(datos[0].fecha, -1);
  const span = Math.max(1, diasEntre(inicio, fin));
  const ys = datos.map((d) => d.kg);
  let min = Math.min(...ys);
  let max = Math.max(...ys);
  if (meta && meta >= min - 4) min = Math.min(min, meta);
  min = Math.floor(min - 0.5);
  max = Math.ceil(max + 0.5);
  if (max - min < 3) max = min + 3;
  const x = (f) => m.l + (diasEntre(inicio, f) / span) * (W - m.l - m.r);
  const y = (kg) => m.t + (1 - (kg - min) / (max - min)) * (H - m.t - m.b);
  // promedio móvil
  const prom = datos.map((d) => {
    const vent = registros.filter((r) => r.fecha <= d.fecha && diasEntre(r.fecha, d.fecha) <= 6);
    return { fecha: d.fecha, kg: vent.reduce((s, r) => s + r.kg, 0) / vent.length };
  });
  const linea = prom.map((p, i) => `${i ? 'L' : 'M'}${x(p.fecha).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ');
  const puntos = datos.map((d) => `<circle cx="${x(d.fecha).toFixed(1)}" cy="${y(d.kg).toFixed(1)}" r="2.6" fill="#b6a795" opacity="0.7"/>`).join('');
  const ticks = [];
  const pasos = 3;
  for (let i = 0; i <= pasos; i++) {
    const v = min + ((max - min) * i) / pasos;
    ticks.push(`<text x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#8a7b6b">${Math.round(v)}</text><line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="#2c221b"/>`);
  }
  const fechas = [inicio, sumarDias(inicio, Math.round(span / 2)), fin]
    .map((f, i) => `<text x="${x(f)}" y="${H - 6}" font-size="11" fill="#8a7b6b" text-anchor="${['start', 'middle', 'end'][i]}">${esc(fechaCorta(f))}</text>`)
    .join('');
  const metaLinea =
    meta && meta >= min && meta <= max
      ? `<line x1="${m.l}" x2="${W - m.r}" y1="${y(meta)}" y2="${y(meta)}" stroke="#dba43f" stroke-dasharray="5 4"/><text x="${W - m.r}" y="${y(meta) - 5}" text-anchor="end" font-size="11" fill="#dba43f">meta ${meta} kg</text>`
      : '';
  return `<svg class="grafica" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfica de peso">
    ${ticks.join('')}${metaLinea}${puntos}
    <path d="${linea}" fill="none" stroke="#aab757" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
    ${fechas}
  </svg>`;
}

// Mini gráfica para marcas de fuerza
export function chispa(valores, ancho = 90, alto = 28) {
  if (valores.length < 2) return '';
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const r = max - min || 1;
  const d = valores
    .map((v, i) => `${i ? 'L' : 'M'}${((i / (valores.length - 1)) * (ancho - 4) + 2).toFixed(1)},${(alto - 3 - ((v - min) / r) * (alto - 6)).toFixed(1)}`)
    .join(' ');
  return `<svg width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" aria-hidden="true"><path d="${d}" fill="none" stroke="#aab757" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// Barra del camino: cada fase suma un disco por lado
export function barraCamino(faseActual, total = 5) {
  const W = 340;
  const H = 96;
  const cy = H / 2;
  const discos = [];
  for (let i = 0; i < total; i++) {
    const activo = i < faseActual;
    const h = 80 - i * 8;
    const w = 12;
    const color = activo ? (i === faseActual - 1 ? '#dba43f' : '#aab757') : '#2c221b';
    const borde = activo ? 'none' : '#3d3027';
    const xi = 96 - (i + 1) * (w + 3);
    const xd = W - 96 + i * (w + 3) + 3;
    discos.push(`<rect x="${xi}" y="${cy - h / 2}" width="${w}" height="${h}" rx="3" fill="${color}" stroke="${borde}"/>`);
    discos.push(`<rect x="${xd}" y="${cy - h / 2}" width="${w}" height="${h}" rx="3" fill="${color}" stroke="${borde}"/>`);
  }
  return `<svg class="camino-barra" viewBox="0 0 ${W} ${H}" role="img" aria-label="Fase ${faseActual} de ${total}">
    <rect x="4" y="${cy - 3}" width="${W - 8}" height="6" rx="3" fill="#8a7b6b"/>
    <rect x="94" y="${cy - 10}" width="7" height="20" rx="2" fill="#b6a795"/>
    <rect x="${W - 101}" y="${cy - 10}" width="7" height="20" rx="2" fill="#b6a795"/>
    ${discos.join('')}
    <text x="${W / 2}" y="${cy - 14}" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="26" fill="#efe6d6">Fase ${faseActual}</text>
    <text x="${W / 2}" y="${cy + 30}" text-anchor="middle" font-size="12" fill="#b6a795">de ${total}</text>
  </svg>`;
}
