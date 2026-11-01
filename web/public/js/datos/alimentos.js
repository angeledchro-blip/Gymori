// Alimentos que encuentras en Guasave con precio aproximado (noviembre 2026).
// Fuentes: tiendas en línea de Walmart y Bodega Aurrera (precios vistos en nov 2026),
// folletos de Casa Ley en Sinaloa (2026) y precios de Oxxo en Rappi. Lo marcado como
// estimado es un cálculo aproximado: en Ajustes → Precios puedes poner lo que veas en tu tienda.
//
// Nutrientes por "base" unidades (100 g, 100 ml o 1 pieza): [kcal, proteína, carbos, grasa]
// precios: tienda → [precio $, presentación, cuánto rinde en la unidad del alimento, estimado?]

export const TIENDAS = [
  { id: 'bodega', nombre: 'Bodega Aurrera', corto: 'Bodega' },
  { id: 'walmart', nombre: 'Walmart', corto: 'Walmart' },
  { id: 'ley', nombre: 'Casa Ley', corto: 'Ley' },
  { id: 'oxxo', nombre: 'Oxxo', corto: 'Oxxo' },
];

export const CATEGORIAS = [
  ['proteina', 'Proteínas'],
  ['lacteo', 'Lácteos'],
  ['carbo', 'Tortillas, granos y pan'],
  ['fruta', 'Frutas'],
  ['verdura', 'Verduras'],
  ['grasa', 'Grasas buenas'],
  ['oxxo', 'Para la chamba (Oxxo)'],
];

const A = (id, nombre, cat, unidad, base, n, precios, extra = {}) => ({
  id, nombre, cat, unidad, base, kcal: n[0], p: n[1], c: n[2], g: n[3], precios, ...extra,
});
const e = true; // precio estimado

