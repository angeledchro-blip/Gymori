// El camino: 5 fases de principiante a pro. Cada fase tiene su rotación de rutinas;
// la app siempre te pone la que sigue después de la última que hiciste (si faltas un día no se descuadra).
//
// Formato de cada ejercicio en una rutina:
//   { ej, series, reps: [min, max] }        → repeticiones
//   { ej, series, seg: [min, max] }         → por tiempo (plancha)
//   lado: true  → las reps son por lado
//   rir         → repeticiones que dejas en reserva (qué tan pesado)
//   desc        → descanso en segundos
//   alt         → ejercicios que lo pueden reemplazar si la máquina está ocupada

const X = (ej, series, rango, desc, rir, extra = {}) => ({ ej, series, reps: rango, desc, rir, ...extra });
const T = (ej, series, seg, desc, extra = {}) => ({ ej, series, seg, desc, rir: 2, ...extra });

export const FASES = [
  {
    id: 'f1', num: 1, nombre: 'Regreso', semanas: 'Semanas 1 a 3', dias: 3, diasDefault: [1, 3, 5],
    enfoque: 'Volver a agarrar el hábito y la técnica en máquinas, sin acabar muerto.',
    reglas: [
      '2 a 3 series por ejercicio de 12 a 15 repeticiones.',
      'Deja 3 repeticiones en reserva: termina cada serie sintiendo que podías hacer 3 más.',
      'Descansa de 60 a 90 segundos.',
      'Si un peso se siente fácil, súbelo la siguiente vez; no hay prisa.',
    ],
    cardio: '15 minutos de caminadora inclinada al terminar y 7,000 pasos al día.',
    pasos: 7000,
    requisito: { sesiones: 8, texto: 'Completa 8 entrenamientos (más o menos 3 semanas).' },
    rotacion: ['f1a', 'f1b'],
    descarga: 0,
  },
  {
    id: 'f2', num: 2, nombre: 'Principiante', semanas: 'Semanas 4 a 10', dias: 3, diasDefault: [1, 3, 5],
    enfoque: 'Subir de fuerza cada semana con doble progresión y empezar a usar mancuernas.',
    reglas: [
      '3 series de 8 a 12 repeticiones.',
      'Deja 1 o 2 repeticiones en reserva.',
      'Doble progresión: cuando hagas el máximo de reps en todas las series, sube el peso.',
      'Descansa de 90 segundos a 2 minutos en los ejercicios grandes.',
    ],
    cardio: '20 minutos de caminadora o bici al terminar, y 8,000 pasos al día.',
    pasos: 8000,
    requisito: { sesiones: 18, progresos: 4, texto: 'Completa 18 entrenamientos y mejora tu marca en al menos 4 ejercicios.' },
    rotacion: ['f2a', 'f2b', 'f2c'],
    descarga: 0,
  },
  {
    id: 'f3', num: 3, nombre: 'Intermedio', semanas: 'Semanas 11 a 20', dias: 4, diasDefault: [1, 2, 4, 5],
    enfoque: 'Torso y pierna 4 días. Aprendes los básicos con barra: sentadilla, banca, rumano y remo.',
    reglas: [
      'Ejercicios con barra: 3 a 4 series de 6 a 10, dejando 1 a 2 en reserva.',
      'Aislamiento: 10 a 15 repeticiones; la última serie puede llegar al fallo.',
      'Haz series de aproximación antes del primer ejercicio pesado.',
      'Cada 6 semanas toca semana de descarga: la mitad de series y 10 % menos de peso.',
    ],
    cardio: '25 minutos en zona 2 tres veces por semana y 9,000 pasos al día.',
    pasos: 9000,
    requisito: {
      sesiones: 32,
      marcas: [['sentadilla_barra', 1, 5], ['press_banca', 0.75, 5], ['rumano_barra', 1, 8]],
      minimoMarcas: 2,
      texto: 'Completa 32 entrenamientos y logra 2 de estas marcas (PC = tu peso corporal).',
    },
    rotacion: ['f3a', 'f3b', 'f3c', 'f3d'],
    descarga: 6,
  },
  {
    id: 'f4', num: 4, nombre: 'Avanzado', semanas: 'Semanas 21 a 36', dias: 5, diasDefault: [1, 2, 3, 5, 6],
    enfoque: 'Empuje, jalón y pierna más torso y pierna: 5 días con bloques de 4 semanas.',
    reglas: [
      'Bloques de 4 semanas: 3 subiendo cargas y 1 de descarga.',
      'Básicos pesados de 4 a 8 repeticiones; accesorios de 8 a 15.',
      'Técnicas de intensidad (drop set, rest-pause) solo en la última serie de aislamiento.',
      'Anota el RIR real: si todo te sale en RIR 0, baja un poco el peso.',
    ],
    cardio: '30 minutos en zona 2 tres veces por semana; un día opcional de intervalos (10 × 30 s fuerte).',
    pasos: 10000,
    requisito: {
      sesiones: 60,
      marcas: [['sentadilla_barra', 1.25, 5], ['press_banca', 1, 5], ['peso_muerto', 1.5, 5]],
      minimoMarcas: 2,
      texto: 'Completa 60 entrenamientos y logra 2 de estas marcas.',
    },
    rotacion: ['f4a', 'f4b', 'f4c', 'f4d', 'f4e'],
    descarga: 4,
  },
  {
    id: 'f5', num: 5, nombre: 'Pro', semanas: 'Semana 37 en adelante', dias: 6, diasDefault: [1, 2, 3, 4, 5, 6],
    enfoque: 'Empuje, jalón y pierna dos veces por semana: un día pesado y uno de volumen, con periodización por bloques.',
    reglas: [
      'Bloques de 8 semanas: 4 de acumulación, 3 de intensificación y 1 de descarga.',
      'Días pesados: 3 a 6 repeticiones con descansos de 3 minutos.',
      'Días de volumen: 8 a 15 repeticiones con descansos cortos.',
      'Al final de cada bloque estima tu 1RM y ajusta.',
    ],
    cardio: '30 a 40 minutos en zona 2 dos o tres veces por semana; 10,000 pasos.',
    pasos: 10000,
    requisito: {
      sesiones: 0,
      marcas: [['sentadilla_barra', 1.5, 1], ['press_banca', 1.25, 1], ['peso_muerto', 2, 1]],
      minimoMarcas: 3,
      texto: 'Metas de la fase pro (1 repetición estimada): sentadilla 1.5 × PC, banca 1.25 × PC y peso muerto 2 × PC.',
    },
    rotacion: ['f5a', 'f5b', 'f5c', 'f5d', 'f5e', 'f5f'],
    descarga: 8,
  },
];

