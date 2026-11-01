// Menús armados con comida de Guasave. Las cantidades base son para un día de ~2,000 kcal;
// la app ajusta tortillas, arroz, avena, fruta y grasas a tus calorías y deja fija la proteína.
// Ingrediente: [alimento, cantidad, rol]  rol: p = proteína (fija), v = verdura (fija), c = carbo (se ajusta), g = grasa (se ajusta)

const M = (id, tiempo, nombre, ingredientes, pasos, extra = {}) => ({ id, tiempo, nombre, ingredientes, pasos, ...extra });

export const TIEMPOS = [
  ['desayuno', 'Desayuno'],
  ['comida', 'Comida'],
  ['cena', 'Cena'],
  ['colacion', 'Colación'],
];

export const MENUS = [
  // ---------- Desayunos ----------
  M('d_mexicana', 'desayuno', 'Huevos a la mexicana con frijoles',
    [['huevo', 3, 'p'], ['tomate', 80, 'v'], ['cebolla', 30, 'v'], ['aceite', 1, 'g'], ['frijol', 120, 'c'], ['tortilla', 3, 'c']],
    'Pica tomate, cebolla y chile; sofríe con la cucharadita de aceite y agrega los huevos. Frijoles de la olla y tortillas calientes.', { barato: true }),
  M('d_avena', 'desayuno', 'Avena con leche, plátano y huevos cocidos',
    [['avena', 60, 'c'], ['leche', 250, 'p'], ['platano', 1, 'c'], ['huevo', 2, 'p']],
    'Cuece la avena con la leche y canela 5 minutos; agrega el plátano en rodajas. Los huevos cocidos los puedes dejar hechos desde la noche.', { barato: true }),
  M('d_licuado', 'desayuno', 'Licuado de avena, plátano y yogurt griego',
    [['leche', 250, 'p'], ['yogurt', 150, 'p'], ['platano', 1, 'c'], ['avena', 40, 'c'], ['crema_cacahuate', 1, 'g']],
    'Todo a la licuadora con hielo y canela. Ideal si sales corriendo al gym.'),
  M('d_sandwich', 'desayuno', 'Sándwich de huevo y panela con naranja',
    [['pan', 2, 'c'], ['huevo', 2, 'p'], ['panela', 40, 'p'], ['tomate', 50, 'v'], ['lechuga', 20, 'v'], ['naranja', 1, 'c']],
    'Huevo estrellado sin aceite (sartén antiadherente), panela, tomate y lechuga en pan integral tostado.'),
  M('d_chilaquiles', 'desayuno', 'Chilaquiles horneados con pollo',
    [['tostadas', 4, 'c'], ['tomatillo', 100, 'v'], ['pechuga', 100, 'p'], ['panela', 30, 'p'], ['frijol', 80, 'c']],
    'Salsa verde licuada y hervida; báñale las tostadas horneadas al final para que no se aguaden. Pollo deshebrado y panela encima.'),
  M('d_claras', 'desayuno', 'Claras con espinaca, tortillas y papaya',
    [['claras', 200, 'p'], ['huevo', 1, 'p'], ['espinaca', 60, 'v'], ['aceite', 1, 'g'], ['tortilla', 3, 'c'], ['papaya', 200, 'c']],
    'Revuelve claras y el huevo con la espinaca picada. Papaya de postre.'),
  M('d_machaca', 'desayuno', 'Machaca con huevo y tortillas',
    [['machaca', 25, 'p'], ['huevo', 2, 'p'], ['tomate', 60, 'v'], ['cebolla', 20, 'v'], ['aceite', 1, 'g'], ['tortilla', 3, 'c'], ['naranja', 1, 'c']],
    'Dora un poquito la machaca con cebolla y tomate, agrega los huevos. Clásico del norte con mucha proteína.'),

  // ---------- Comidas ----------
  M('c_pechuga', 'comida', 'Pechuga asada con arroz, frijoles y ensalada',
    [['pechuga', 180, 'p'], ['arroz', 150, 'c'], ['frijol', 100, 'c'], ['lechuga', 60, 'v'], ['tomate', 60, 'v'], ['pepino', 60, 'v'], ['aceite', 1, 'g'], ['tortilla', 2, 'c']],
    'Marina la pechuga con limón, ajo y sal. Asa en sartén o comal. Cocina arroz y frijoles para varios días.', { barato: true }),
  M('c_bistec', 'comida', 'Tacos de bistec con nopales',
    [['bistec', 160, 'p'], ['nopal', 100, 'v'], ['cebolla', 30, 'v'], ['tortilla', 4, 'c'], ['frijol', 80, 'c'], ['aceite', 1, 'g'], ['aguacate', 30, 'g']],
    'Bistec picado a la plancha con cebolla; nopales asados aparte. Salsa al gusto.'),
  M('c_picadillo', 'comida', 'Picadillo de res con papa y zanahoria',
    [['molida', 150, 'p'], ['papa', 120, 'c'], ['zanahoria', 60, 'v'], ['tomate', 80, 'v'], ['arroz', 120, 'c'], ['tortilla', 2, 'c']],
    'Dora la carne sin aceite, escurre la grasa, agrega verduras picadas y salsa de tomate. Rinde para 3 días.'),
  M('c_caldo', 'comida', 'Caldo de pollo con verduras',
    [['pechuga', 170, 'p'], ['papa', 100, 'c'], ['zanahoria', 60, 'v'], ['calabacita', 80, 'v'], ['arroz', 100, 'c'], ['tortilla', 3, 'c'], ['limon', 1, 'v']],
    'Hierve la pechuga con ajo y cebolla 20 minutos, agrega las verduras otros 15. Arroz aparte.'),
  M('c_ceviche', 'comida', 'Ceviche de atún con tostadas',
    [['atun', 2, 'p'], ['pepino', 80, 'v'], ['tomate', 80, 'v'], ['cebolla', 30, 'v'], ['limon', 2, 'v'], ['aguacate', 40, 'g'], ['tostadas', 5, 'c']],
    'Escurre el atún, mezcla con todo picado, limón, sal y chile. Fresco para el calor de Guasave.', { barato: true }),
  M('c_pescado', 'comida', 'Pescado a la plancha con papa y ensalada',
    [['basa', 200, 'p'], ['papa', 200, 'c'], ['lechuga', 60, 'v'], ['tomate', 60, 'v'], ['aceite', 2, 'g'], ['tortilla', 2, 'c']],
    'Filete con limón, ajo y pimienta a la plancha. Papa cocida o al horno con sal y paprika.'),
  M('c_pasta', 'comida', 'Pasta con atún y verduras',
    [['pasta', 90, 'c'], ['atun', 1.5, 'p'], ['brocoli', 100, 'v'], ['tomate', 80, 'v'], ['aceite', 1, 'g'], ['panela', 30, 'p']],
    'Cuece la pasta con el brócoli los últimos 3 minutos. Revuelve con atún, tomate y la cucharadita de aceite.'),
  M('c_frijoles_huevo', 'comida', 'Frijoles con huevo y nopales',
    [['huevo', 3, 'p'], ['frijol', 150, 'c'], ['nopal', 100, 'v'], ['tortilla', 4, 'c'], ['panela', 30, 'p']],
    'La opción más barata: huevos revueltos con nopales y frijoles de la olla.', { barato: true }),
  M('c_cerdo', 'comida', 'Cerdo en salsa verde con arroz y frijoles',
    [['cerdo', 160, 'p'], ['tomatillo', 100, 'v'], ['arroz', 120, 'c'], ['frijol', 80, 'c'], ['tortilla', 2, 'c']],
    'Cerdo en cubos dorado sin aceite y luego cocido en salsa verde 20 minutos.'),
  M('c_sardina', 'comida', 'Sardinas a la mexicana con arroz',
    [['sardina', 150, 'p'], ['tomate', 60, 'v'], ['cebolla', 30, 'v'], ['arroz', 150, 'c'], ['tortilla', 2, 'c'], ['lechuga', 50, 'v']],
    'Calienta las sardinas con su salsa, cebolla y chile. Con arroz y ensalada.', { barato: true }),

  // ---------- Cenas ----------
  M('n_tostadas_atun', 'cena', 'Tostadas de atún',
    [['atun', 1.5, 'p'], ['tostadas', 4, 'c'], ['pepino', 60, 'v'], ['tomate', 60, 'v'], ['aguacate', 30, 'g'], ['limon', 1, 'v']],
    'Atún con limón, pepino y tomate picado sobre tostadas horneadas.', { barato: true }),
  M('n_quesadillas', 'cena', 'Quesadillas de panela con pollo',
    [['tortilla', 4, 'c'], ['panela', 60, 'p'], ['pechuga', 80, 'p'], ['lechuga', 60, 'v'], ['tomate', 60, 'v']],
    'Quesadillas en comal sin aceite con pollo deshebrado; ensalada a un lado.'),
  M('n_omelette', 'cena', 'Omelette de claras con espinaca y pan',
    [['claras', 250, 'p'], ['huevo', 1, 'p'], ['espinaca', 60, 'v'], ['panela', 30, 'p'], ['pan', 2, 'c']],
    'Claras con el huevo, espinaca y panela en sartén antiadherente.'),
  M('n_yogurt', 'cena', 'Yogurt griego con fruta y avena',
    [['yogurt', 250, 'p'], ['manzana', 1, 'c'], ['avena', 30, 'c'], ['crema_cacahuate', 1, 'g']],
    'Sin cocinar: yogurt con manzana picada, avena y canela.'),
  M('n_tacos_pollo', 'cena', 'Tacos de pollo deshebrado',
    [['pechuga', 140, 'p'], ['tortilla', 4, 'c'], ['lechuga', 60, 'v'], ['tomate', 60, 'v'], ['aguacate', 30, 'g']],
    'Pollo cocido y deshebrado (puedes usar el del caldo) con salsa.'),
  M('n_ensalada', 'cena', 'Ensalada de pollo con papa',
    [['pechuga', 150, 'p'], ['papa', 150, 'c'], ['lechuga', 80, 'v'], ['tomate', 60, 'v'], ['pepino', 60, 'v'], ['aceite', 1, 'g']],
    'Pollo a la plancha en tiras, papa cocida en cubos, verdura y aderezo de limón con la cucharadita de aceite.'),
  M('n_molletes', 'cena', 'Molletes integrales con pico de gallo',
    [['pan', 3, 'c'], ['frijol', 100, 'c'], ['panela', 50, 'p'], ['tomate', 60, 'v'], ['cebolla', 20, 'v']],
    'Pan integral con frijoles y panela al horno o comal; pico de gallo encima.'),

  // ---------- Colaciones ----------
  M('s_yogurt', 'colacion', 'Yogurt griego con papaya',
    [['yogurt', 150, 'p'], ['papaya', 150, 'c']], 'Listo en un minuto.'),
  M('s_platano', 'colacion', 'Plátano con cacahuates',
    [['platano', 1, 'c'], ['cacahuate', 20, 'g']], 'Fácil de llevar a la escuela.', { barato: true }),
  M('s_huevos', 'colacion', 'Huevos cocidos con pepino',
    [['huevo', 2, 'p'], ['pepino', 100, 'v'], ['limon', 1, 'v']], 'Pepino con limón y chile en polvo.', { barato: true }),
  M('s_atun', 'colacion', 'Atún con tostadas',
    [['atun', 1, 'p'], ['tostadas', 2, 'c'], ['limon', 1, 'v']], 'Con salsa y limón.'),
  M('s_cottage', 'colacion', 'Cottage con manzana',
    [['cottage', 150, 'p'], ['manzana', 1, 'c']], 'Con canela queda bien.'),
  M('s_licuado', 'colacion', 'Licuado de proteína',
    [['proteina', 1, 'p'], ['leche', 250, 'p']], 'Solo si ya tienes proteína en polvo.', { auto: false }),
  M('s_oxxo', 'colacion', 'Combo Oxxo: yogurt griego y plátano',
    [['yogurt_oxxo', 1, 'p'], ['platano', 1, 'c']], 'Para cuando estás en la chamba.'),
];

export const MENU = Object.fromEntries(MENUS.map((m) => [m.id, m]));

// Reparto del día: qué parte de las calorías va en cada tiempo
export const REPARTO = { desayuno: 0.3, comida: 0.35, cena: 0.25, colacion: 0.1 };