export const ALIMENTOS = [
  // ---------- Proteínas ----------
  A('pechuga', 'Pechuga de pollo sin hueso', 'proteina', 'g', 100, [120, 22.5, 0, 2.6], {
    bodega: [170, 'kg', 1000], walmart: [172, 'kg', 1000], ley: [165, 'kg', 1000, e],
  }, { nota: 'Peso en crudo. En Ley la ponen en oferta cerca de $100 el kilo; ahí compra para la semana.', casera: [130, 'una palma grande'] }),
  A('huevo', 'Huevo', 'proteina', 'pza', 1, [72, 6.3, 0.4, 4.8], {
    bodega: [64, '30 piezas', 30], walmart: [65, '30 piezas', 30], ley: [72, '30 piezas', 30, e], oxxo: [45, '12 piezas', 12, e],
  }, { nota: 'El de 30 sale a poco más de $2 la pieza: de lo más barato en proteína.' }),
  A('claras', 'Claras de huevo líquidas', 'proteina', 'g', 100, [48, 10.5, 0.7, 0.2], {
    bodega: [46.5, '1 kg', 1000], walmart: [47, '1 kg', 1000], ley: [52, '1 kg', 1000, e],
  }, { nota: 'Pura proteína sin grasa. 1 clara ≈ 33 g.', casera: [100, '3 claras'] }),
  A('atun', 'Atún en agua (lata 140 g)', 'proteina', 'lata', 1, [105, 24, 0, 1], {
    bodega: [21, 'lata', 1], walmart: [21, 'lata', 1], ley: [23, 'lata', 1, e], oxxo: [29, 'lata', 1, e],
  }, { nota: 'Busca "aleta amarilla en agua"; las marcas con soya traen menos proteína.' }),
  A('sardina', 'Sardina en tomate', 'proteina', 'g', 100, [157, 17.4, 1.6, 9], {
    bodega: [17, 'lata 425 g (marca Aurrera)', 425], walmart: [48, 'lata 425 g (Guaymex)', 425], ley: [46, 'lata 425 g', 425, e],
  }, { nota: 'Proteína y omega 3 bien barato.' }),
  A('molida', 'Carne molida de res 90/10', 'proteina', 'g', 100, [176, 20, 0, 10], {
    bodega: [189, 'kg', 1000, e], walmart: [199, 'kg', 1000, e], ley: [200, 'kg', 1000],
  }, { nota: 'En Ley el tubo Sukarne de 400 g anda en $80. La 70/30 es más barata pero trae el triple de grasa.' }),
  A('molida_7030', 'Carne molida 70/30 (económica)', 'proteina', 'g', 100, [332, 14, 0, 30], {
    bodega: [56, '500 g', 500], walmart: [60, '500 g', 500, e],
  }, { nota: 'Sale barata pero casi la mitad de sus calorías es grasa. Escúrrela bien.' }),
  A('bistec', 'Bistec de res (pulpa)', 'proteina', 'g', 100, [135, 21.5, 0, 5], {
    bodega: [223, 'kg', 1000], walmart: [229, 'kg', 1000, e], ley: [250, 'kg', 1000],
  }, { casera: [150, 'un bistec mediano'] }),
  A('cerdo', 'Lomo o milanesa de cerdo', 'proteina', 'g', 100, [143, 21, 0, 6], {
    bodega: [118, 'kg', 1000], walmart: [125, 'kg', 1000, e], ley: [110, 'kg', 1000],
  }),
  A('tilapia', 'Filete de tilapia', 'proteina', 'g', 100, [96, 20, 0, 1.7], {
    bodega: [102, 'kg', 1000], walmart: [110, 'kg', 1000, e], ley: [115, 'kg', 1000, e],
  }),
  A('basa', 'Filete de basa', 'proteina', 'g', 100, [90, 15, 0, 3.5], {
    bodega: [69, 'kg', 1000], walmart: [79, 'kg', 1000, e], ley: [85, 'kg', 1000, e],
  }, { nota: 'El pescado más barato del súper.' }),
  A('camaron', 'Camarón crudo limpio', 'proteina', 'g', 100, [85, 20, 0, 0.5], {
    bodega: [289, 'kg', 1000, e], walmart: [299, 'kg', 1000, e], ley: [280, 'kg', 1000, e],
  }, { nota: 'Caro, pero en temporada lo consigues más barato con los camaroneros de Guasave.' }),
  A('machaca', 'Machaca de res', 'proteina', 'g', 100, [330, 58, 3, 9], {
    walmart: [75, '100 g', 100, e], ley: [72, '100 g', 100, e],
  }, { nota: 'Muy alta en proteína; rinde con huevo. Ojo con la sal.', casera: [30, 'un puñito'], despensa: true }),
  A('proteina', 'Proteína en polvo (whey)', 'proteina', 'scoop', 1, [120, 24, 3, 1.5], {
    walmart: [849, '907 g (≈30 scoops)', 30, e],
  }, { nota: 'Solo si no llegas a tu proteína con comida.', despensa: true }),
  A('soya', 'Soya texturizada', 'proteina', 'g', 100, [330, 50, 30, 1], {
    bodega: [24, '330 g', 330, e], walmart: [26, '330 g', 330, e], ley: [29, '330 g', 330, e],
  }, { nota: 'Peso en seco: se hidrata y rinde el triple. Queda bien en picadillo.', despensa: true }),

  // ---------- Lácteos ----------
  A('panela', 'Queso panela', 'lacteo', 'g', 100, [230, 18, 2, 17], {
    bodega: [72, '400 g', 400, e], walmart: [76, '400 g', 400], ley: [85, '400 g', 400, e], oxxo: [52, '200 g', 200, e],
  }, { nota: 'La versión light trae como 40 % menos grasa casi al mismo precio.', casera: [40, 'una rebanada gruesa'] }),
  A('cottage', 'Queso cottage', 'lacteo', 'g', 100, [72, 12.4, 2.7, 1], {
    bodega: [57, '380 g', 380, e], walmart: [59, '380 g', 380], ley: [64, '380 g', 380, e],
  }),
  A('yogurt', 'Yogurt griego natural sin azúcar', 'lacteo', 'g', 100, [80, 8.5, 5, 3], {
    bodega: [68, '700 g', 700], walmart: [75, '750 g', 750], ley: [79, '750 g', 750, e], oxxo: [20, '220 g (sin azúcar)', 220],
  }, { casera: [245, '1 taza'] }),
  A('leche', 'Leche light o descremada', 'lacteo', 'ml', 100, [38, 3.2, 4.8, 0.8], {
    bodega: [29, '1 L', 1000], walmart: [24, '1 L', 1000], ley: [31, '1 L', 1000, e], oxxo: [32, '1 L', 1000, e],
  }, { casera: [250, '1 vaso'] }),

  // ---------- Carbohidratos ----------
  A('tortilla', 'Tortilla de maíz', 'carbo', 'pza', 1, [64, 1.7, 13.2, 0.8], {
    bodega: [21, 'kg (≈33 piezas)', 33, e], walmart: [22, 'kg (≈33 piezas)', 33, e], ley: [24, 'kg (≈33 piezas)', 33, e],
  }, { nota: 'En tortillería de barrio en Guasave anda entre $25 y $28 el kilo.' }),
  A('tortilla_harina', 'Tortillinas de harina', 'carbo', 'pza', 1, [85, 2.2, 14, 2.3], {
    bodega: [33, '22 piezas', 22], walmart: [36, '22 piezas', 22, e], ley: [38, '22 piezas', 22, e], oxxo: [45, '22 piezas', 22, e],
  }, { nota: 'Una de harina tiene un tercio más de calorías que una de maíz.' }),
  A('arroz', 'Arroz blanco (cocido)', 'carbo', 'g', 100, [130, 2.7, 28, 0.3], {
    bodega: [15, '900 g', 2400], walmart: [18, '900 g', 2400], ley: [26, '1 kg', 2700, e],
  }, { nota: 'Cantidades en cocido: 900 g crudos rinden como 2.4 kg cocidos.', casera: [160, '1 taza'], despensa: true }),
  A('frijol', 'Frijol (cocido)', 'carbo', 'g', 100, [135, 8.8, 24, 0.5], {
    bodega: [21, '900 g', 2250], walmart: [25, '900 g', 2250], ley: [32, '900 g', 2250, e],
  }, { nota: 'El peruano o azufrado anda en $49–59 los 900 g; el pinto o el negro nutren igual y cuestan la mitad.', casera: [170, '1 taza'], despensa: true }),
  A('lenteja', 'Lenteja (cocida)', 'carbo', 'g', 100, [116, 9, 20, 0.4], {
    bodega: [16, '500 g', 1250, e], walmart: [16, '500 g', 1250], ley: [22, '500 g', 1250, e],
  }, { casera: [200, '1 taza'], despensa: true }),
  A('avena', 'Avena en hojuelas', 'carbo', 'g', 100, [380, 13, 66, 7], {
    bodega: [27, '1 kg', 1000, e], walmart: [27, '1 kg', 1000], ley: [38, '1 kg', 1000, e],
  }, { casera: [80, '1 taza'], despensa: true }),
  A('pan', 'Pan integral (rebanada)', 'carbo', 'reb', 1, [75, 4, 13, 1], {
    bodega: [53, '620 g (≈20 rebanadas)', 20, e], walmart: [55, '620 g (≈20 rebanadas)', 20], ley: [58, '620 g', 20, e], oxxo: [62, '620 g', 20, e],
  }),
  A('papa', 'Papa', 'carbo', 'g', 100, [77, 2, 17.5, 0.1], {
    bodega: [47, 'kg', 1000], walmart: [45, 'kg', 1000, e], ley: [38, 'kg', 1000, e],
  }, { casera: [170, '1 papa mediana'] }),
  A('camote', 'Camote', 'carbo', 'g', 100, [86, 1.6, 20, 0.1], {
    bodega: [35, 'kg', 1000, e], walmart: [38, 'kg', 1000, e], ley: [34, 'kg', 1000, e],
  }),
  A('pasta', 'Pasta (seca)', 'carbo', 'g', 100, [360, 12.5, 72, 1.5], {
    bodega: [35, '1 kg', 1000], walmart: [38, '1 kg', 1000, e], ley: [42, '1 kg', 1000, e],
  }, { nota: 'Peso en seco: 90 g secos son como 2 tazas cocida.', despensa: true }),
  A('tostadas', 'Tostadas horneadas', 'carbo', 'pza', 1, [45, 1, 9, 0.6], {
    bodega: [33, '25 piezas', 25, e], walmart: [36, '25 piezas', 25, e], ley: [39, '25 piezas', 25, e], oxxo: [42, '25 piezas', 25, e],
  }, { nota: 'Horneadas, no fritas: casi la mitad de calorías.' }),

  // ---------- Frutas ----------
  A('platano', 'Plátano', 'fruta', 'pza', 1, [105, 1.3, 27, 0.4], {
    bodega: [17, 'kg (≈5 piezas)', 5.5], walmart: [18, 'kg (≈5 piezas)', 5.5], ley: [22, 'kg', 5.5, e], oxxo: [9, 'pieza', 1, e],
  }),
  A('manzana', 'Manzana', 'fruta', 'pza', 1, [95, 0.5, 25, 0.3], {
    bodega: [40, 'kg (≈5 piezas)', 5], walmart: [40, 'kg (≈5 piezas)', 5], ley: [46, 'kg', 5, e], oxxo: [14, 'pieza', 1, e],
  }),
  A('naranja', 'Naranja', 'fruta', 'pza', 1, [62, 1.2, 15, 0.2], {
    bodega: [35, 'kg (≈6 piezas)', 6], walmart: [35, 'kg (≈6 piezas)', 6], ley: [29, 'kg', 6, e],
  }),
  A('papaya', 'Papaya', 'fruta', 'g', 100, [43, 0.5, 11, 0.3], {
    bodega: [38, 'kg', 1000, e], walmart: [40, 'kg', 1000], ley: [32, 'kg', 1000, e],
  }, { casera: [145, '1 taza picada'] }),

  // ---------- Verduras ----------
  A('tomate', 'Tomate (jitomate)', 'verdura', 'g', 100, [18, 0.9, 3.9, 0.2], {
    bodega: [25, 'kg', 1000], walmart: [27, 'kg', 1000], ley: [28, 'kg', 1000, e],
  }, { casera: [120, '1 tomate'] }),
  A('cebolla', 'Cebolla', 'verdura', 'g', 100, [40, 1.1, 9.3, 0.1], {
    bodega: [62, 'kg', 1000], walmart: [69, 'kg', 1000], ley: [55, 'kg', 1000, e],
  }),
  A('pepino', 'Pepino', 'verdura', 'g', 100, [15, 0.7, 3.6, 0.1], {
    bodega: [29, 'kg', 1000], walmart: [30, 'kg', 1000, e], ley: [24, 'kg', 1000, e],
  }),
  A('lechuga', 'Lechuga romana', 'verdura', 'g', 100, [17, 1.2, 3.3, 0.3], {
    bodega: [24, 'pieza (≈400 g)', 400], walmart: [39, 'pieza (≈400 g)', 400], ley: [25, 'pieza (≈400 g)', 400, e],
  }),
  A('zanahoria', 'Zanahoria', 'verdura', 'g', 100, [41, 0.9, 9.6, 0.2], {
    bodega: [11, 'kg', 1000], walmart: [15, 'kg', 1000, e], ley: [16, 'kg', 1000, e],
  }),
  A('calabacita', 'Calabacita', 'verdura', 'g', 100, [17, 1.2, 3.1, 0.3], {
    bodega: [39, 'kg', 1000], walmart: [40, 'kg', 1000, e], ley: [30, 'kg', 1000, e],
  }),
  A('brocoli', 'Brócoli', 'verdura', 'g', 100, [34, 2.8, 6.6, 0.4], {
    bodega: [48, 'kg', 1000, e], walmart: [52, 'kg', 1000, e], ley: [50, 'kg', 1000, e],
  }, { casera: [90, '1 taza'] }),
  A('espinaca', 'Espinaca', 'verdura', 'g', 100, [23, 2.9, 3.6, 0.4], {
    bodega: [15, 'manojo (≈250 g)', 250, e], walmart: [16, 'manojo (≈250 g)', 250, e], ley: [10, 'manojo (≈250 g)', 250],
  }),
  A('nopal', 'Nopal', 'verdura', 'g', 100, [16, 1.3, 3.3, 0.1], {
    bodega: [42, 'kg', 1000, e], walmart: [45, 'kg', 1000, e], ley: [40, 'kg', 1000, e],
  }),
  A('tomatillo', 'Tomate verde (salsa)', 'verdura', 'g', 100, [32, 1, 5.8, 1], {
    bodega: [41, 'kg', 1000], walmart: [42, 'kg', 1000, e], ley: [30, 'kg', 1000],
  }),
  A('verduras_congeladas', 'Verduras mixtas congeladas', 'verdura', 'g', 100, [60, 2.5, 12, 0.4], {
    bodega: [32, '500 g', 500, e], walmart: [35, '500 g', 500, e], ley: [38, '500 g', 500, e],
  }),
  A('limon', 'Limón', 'verdura', 'pza', 1, [10, 0.2, 3, 0], {
    bodega: [40, 'kg (≈15 piezas)', 15], walmart: [40, 'kg (≈15 piezas)', 15, e], ley: [29, 'kg', 15],
  }),

  // ---------- Grasas ----------
  A('aguacate', 'Aguacate (pulpa)', 'grasa', 'g', 100, [160, 2, 8.5, 14.7], {
    bodega: [40, 'kg (≈700 g de pulpa)', 700], walmart: [45, 'kg', 700, e], ley: [45, 'kg', 700, e],
  }, { casera: [35, '¼ de aguacate'] }),
  A('aceite', 'Aceite vegetal', 'grasa', 'cdita', 1, [40, 0, 0, 4.5], {
    bodega: [27, '800 ml', 160], walmart: [30, '850 ml', 170], ley: [46, '1 L', 200, e], oxxo: [55, '1 L', 200, e],
  }, { nota: 'Mídelo con cucharita: un chorro "al ojo" son fácil 3 o 4.', despensa: true }),
  A('crema_cacahuate', 'Crema de cacahuate', 'grasa', 'cda', 1, [94, 3.5, 3, 8], {
    bodega: [52, '340 g', 21, e], walmart: [55, '340 g', 21, e], ley: [62, '340 g', 21, e],
  }, { despensa: true }),
  A('cacahuate', 'Cacahuates naturales', 'grasa', 'g', 100, [567, 25.8, 16, 49], {
    bodega: [30, '200 g', 200, e], walmart: [32, '200 g', 200, e], ley: [36, '200 g', 200, e], oxxo: [18, '50 g', 50, e],
  }, { casera: [20, 'un puñito'], despensa: true }),

  // ---------- Oxxo ----------
  A('oikos_pro', 'Yogurt bebible Oikos Pro (220 ml)', 'oxxo', 'pza', 1, [135, 20, 11, 1.5], {
    oxxo: [41, 'botella', 1], walmart: [36, 'botella', 1, e], bodega: [35, 'botella', 1, e],
  }, { nota: 'Opción rápida con 20 g de proteína.' }),
  A('yogurt_oxxo', 'Yogurt griego sin azúcar (220 g)', 'oxxo', 'pza', 1, [130, 14, 13, 2.5], {
    oxxo: [20, 'vaso', 1], walmart: [18, 'vaso', 1, e], bodega: [17, 'vaso', 1, e],
  }),
  A('sandwich_oxxo', 'Sándwich de pavo', 'oxxo', 'pza', 1, [340, 17, 38, 13], {
    oxxo: [45, 'pieza', 1, e],
  }, { nota: 'Salvavidas si no llevaste comida; acompáñalo con agua, no con refresco.' }),
  A('energetica_sa', 'Bebida energética sin azúcar (473 ml)', 'oxxo', 'pza', 1, [10, 0, 2, 0], {
    oxxo: [42, 'lata', 1, e], walmart: [36, 'lata', 1, e], bodega: [35, 'lata', 1, e],
  }, { nota: 'Máximo una al día y antes del mediodía para que duermas bien.' }),
];

export const AL = Object.fromEntries(ALIMENTOS.map((a) => [a.id, a]));

const NOMBRE_UNIDAD = { g: 'g', ml: 'ml', pza: 'pza', lata: 'lata', cda: 'cda', cdita: 'cdita', reb: 'reb', scoop: 'scoop' };
export const unidadTexto = (u, n) => {
  if (u === 'lata') return n === 1 ? 'lata' : 'latas';
  if (u === 'reb') return n === 1 ? 'rebanada' : 'rebanadas';
  if (u === 'pza') return n === 1 ? 'pieza' : 'piezas';
  if (u === 'cda') return n === 1 ? 'cucharada' : 'cucharadas';
  if (u === 'cdita') return n === 1 ? 'cucharadita' : 'cucharaditas';
  if (u === 'scoop') return n === 1 ? 'scoop' : 'scoops';
  return NOMBRE_UNIDAD[u] || u;
};