export const RUTINAS = {
  // ---------- Fase 1: Regreso ----------
  f1a: {
    id: 'f1a', nombre: 'Cuerpo completo A', zona: 'full', min: 50,
    ejercicios: [
      X('prensa', 3, [12, 15], 90, 3, { alt: ['hack', 'sentadilla_goblet'] }),
      X('press_pecho_maquina', 3, [12, 15], 90, 3, { alt: ['lagartijas_inclinadas', 'press_inclinado'] }),
      X('jalon', 3, [12, 15], 90, 3, { alt: ['jalon_cerrado', 'dominadas_asistidas'] }),
      X('femoral_sentado', 2, [12, 15], 60, 3, { alt: ['femoral_acostado'] }),
      X('press_hombro_maquina', 2, [12, 15], 60, 3, { alt: ['press_hombro_mancuernas'] }),
      T('plancha', 3, [20, 30], 45),
    ],
    cardio: { ej: 'caminadora', min: 15 },
  },
  f1b: {
    id: 'f1b', nombre: 'Cuerpo completo B', zona: 'full', min: 50,
    ejercicios: [
      X('sentadilla_goblet', 3, [10, 12], 90, 3, { alt: ['prensa'] }),
      X('remo_polea', 3, [12, 15], 90, 3, { alt: ['remo_mancuerna'] }),
      X('press_inclinado', 3, [10, 12], 90, 3, { alt: ['press_pecho_maquina'] }),
      X('extension', 2, [12, 15], 60, 3),
      X('face_pull', 2, [15, 15], 60, 3, { alt: ['pajaros_maquina'] }),
      X('pantorrilla_pie', 2, [15, 15], 60, 3, { alt: ['pantorrilla_sentado'] }),
      X('dead_bug', 2, [8, 8], 45, 3, { lado: true }),
    ],
    cardio: { ej: 'bici', min: 15 },
  },

  // ---------- Fase 2: Principiante ----------
  f2a: {
    id: 'f2a', nombre: 'Cuerpo completo A', zona: 'full', min: 60,
    ejercicios: [
      X('sentadilla_goblet', 3, [8, 12], 120, 2, { alt: ['prensa', 'hack'] }),
      X('press_pecho_maquina', 3, [8, 12], 120, 2, { alt: ['press_inclinado'] }),
      X('remo_polea', 3, [10, 12], 90, 2, { alt: ['remo_mancuerna'] }),
      X('rumano_mancuernas', 3, [10, 12], 90, 2),
      X('laterales', 3, [12, 15], 60, 1),
      X('triceps_polea', 2, [10, 15], 60, 1, { alt: ['triceps_cuerda'] }),
      T('plancha', 3, [30, 45], 45),
    ],
    cardio: { ej: 'caminadora', min: 20 },
  },
  f2b: {
    id: 'f2b', nombre: 'Cuerpo completo B', zona: 'full', min: 60,
    ejercicios: [
      X('prensa', 3, [10, 12], 120, 2, { alt: ['hack'] }),
      X('jalon', 3, [8, 12], 90, 2, { alt: ['dominadas_asistidas'] }),
      X('press_inclinado', 3, [8, 12], 90, 2, { alt: ['press_pecho_maquina'] }),
      X('femoral_sentado', 3, [10, 15], 60, 1, { alt: ['femoral_acostado'] }),
      X('remo_mancuerna', 3, [10, 12], 90, 2, { alt: ['remo_polea'] }),
      X('curl_mancuernas', 2, [10, 15], 60, 1, { alt: ['curl_martillo'] }),
      X('crunch_polea', 3, [12, 15], 45, 1, { alt: ['crunch_maquina'] }),
    ],
    cardio: { ej: 'bici', min: 20 },
  },
  f2c: {
    id: 'f2c', nombre: 'Cuerpo completo C', zona: 'full', min: 60,
    ejercicios: [
      X('zancadas', 3, [10, 10], 90, 2, { lado: true, alt: ['bulgara', 'step_up'] }),
      X('press_hombro_mancuernas', 3, [8, 12], 90, 2, { alt: ['press_hombro_maquina'] }),
      X('jalon_cerrado', 3, [10, 12], 90, 2, { alt: ['jalon'] }),
      X('hip_thrust', 3, [10, 12], 90, 2, { alt: ['puente_barra'] }),
      X('aperturas', 2, [12, 15], 60, 1, { alt: ['cruces_polea'] }),
      X('face_pull', 2, [15, 15], 60, 1),
      X('pantorrilla_sentado', 3, [12, 15], 45, 1, { alt: ['pantorrilla_pie'] }),
      X('pallof', 2, [10, 10], 45, 2, { lado: true }),
    ],
    cardio: { ej: 'caminadora', min: 20 },
  },

  // ---------- Fase 3: Intermedio (torso / pierna) ----------
  f3a: {
    id: 'f3a', nombre: 'Torso A', zona: 'torso', min: 70,
    ejercicios: [
      X('press_banca', 4, [6, 8], 150, 2, { alt: ['press_pecho_maquina'] }),
      X('remo_barra', 4, [6, 10], 120, 2, { alt: ['remo_t', 'remo_polea'] }),
      X('press_hombro_mancuernas', 3, [8, 10], 90, 2),
      X('jalon', 3, [8, 12], 90, 1),
      X('laterales', 3, [12, 15], 60, 1),
      X('curl_barra_ez', 2, [10, 12], 60, 1, { alt: ['curl_mancuernas'] }),
      X('triceps_polea', 2, [10, 12], 60, 1, { alt: ['triceps_cuerda'] }),
    ],
    cardio: null,
  },
  f3b: {
    id: 'f3b', nombre: 'Pierna A', zona: 'pierna', min: 70,
    ejercicios: [
      X('sentadilla_barra', 4, [6, 8], 180, 2, { alt: ['hack', 'prensa'] }),
      X('rumano_barra', 3, [8, 10], 120, 2, { alt: ['rumano_mancuernas'] }),
      X('prensa', 3, [10, 12], 90, 1),
      X('femoral_acostado', 3, [10, 12], 60, 1, { alt: ['femoral_sentado'] }),
      X('pantorrilla_pie', 4, [10, 15], 45, 1),
      T('plancha_lateral', 3, [30, 30], 30, { lado: true }),
    ],
    cardio: { ej: 'bici', min: 25 },
  },
  f3c: {
    id: 'f3c', nombre: 'Torso B', zona: 'torso', min: 70,
    ejercicios: [
      X('press_inclinado', 4, [8, 10], 120, 2),
      X('dominadas_asistidas', 4, [6, 10], 120, 2, { alt: ['dominadas', 'jalon_cerrado'] }),
      X('remo_mancuerna', 3, [8, 12], 90, 2),
      X('cruces_polea', 3, [12, 15], 60, 1, { alt: ['aperturas'] }),
      X('pajaros_maquina', 3, [12, 15], 60, 1, { alt: ['face_pull'] }),
      X('curl_martillo', 3, [10, 12], 60, 1),
      X('triceps_tras_nuca', 3, [10, 12], 60, 1),
    ],
    cardio: null,
  },
  f3d: {
    id: 'f3d', nombre: 'Pierna B', zona: 'pierna', min: 70,
    ejercicios: [
      X('hip_thrust', 4, [8, 10], 120, 2),
      X('hack', 3, [8, 10], 120, 2, { alt: ['sentadilla_goblet', 'prensa'] }),
      X('bulgara', 3, [8, 10], 90, 2, { lado: true }),
      X('extension', 3, [12, 15], 60, 1),
      X('femoral_sentado', 3, [10, 12], 60, 1),
      X('pantorrilla_sentado', 3, [12, 15], 45, 1),
      X('crunch_polea', 3, [12, 15], 45, 1),
    ],
    cardio: { ej: 'caminadora', min: 25 },
  },

  // ---------- Fase 4: Avanzado (PPL + torso/pierna) ----------
  f4a: {
    id: 'f4a', nombre: 'Empuje', zona: 'torso', min: 75,
    ejercicios: [
      X('press_banca', 4, [5, 8], 180, 2),
      X('press_inclinado', 3, [8, 10], 120, 2),
      X('press_hombro_mancuernas', 3, [8, 10], 90, 2),
      X('laterales', 4, [12, 20], 45, 1),
      X('cruces_polea', 3, [12, 15], 60, 1),
      X('triceps_polea', 3, [10, 12], 60, 1),
      X('fondos', 2, [6, 12], 90, 1, { alt: ['fondos_maquina'] }),
    ],
    cardio: null,
  },
  f4b: {
    id: 'f4b', nombre: 'Jalón', zona: 'torso', min: 75,
    ejercicios: [
      X('peso_muerto', 3, [4, 6], 180, 2, { alt: ['rumano_barra'] }),
      X('dominadas', 4, [6, 10], 120, 2, { alt: ['dominadas_asistidas', 'jalon'] }),
      X('remo_barra', 3, [8, 10], 120, 2),
      X('remo_polea', 3, [10, 12], 90, 1),
      X('face_pull', 3, [15, 15], 60, 1),
      X('curl_barra_ez', 3, [8, 12], 60, 1),
      X('curl_martillo', 2, [10, 12], 60, 1),
    ],
    cardio: { ej: 'caminadora', min: 30 },
  },
  f4c: {
    id: 'f4c', nombre: 'Pierna', zona: 'pierna', min: 75,
    ejercicios: [
      X('sentadilla_barra', 4, [5, 8], 180, 2),
      X('rumano_barra', 3, [8, 10], 120, 2),
      X('prensa', 3, [10, 15], 90, 1),
      X('femoral_acostado', 3, [10, 12], 60, 1),
      X('extension', 2, [12, 15], 60, 0),
      X('pantorrilla_pie', 4, [10, 15], 45, 1),
    ],
    cardio: null,
  },
  f4d: {
    id: 'f4d', nombre: 'Torso', zona: 'torso', min: 70,
    ejercicios: [
      X('press_militar', 4, [6, 8], 150, 2, { alt: ['press_hombro_mancuernas'] }),
      X('jalon', 3, [8, 12], 90, 1),
      X('press_inclinado', 3, [8, 12], 90, 2),
      X('remo_mancuerna', 3, [10, 12], 90, 1),
      X('pajaros_maquina', 3, [15, 15], 45, 1),
      X('curl_mancuernas', 3, [12, 12], 45, 1),
      X('triceps_cuerda', 3, [12, 12], 45, 1),
    ],
    cardio: { ej: 'bici', min: 30 },
  },
  f4e: {
    id: 'f4e', nombre: 'Pierna y glúteo', zona: 'pierna', min: 70,
    ejercicios: [
      X('hack', 4, [8, 10], 150, 2, { alt: ['prensa'] }),
      X('hip_thrust', 3, [8, 12], 120, 2),
      X('bulgara', 3, [10, 10], 90, 1, { lado: true }),
      X('femoral_sentado', 3, [12, 12], 60, 1),
      X('pantorrilla_sentado', 3, [15, 15], 45, 1),
      X('elevacion_piernas', 3, [10, 15], 45, 1, { alt: ['elevacion_piernas_banco'] }),
    ],
    cardio: { ej: 'caminadora', min: 30 },
  },

  // ---------- Fase 5: Pro (PPL x2) ----------
  f5a: {
    id: 'f5a', nombre: 'Empuje pesado', zona: 'torso', min: 80,
    ejercicios: [
      X('press_banca', 5, [3, 5], 180, 1),
      X('press_militar', 4, [5, 6], 150, 1),
      X('fondos', 3, [6, 8], 120, 1, { alt: ['fondos_maquina'] }),
      X('laterales', 4, [12, 15], 45, 1),
      X('press_frances', 3, [8, 10], 90, 1),
    ],
    cardio: null,
  },
  f5b: {
    id: 'f5b', nombre: 'Jalón pesado', zona: 'torso', min: 80,
    ejercicios: [
      X('peso_muerto', 4, [3, 5], 210, 1),
      X('dominadas', 4, [5, 8], 150, 1),
      X('remo_barra', 4, [6, 8], 120, 1),
      X('face_pull', 3, [15, 15], 45, 1),
      X('curl_barra_ez', 3, [6, 8], 90, 1),
    ],
    cardio: null,
  },
  f5c: {
    id: 'f5c', nombre: 'Pierna pesada', zona: 'pierna', min: 80,
    ejercicios: [
      X('sentadilla_barra', 5, [3, 5], 210, 1),
      X('rumano_barra', 4, [6, 8], 150, 1),
      X('prensa', 3, [8, 10], 120, 1),
      X('femoral_acostado', 3, [8, 10], 90, 1),
      X('pantorrilla_pie', 4, [8, 12], 60, 1),
    ],
    cardio: { ej: 'bici', min: 30 },
  },
  f5d: {
    id: 'f5d', nombre: 'Empuje volumen', zona: 'torso', min: 70,
    ejercicios: [
      X('press_inclinado', 4, [8, 12], 90, 1),
      X('press_pecho_maquina', 3, [10, 12], 90, 1),
      X('cruces_polea', 3, [12, 15], 60, 0),
      X('laterales', 5, [15, 20], 45, 0),
      X('triceps_tras_nuca', 3, [12, 15], 60, 1),
      X('triceps_polea', 2, [15, 15], 45, 0),
    ],
    cardio: null,
  },
  f5e: {
    id: 'f5e', nombre: 'Jalón volumen', zona: 'torso', min: 70,
    ejercicios: [
      X('jalon', 4, [10, 12], 90, 1),
      X('remo_polea', 4, [10, 12], 90, 1),
      X('remo_mancuerna', 3, [10, 12], 90, 1),
      X('pajaros_maquina', 4, [15, 20], 45, 0),
      X('curl_mancuernas', 3, [10, 12], 60, 1),
      X('curl_martillo', 3, [12, 12], 60, 0),
      X('encogimientos', 3, [12, 15], 60, 1),
    ],
    cardio: { ej: 'caminadora', min: 30 },
  },
  f5f: {
    id: 'f5f', nombre: 'Pierna volumen', zona: 'pierna', min: 75,
    ejercicios: [
      X('hack', 4, [10, 12], 120, 1),
      X('bulgara', 3, [10, 12], 90, 1, { lado: true }),
      X('hip_thrust', 4, [10, 12], 90, 1),
      X('extension', 3, [15, 15], 60, 0),
      X('femoral_sentado', 3, [12, 15], 60, 0),
      X('pantorrilla_sentado', 4, [15, 15], 45, 0),
      X('crunch_polea', 3, [15, 15], 45, 1),
    ],
    cardio: null,
  },
};

// Calentamiento: 5–8 min de cardio suave + movilidad según lo que toca.
export const CALENTAMIENTOS = {
  full: {
    general: '5 a 8 minutos de caminadora o bici suave, hasta que empieces a sudar tantito.',
    movs: [
      ['sentadilla_libre', '10 repeticiones'],
      ['circulos_brazos', '10 adelante y 10 atrás'],
      ['puente_gluteo', '10 repeticiones'],
      ['gato_camello', '6 repeticiones'],
      ['inchworm', '4 repeticiones'],
    ],
  },
  pierna: {
    general: '5 a 8 minutos de bici o caminadora suave.',
    movs: [
      ['circulos_cadera', '10 por lado'],
      ['sentadilla_libre', '12 repeticiones'],
      ['puente_gluteo', '12 repeticiones'],
      ['desplante_caminando', '6 por pierna'],
      ['gran_estiramiento', '3 por lado'],
    ],
  },
  torso: {
    general: '5 minutos de elíptica o remo suave.',
    movs: [
      ['circulos_brazos', '10 adelante y 10 atrás'],
      ['band_pull_apart', '15 repeticiones'],
      ['gato_camello', '8 repeticiones'],
      ['lagartijas_inclinadas', '8 repeticiones'],
      ['pecho_dinamico', '10 repeticiones'],
    ],
  },
};

export const ENFRIAMIENTO = {
  full: [['est_cuadriceps', '30 s por lado'], ['est_isquios', '30 s por lado'], ['est_pecho', '30 s por lado'], ['est_nino', '45 s'], ['est_gluteo', '30 s por lado']],
  pierna: [['est_cuadriceps', '30 s por lado'], ['est_isquios', '30 s por lado'], ['est_flexor', '30 s por lado'], ['est_gluteo', '30 s por lado'], ['est_pantorrilla', '30 s por lado']],
  torso: [['est_pecho', '30 s por lado'], ['est_hombro', '30 s por lado'], ['est_espalda_alta', '30 s'], ['est_triceps', '30 s por lado'], ['est_nino', '45 s']],
};

export const FASE = Object.fromEntries(FASES.map((f) => [f.id, f]));
