// El camino: 5 fases armadas sobre tu rutina de lunes a viernes
// (jalón, pierna cuádriceps, empuje, hombro y torso, pierna posterior).
// Cada fase tiene su rotación de rutinas; la app te pone la que sigue después de la última que hiciste
// (si faltas un día no se descuadra) y la primera de cada fase es la que le toca al día de la semana.
// Sin sentadilla búlgara en ningún lado.
//
// Formato de cada ejercicio en una rutina:
//   { ej, series, reps: [min, max] }        → repeticiones
//   { ej, series, seg: [min, max] }         → por tiempo (plancha)
//   lado: true  → las reps son por lado
//   rir         → repeticiones que dejas en reserva (qué tan pesado)
//   desc        → descanso en segundos
//   alt         → ejercicios que lo pueden reemplazar si la máquina está ocupada
//   nota        → indicación que sale en el entreno (técnica de los básicos)

const X = (ej, series, rango, desc, rir, extra = {}) => ({ ej, series, reps: rango, desc, rir, ...extra });
const T = (ej, series, seg, desc, extra = {}) => ({ ej, series, seg, desc, rir: 2, ...extra });

const LV = [1, 2, 3, 4, 5];

const NOTA = {
  sentadillaTec: 'Fase de técnica: barra vacía o ligera. Rodillas siguiendo la punta del pie y espalda neutra; baja hasta donde la mantengas recta. Sube 2.5 a 5 kg solo si todas salieron limpias.',
  rumanoTec: 'Fase de técnica: ligero. Barra pegada a las piernas, espalda baja recta y cadera hacia atrás; baja hasta sentir el estirón en los isquios.',
  bancaTec: 'Fase de técnica: un peso con el que hagas 8 limpias dejando 3 en reserva. Omóplatos juntos, pies firmes y baja controlado al pecho.',
  remo: 'Pecho pegado al cojín todo el tiempo: así la espalda baja no carga nada. Codos hacia atrás, sin encoger los hombros, y controla el regreso.',
  sentadilla: 'Pesado: rodillas siguiendo la punta del pie y espalda neutra. Descansa 3 minutos; si una repetición sale fea, ahí termina la serie.',
  rumano: 'Pesado: barra pegada a las piernas y espalda baja recta. Descansa 3 minutos entre series.',
  banca: 'Pesado: omóplatos juntos y pies firmes. Descansa 3 minutos; si entrenas solo, pon los seguros del rack o pide que te asistan.',
  muerto: 'Barra sobre la mitad del pie, espalda neutra y empuja el piso. Si te molesta la espalda baja, cámbialo por rumano.',
  militar: 'De pie, glúteos y abdomen apretados; mete la cabeza cuando la barra pase la frente.',
};

export const FASES = [
  {
    id: 'f1', num: 1, nombre: 'Técnica', semanas: 'Semanas 1 a 4', dias: 5, diasDefault: LV,
    enfoque: 'Tu rutina de lunes a viernes con un básico al inicio de cada día (remo con apoyo de pecho, sentadilla, banca y rumano) para aprender la técnica con poco peso.',
    reglas: [
      'Básicos: 3 series de 8 con barra vacía o ligera, dejando 3 en reserva. Solo subes peso si todas salieron con técnica limpia.',
      'Máquinas: 3 series de 10 a 12 dejando 2 en reserva; cuando hagas 12 en todas, sube el peso.',
      'Descansa 2 a 3 minutos en los básicos y de 60 a 90 segundos en lo demás.',
      'Grábate de lado en la sentadilla y el rumano de vez en cuando para revisar la técnica.',
    ],
    cardio: '15 minutos de caminadora inclinada al terminar lunes, miércoles y jueves, y 8,000 pasos al día.',
    pasos: 8000,
    requisito: { sesiones: 16, progresos: 4, texto: 'Completa 16 entrenamientos (unas 4 semanas) y mejora en al menos 4 ejercicios.' },
    rotacion: ['f1a', 'f1b', 'f1c', 'f1d', 'f1e'],
    descarga: 0,
  },
  {
    id: 'f2', num: 2, nombre: 'Fuerza e hipertrofia', semanas: 'Semanas 5 a 14', dias: 5, diasDefault: LV,
    enfoque: 'Los básicos pasan a 4 series de 4 a 6 pesadas y las máquinas quedan como bloque de hipertrofia. Pecho, espalda y pierna se trabajan 2 veces por semana.',
    reglas: [
      'Básicos: 4 series de 4 a 6 dejando 2 en reserva. Cuando hagas 6 en todas, sube 2.5 a 5 kg.',
      'Máquinas: 3 series de 8 a 12 (12 a 15 en aislamiento) dejando 1 o 2 en reserva.',
      'Antes del básico, 1 o 2 series de calentamiento; descansa 3 minutos entre series pesadas.',
      'Cada 6 semanas toca semana de descarga: la mitad de series y 10 % menos de peso.',
    ],
    cardio: '15 a 20 minutos de caminadora inclinada lunes, miércoles y jueves, y 9,000 pasos al día.',
    pasos: 9000,
    requisito: {
      sesiones: 40,
      marcas: [['sentadilla_barra', 1, 5], ['press_banca', 0.75, 5], ['rumano_barra', 1, 6]],
      minimoMarcas: 2,
      texto: 'Completa 40 entrenamientos y logra 2 de estas marcas (PC = tu peso corporal).',
    },
    rotacion: ['f2a', 'f2b', 'f2c', 'f2d', 'f2e'],
    descarga: 6,
  },
  {
    id: 'f3', num: 3, nombre: 'Intermedio', semanas: 'Semanas 15 a 26', dias: 5, diasDefault: LV,
    enfoque: 'Más fuerza: básicos de 3 a 5 repeticiones, dominadas, fondos, press militar con barra y peso muerto convencional.',
    reglas: [
      'Básicos: 5 series de 3 a 5 dejando 1 o 2 en reserva.',
      'Segundo ejercicio de cada día: 3 series de 6 a 8 pesadas.',
      'Aislamiento: 12 a 15 repeticiones dejando 1 en reserva.',
      'Cada 6 semanas, semana de descarga.',
    ],
    cardio: '20 minutos en zona 2 tres veces por semana y 10,000 pasos al día.',
    pasos: 10000,
    requisito: {
      sesiones: 50,
      marcas: [['sentadilla_barra', 1.25, 5], ['press_banca', 1, 5], ['peso_muerto', 1.5, 5]],
      minimoMarcas: 2,
      texto: 'Completa 50 entrenamientos y logra 2 de estas marcas.',
    },
    rotacion: ['f3a', 'f3b', 'f3c', 'f3d', 'f3e'],
    descarga: 6,
  },
  {
    id: 'f4', num: 4, nombre: 'Avanzado', semanas: 'Semanas 27 a 40', dias: 5, diasDefault: LV,
    enfoque: 'Bloques de 4 semanas (3 subiendo cargas y 1 de descarga), dominadas y fondos con peso, y más volumen en máquinas.',
    reglas: [
      'Bloques de 4 semanas: 3 subiendo cargas y 1 de descarga.',
      'Básicos de 3 a 5 repeticiones; accesorios de 6 a 12.',
      'Drop set o rest-pause solo en la última serie de máquinas y poleas.',
      'Anota el RIR real: si todo te sale en RIR 0, baja un poco el peso.',
    ],
    cardio: '20 a 30 minutos en zona 2 tres veces por semana; 10,000 pasos.',
    pasos: 10000,
    requisito: {
      sesiones: 60,
      marcas: [['sentadilla_barra', 1.5, 1], ['press_banca', 1.25, 1], ['peso_muerto', 2, 1]],
      minimoMarcas: 2,
      texto: 'Completa 60 entrenamientos y logra 2 de estas marcas (1 repetición estimada).',
    },
    rotacion: ['f4a', 'f4b', 'f4c', 'f4d', 'f4e'],
    descarga: 4,
  },
  {
    id: 'f5', num: 5, nombre: 'Pro', semanas: 'Semana 41 en adelante', dias: 5, diasDefault: LV,
    enfoque: 'Cada día alterna una semana pesada y una de volumen, con periodización por bloques.',
    reglas: [
      'Semana pesada: básicos de 2 a 4 repeticiones con 3 a 4 minutos de descanso.',
      'Semana de volumen: 8 a 15 repeticiones con descansos cortos.',
      'Bloques de 8 semanas: la octava es de descarga.',
      'Al final de cada bloque revisa tu 1 repetición estimada y ajusta los pesos.',
    ],
    cardio: '30 minutos en zona 2 dos o tres veces por semana; 10,000 pasos.',
    pasos: 10000,
    requisito: {
      sesiones: 0,
      marcas: [['sentadilla_barra', 1.75, 1], ['press_banca', 1.4, 1], ['peso_muerto', 2.25, 1]],
      minimoMarcas: 3,
      texto: 'Metas de la fase pro (1 repetición estimada): sentadilla 1.75 × PC, banca 1.4 × PC y peso muerto 2.25 × PC.',
    },
    rotacion: ['f5a', 'f5b', 'f5c', 'f5d', 'f5e', 'f5f', 'f5g', 'f5h', 'f5i', 'f5j'],
    descarga: 8,
  },
];

const JALON = 'Jalón: espalda y bíceps';
const CUAD = 'Pierna: cuádriceps';
const EMPUJE = 'Empuje: pecho y tríceps';
const HOMBRO = 'Hombro y torso';
const POST = 'Pierna: isquios y glúteo';

export const RUTINAS = {
  // ---------- Fase 1: Técnica ----------
  f1a: {
    id: 'f1a', nombre: JALON, zona: 'torso', min: 60,
    ejercicios: [
      X('remo_pecho', 3, [8, 8], 150, 3, { alt: ['remo_polea', 'remo_mancuerna'], nota: NOTA.remo }),
      X('jalon_supino', 3, [10, 12], 90, 2, { alt: ['jalon', 'jalon_cerrado'] }),
      X('remo_polea', 3, [10, 12], 90, 2, { alt: ['remo_mancuerna'] }),
      X('face_pull', 2, [12, 15], 60, 2, { alt: ['pajaros_maquina'] }),
      X('curl_barra_ez', 3, [10, 12], 60, 2, { alt: ['curl_mancuernas', 'curl_predicador'] }),
      X('curl_inclinado', 2, [10, 12], 60, 2, { alt: ['curl_mancuernas'] }),
      X('curl_muneca', 2, [12, 15], 45, 2, { lado: true }),
      X('curl_muneca_inv', 2, [12, 15], 45, 2),
    ],
    cardio: { ej: 'caminadora', min: 15 },
  },
  f1b: {
    id: 'f1b', nombre: CUAD, zona: 'pierna', min: 60,
    ejercicios: [
      X('sentadilla_barra', 3, [8, 8], 150, 3, { alt: ['sentadilla_goblet'], nota: NOTA.sentadillaTec }),
      X('pendulo', 3, [10, 12], 120, 2, { alt: ['hack', 'prensa'] }),
      X('prensa', 2, [10, 12], 120, 2, { alt: ['hack'] }),
      X('extension', 3, [12, 15], 60, 2),
      X('femoral_sentado', 2, [10, 12], 60, 2, { alt: ['femoral_acostado'] }),
      X('pantorrilla_pie', 3, [12, 15], 60, 2, { alt: ['pantorrilla_prensa', 'pantorrilla_sentado'] }),
      X('crunch_polea', 3, [12, 15], 45, 2, { alt: ['crunch_maquina'] }),
    ],
    cardio: null,
  },
  f1c: {
    id: 'f1c', nombre: EMPUJE, zona: 'torso', min: 55,
    ejercicios: [
      X('press_banca', 3, [8, 8], 150, 3, { alt: ['press_pecho_maquina'], nota: NOTA.bancaTec }),
      X('press_inclinado', 3, [10, 12], 90, 2, { alt: ['press_inclinado_maquina'] }),
      X('aperturas', 3, [12, 15], 60, 2, { alt: ['cruces_polea'] }),
      X('laterales', 3, [12, 15], 60, 2, { alt: ['laterales_polea'] }),
      X('triceps_barra_v', 3, [10, 12], 60, 2, { alt: ['triceps_polea', 'triceps_cuerda'] }),
      X('triceps_unilateral', 2, [12, 15], 45, 2, { lado: true, alt: ['triceps_cuerda'] }),
      T('plancha', 2, [30, 45], 45),
    ],
    cardio: { ej: 'caminadora', min: 15 },
  },
  f1d: {
    id: 'f1d', nombre: HOMBRO, zona: 'torso', min: 60,
    ejercicios: [
      X('press_hombro_maquina', 3, [8, 10], 120, 2, { alt: ['press_hombro_mancuernas'] }),
      X('laterales_polea', 3, [12, 15], 45, 2, { lado: true, alt: ['laterales'] }),
      X('press_inclinado_maquina', 3, [10, 12], 90, 2, { alt: ['press_inclinado', 'press_pecho_maquina'] }),
      X('jalon_cerrado', 3, [10, 12], 90, 2, { alt: ['jalon', 'jalon_supino'] }),
      X('pajaros_maquina', 3, [12, 15], 60, 2, { alt: ['face_pull'] }),
      X('face_pull', 2, [12, 15], 60, 2),
      X('curl_muneca', 1, [12, 15], 45, 2, { lado: true }),
      X('curl_muneca_inv', 1, [12, 15], 45, 2),
    ],
    cardio: { ej: 'caminadora', min: 15 },
  },
  f1e: {
    id: 'f1e', nombre: POST, zona: 'pierna', min: 60,
    ejercicios: [
      X('rumano_barra', 3, [8, 8], 150, 3, { alt: ['rumano_mancuernas'], nota: NOTA.rumanoTec }),
      X('hip_thrust', 3, [10, 12], 90, 2, { alt: ['puente_barra'] }),
      X('femoral_acostado', 3, [10, 12], 60, 2, { alt: ['femoral_sentado'] }),
      X('femoral_pie', 2, [10, 12], 60, 2, { lado: true, alt: ['femoral_sentado'] }),
      X('prensa_alta', 3, [10, 12], 120, 2, { alt: ['prensa'] }),
      X('abductor', 3, [12, 15], 60, 2),
      X('pantorrilla_sentado', 3, [12, 15], 45, 2, { alt: ['pantorrilla_prensa'] }),
    ],
    cardio: null,
  },

  // ---------- Fase 2: Fuerza e hipertrofia ----------
  f2a: {
    id: 'f2a', nombre: JALON, zona: 'torso', min: 65,
    ejercicios: [
      X('remo_pecho', 4, [5, 6], 180, 2, { alt: ['remo_polea', 'remo_mancuerna'], nota: NOTA.remo }),
      X('jalon_supino', 3, [8, 12], 120, 2, { alt: ['jalon', 'jalon_cerrado'] }),
      X('remo_polea', 3, [10, 12], 90, 1, { alt: ['remo_mancuerna'] }),
      X('face_pull', 2, [12, 15], 60, 1, { alt: ['pajaros_maquina'] }),
      X('curl_barra_ez', 3, [8, 12], 90, 1, { alt: ['curl_mancuernas', 'curl_predicador'] }),
      X('curl_inclinado', 2, [10, 12], 60, 1, { alt: ['curl_mancuernas'] }),
      X('curl_muneca', 2, [12, 15], 45, 1, { lado: true }),
      X('curl_muneca_inv', 2, [12, 15], 45, 1),
    ],
    cardio: { ej: 'caminadora', min: 15 },
  },
  f2b: {
    id: 'f2b', nombre: CUAD, zona: 'pierna', min: 65,
    ejercicios: [
      X('sentadilla_barra', 4, [4, 6], 180, 2, { alt: ['hack', 'sentadilla_goblet'], nota: NOTA.sentadilla }),
      X('pendulo', 3, [8, 10], 120, 2, { alt: ['hack', 'prensa'] }),
      X('prensa', 2, [10, 12], 120, 1, { alt: ['hack'] }),
      X('extension', 3, [12, 15], 60, 1),
      X('femoral_sentado', 2, [10, 12], 60, 1, { alt: ['femoral_acostado'] }),
      X('pantorrilla_pie', 3, [10, 15], 60, 1, { alt: ['pantorrilla_prensa', 'pantorrilla_sentado'] }),
      X('crunch_polea', 3, [12, 15], 45, 1, { alt: ['crunch_maquina'] }),
    ],
    cardio: null,
  },
  f2c: {
    id: 'f2c', nombre: EMPUJE, zona: 'torso', min: 60,
    ejercicios: [
      X('press_banca', 4, [4, 6], 180, 2, { alt: ['press_pecho_maquina'], nota: NOTA.banca }),
      X('press_inclinado', 3, [8, 10], 120, 2, { alt: ['press_inclinado_maquina'] }),
      X('aperturas', 3, [12, 15], 60, 1, { alt: ['cruces_polea'] }),
      X('laterales', 3, [12, 15], 60, 1, { alt: ['laterales_polea'] }),
      X('triceps_barra_v', 3, [8, 12], 90, 1, { alt: ['triceps_polea', 'triceps_cuerda'] }),
      X('triceps_unilateral', 2, [12, 15], 45, 1, { lado: true, alt: ['triceps_cuerda'] }),
      T('plancha', 2, [30, 45], 45),
    ],
    cardio: { ej: 'caminadora', min: 15 },
  },
  f2d: {
    id: 'f2d', nombre: HOMBRO, zona: 'torso', min: 65,
    ejercicios: [
      X('press_hombro_maquina', 4, [6, 8], 150, 2, { alt: ['press_hombro_mancuernas'] }),
      X('laterales_polea', 4, [12, 15], 45, 1, { lado: true, alt: ['laterales'] }),
      X('press_inclinado_maquina', 3, [8, 12], 90, 1, { alt: ['press_inclinado', 'press_pecho_maquina'] }),
      X('jalon_cerrado', 3, [10, 12], 90, 1, { alt: ['jalon', 'jalon_supino'] }),
      X('pajaros_maquina', 3, [12, 15], 60, 1, { alt: ['face_pull'] }),
      X('face_pull', 2, [12, 15], 60, 1),
      X('curl_muneca', 1, [12, 15], 45, 1, { lado: true }),
      X('curl_muneca_inv', 1, [12, 15], 45, 1),
    ],
    cardio: { ej: 'caminadora', min: 15 },
  },
  f2e: {
    id: 'f2e', nombre: POST, zona: 'pierna', min: 65,
    ejercicios: [
      X('rumano_barra', 4, [5, 6], 180, 2, { alt: ['rumano_mancuernas'], nota: NOTA.rumano }),
      X('hip_thrust', 3, [8, 10], 120, 2, { alt: ['puente_barra'] }),
      X('femoral_acostado', 3, [8, 12], 90, 1, { alt: ['femoral_sentado'] }),
      X('femoral_pie', 2, [10, 12], 60, 1, { lado: true, alt: ['femoral_sentado'] }),
      X('prensa_alta', 3, [10, 12], 120, 1, { alt: ['prensa'] }),
      X('abductor', 3, [12, 15], 60, 1),
      X('pantorrilla_sentado', 3, [12, 15], 45, 1, { alt: ['pantorrilla_prensa'] }),
    ],
    cardio: null,
  },

  // ---------- Fase 3: Intermedio ----------
  f3a: {
    id: 'f3a', nombre: JALON, zona: 'torso', min: 70,
    ejercicios: [
      X('remo_pecho', 5, [4, 6], 180, 2, { alt: ['remo_polea'], nota: NOTA.remo }),
      X('dominadas', 3, [6, 8], 150, 2, { alt: ['dominadas_asistidas', 'jalon_supino'] }),
      X('remo_polea', 3, [8, 10], 90, 1, { alt: ['remo_mancuerna'] }),
      X('face_pull', 3, [12, 15], 60, 1),
      X('curl_barra_ez', 3, [6, 8], 90, 1, { alt: ['curl_mancuernas'] }),
      X('curl_inclinado', 2, [10, 12], 60, 1),
      X('curl_muneca', 2, [12, 15], 45, 1, { lado: true }),
      X('curl_muneca_inv', 2, [12, 15], 45, 1),
    ],
    cardio: { ej: 'caminadora', min: 20 },
  },
  f3b: {
    id: 'f3b', nombre: CUAD, zona: 'pierna', min: 70,
    ejercicios: [
      X('sentadilla_barra', 5, [3, 5], 210, 2, { alt: ['hack'], nota: NOTA.sentadilla }),
      X('pendulo', 3, [6, 8], 150, 2, { alt: ['hack', 'prensa'] }),
      X('prensa', 2, [10, 12], 120, 1),
      X('extension', 3, [12, 15], 60, 1),
      X('femoral_sentado', 3, [8, 10], 60, 1, { alt: ['femoral_acostado'] }),
      X('pantorrilla_pie', 4, [8, 12], 60, 1, { alt: ['pantorrilla_prensa'] }),
      X('crunch_polea', 3, [10, 15], 45, 1),
    ],
    cardio: null,
  },
  f3c: {
    id: 'f3c', nombre: EMPUJE, zona: 'torso', min: 65,
    ejercicios: [
      X('press_banca', 5, [3, 5], 210, 2, { nota: NOTA.banca }),
      X('press_inclinado', 3, [6, 8], 120, 2, { alt: ['press_inclinado_maquina'] }),
      X('fondos', 2, [8, 12], 90, 1, { alt: ['fondos_maquina'] }),
      X('aperturas', 2, [12, 15], 60, 1, { alt: ['cruces_polea'] }),
      X('laterales', 3, [12, 15], 45, 1, { alt: ['laterales_polea'] }),
      X('triceps_barra_v', 3, [8, 10], 90, 1, { alt: ['triceps_polea'] }),
      X('triceps_unilateral', 2, [12, 15], 45, 1, { lado: true }),
    ],
    cardio: { ej: 'caminadora', min: 20 },
  },
  f3d: {
    id: 'f3d', nombre: HOMBRO, zona: 'torso', min: 65,
    ejercicios: [
      X('press_militar', 4, [5, 7], 150, 2, { alt: ['press_hombro_maquina', 'press_hombro_mancuernas'], nota: NOTA.militar }),
      X('laterales_polea', 4, [12, 15], 45, 1, { lado: true, alt: ['laterales'] }),
      X('press_inclinado_maquina', 3, [8, 10], 90, 1, { alt: ['press_inclinado'] }),
      X('jalon_cerrado', 3, [8, 10], 90, 1, { alt: ['jalon_supino'] }),
      X('pajaros_maquina', 3, [12, 15], 60, 1),
      X('face_pull', 2, [15, 15], 60, 1),
      X('curl_muneca', 1, [12, 15], 45, 1, { lado: true }),
      X('curl_muneca_inv', 1, [12, 15], 45, 1),
    ],
    cardio: { ej: 'caminadora', min: 20 },
  },
  f3e: {
    id: 'f3e', nombre: POST, zona: 'pierna', min: 70,
    ejercicios: [
      X('peso_muerto', 4, [3, 5], 210, 2, { alt: ['rumano_barra'], nota: NOTA.muerto }),
      X('hip_thrust', 3, [6, 8], 120, 2),
      X('femoral_acostado', 3, [8, 10], 90, 1, { alt: ['femoral_sentado'] }),
      X('femoral_pie', 2, [10, 12], 60, 1, { lado: true }),
      X('prensa_alta', 3, [8, 10], 120, 1, { alt: ['prensa'] }),
      X('abductor', 3, [12, 15], 60, 1),
      X('pantorrilla_sentado', 3, [12, 15], 45, 1),
    ],
    cardio: null,
  },

  // ---------- Fase 4: Avanzado ----------
  f4a: {
    id: 'f4a', nombre: JALON, zona: 'torso', min: 75,
    ejercicios: [
      X('remo_pecho', 4, [5, 6], 180, 1, { alt: ['remo_polea'], nota: NOTA.remo }),
      X('dominadas', 4, [4, 6], 150, 1, { alt: ['dominadas_asistidas', 'jalon_supino'] }),
      X('remo_polea', 3, [8, 10], 90, 1),
      X('pullover_polea', 2, [12, 15], 60, 1),
      X('face_pull', 3, [15, 15], 45, 1),
      X('curl_barra_ez', 3, [6, 8], 90, 1),
      X('curl_inclinado', 3, [8, 10], 60, 1),
      X('curl_muneca', 2, [12, 15], 45, 1, { lado: true }),
      X('curl_muneca_inv', 2, [12, 15], 45, 1),
    ],
    cardio: { ej: 'caminadora', min: 20 },
  },
  f4b: {
    id: 'f4b', nombre: CUAD, zona: 'pierna', min: 75,
    ejercicios: [
      X('sentadilla_barra', 4, [3, 5], 240, 1, { nota: NOTA.sentadilla }),
      X('pendulo', 3, [6, 8], 150, 1, { alt: ['hack'] }),
      X('prensa', 3, [8, 10], 120, 1),
      X('extension', 3, [12, 15], 60, 0),
      X('femoral_sentado', 3, [8, 10], 60, 1),
      X('pantorrilla_pie', 4, [8, 12], 60, 1, { alt: ['pantorrilla_prensa'] }),
      X('crunch_polea', 3, [10, 15], 45, 1),
    ],
    cardio: null,
  },
  f4c: {
    id: 'f4c', nombre: EMPUJE, zona: 'torso', min: 70,
    ejercicios: [
      X('press_banca', 4, [3, 5], 240, 1, { nota: NOTA.banca }),
      X('press_inclinado', 3, [6, 8], 120, 1),
      X('fondos', 3, [6, 10], 120, 1, { alt: ['fondos_maquina'] }),
      X('aperturas', 2, [12, 15], 60, 0, { alt: ['cruces_polea'] }),
      X('laterales', 4, [12, 20], 45, 0, { alt: ['laterales_polea'] }),
      X('triceps_barra_v', 3, [8, 10], 90, 1),
      X('triceps_unilateral', 2, [12, 15], 45, 0, { lado: true }),
    ],
    cardio: { ej: 'caminadora', min: 20 },
  },
  f4d: {
    id: 'f4d', nombre: HOMBRO, zona: 'torso', min: 70,
    ejercicios: [
      X('press_militar', 4, [4, 6], 180, 1, { alt: ['press_hombro_maquina'], nota: NOTA.militar }),
      X('laterales_polea', 4, [12, 15], 45, 0, { lado: true }),
      X('press_inclinado_maquina', 3, [8, 10], 90, 1),
      X('jalon_cerrado', 3, [8, 10], 90, 1),
      X('pajaros_maquina', 3, [15, 20], 45, 0),
      X('encogimientos', 3, [10, 12], 60, 1),
      X('curl_muneca', 1, [12, 15], 45, 1, { lado: true }),
      X('curl_muneca_inv', 1, [12, 15], 45, 1),
    ],
    cardio: { ej: 'caminadora', min: 20 },
  },
  f4e: {
    id: 'f4e', nombre: POST, zona: 'pierna', min: 75,
    ejercicios: [
      X('peso_muerto', 4, [3, 5], 240, 1, { alt: ['rumano_barra'], nota: NOTA.muerto }),
      X('hip_thrust', 4, [6, 8], 120, 1),
      X('femoral_acostado', 3, [8, 10], 90, 1),
      X('femoral_pie', 2, [10, 12], 60, 0, { lado: true }),
      X('prensa_alta', 3, [8, 10], 120, 1),
      X('abductor', 3, [12, 15], 60, 0),
      X('pantorrilla_sentado', 4, [12, 15], 45, 1),
    ],
    cardio: null,
  },

  // ---------- Fase 5: Pro (semana pesada y semana de volumen) ----------
  f5a: {
    id: 'f5a', nombre: JALON + ' (pesado)', zona: 'torso', min: 75,
    ejercicios: [
      X('remo_pecho', 5, [4, 6], 180, 1, { nota: NOTA.remo }),
      X('dominadas', 4, [3, 5], 180, 1, { alt: ['dominadas_asistidas'] }),
      X('remo_polea', 3, [6, 8], 120, 1),
      X('face_pull', 2, [15, 15], 45, 1),
      X('curl_barra_ez', 3, [5, 7], 90, 1),
      X('curl_muneca', 2, [10, 12], 45, 1, { lado: true }),
      X('curl_muneca_inv', 2, [10, 12], 45, 1),
    ],
    cardio: null,
  },
  f5b: {
    id: 'f5b', nombre: CUAD + ' (pesado)', zona: 'pierna', min: 80,
    ejercicios: [
      X('sentadilla_barra', 5, [2, 4], 240, 1, { nota: NOTA.sentadilla }),
      X('pendulo', 3, [5, 7], 180, 1, { alt: ['hack'] }),
      X('prensa', 2, [8, 10], 120, 1),
      X('extension', 2, [10, 12], 60, 1),
      X('femoral_sentado', 2, [8, 10], 60, 1),
      X('pantorrilla_pie', 4, [8, 10], 60, 1),
    ],
    cardio: null,
  },
  f5c: {
    id: 'f5c', nombre: EMPUJE + ' (pesado)', zona: 'torso', min: 75,
    ejercicios: [
      X('press_banca', 5, [2, 4], 240, 1, { nota: NOTA.banca }),
      X('press_inclinado', 3, [5, 7], 150, 1),
      X('fondos', 3, [5, 8], 150, 1, { alt: ['fondos_maquina'] }),
      X('laterales', 3, [12, 15], 45, 1),
      X('triceps_barra_v', 3, [6, 8], 90, 1),
    ],
    cardio: null,
  },
  f5d: {
    id: 'f5d', nombre: HOMBRO + ' (pesado)', zona: 'torso', min: 70,
    ejercicios: [
      X('press_militar', 5, [3, 5], 180, 1, { nota: NOTA.militar }),
      X('laterales_polea', 3, [10, 12], 45, 1, { lado: true }),
      X('press_inclinado_maquina', 3, [6, 8], 120, 1),
      X('jalon_cerrado', 3, [6, 8], 120, 1),
      X('pajaros_maquina', 3, [12, 15], 60, 1),
      X('encogimientos', 3, [8, 10], 60, 1),
    ],
    cardio: null,
  },
  f5e: {
    id: 'f5e', nombre: POST + ' (pesado)', zona: 'pierna', min: 80,
    ejercicios: [
      X('peso_muerto', 5, [2, 4], 240, 1, { alt: ['rumano_barra'], nota: NOTA.muerto }),
      X('hip_thrust', 4, [5, 7], 150, 1),
      X('femoral_acostado', 3, [6, 8], 90, 1),
      X('prensa_alta', 3, [6, 8], 150, 1),
      X('pantorrilla_sentado', 4, [10, 12], 45, 1),
    ],
    cardio: null,
  },
  f5f: {
    id: 'f5f', nombre: JALON + ' (volumen)', zona: 'torso', min: 70,
    ejercicios: [
      X('jalon_supino', 4, [10, 12], 90, 1),
      X('remo_pecho', 4, [10, 12], 90, 1),
      X('remo_polea', 3, [12, 15], 60, 1),
      X('pullover_polea', 3, [12, 15], 60, 0),
      X('face_pull', 3, [15, 20], 45, 0),
      X('curl_inclinado', 3, [10, 12], 60, 1),
      X('curl_martillo', 3, [12, 12], 60, 0),
      X('curl_muneca', 2, [15, 20], 45, 0, { lado: true }),
      X('curl_muneca_inv', 2, [15, 20], 45, 0),
    ],
    cardio: { ej: 'caminadora', min: 30 },
  },
  f5g: {
    id: 'f5g', nombre: CUAD + ' (volumen)', zona: 'pierna', min: 75,
    ejercicios: [
      X('sentadilla_barra', 3, [8, 10], 150, 2, { nota: NOTA.sentadilla }),
      X('pendulo', 4, [10, 12], 120, 1, { alt: ['hack'] }),
      X('prensa', 3, [12, 15], 90, 1),
      X('extension', 4, [15, 20], 45, 0),
      X('femoral_sentado', 3, [12, 15], 60, 0),
      X('pantorrilla_prensa', 4, [15, 20], 45, 0, { alt: ['pantorrilla_pie'] }),
      X('crunch_polea', 3, [15, 15], 45, 1),
    ],
    cardio: null,
  },
  f5h: {
    id: 'f5h', nombre: EMPUJE + ' (volumen)', zona: 'torso', min: 70,
    ejercicios: [
      X('press_inclinado', 4, [8, 12], 90, 1),
      X('press_pecho_maquina', 3, [10, 12], 90, 1),
      X('cruces_polea', 3, [12, 15], 60, 0),
      X('laterales', 5, [15, 20], 45, 0),
      X('triceps_tras_nuca', 3, [12, 15], 60, 1),
      X('triceps_barra_v', 2, [15, 15], 45, 0),
      T('plancha', 3, [45, 60], 45),
    ],
    cardio: { ej: 'caminadora', min: 30 },
  },
  f5i: {
    id: 'f5i', nombre: HOMBRO + ' (volumen)', zona: 'torso', min: 70,
    ejercicios: [
      X('press_hombro_maquina', 4, [10, 12], 90, 1),
      X('laterales_polea', 5, [15, 20], 45, 0, { lado: true }),
      X('press_inclinado_maquina', 3, [12, 15], 60, 1),
      X('jalon_cerrado', 3, [12, 15], 60, 1),
      X('pajaros_maquina', 4, [15, 20], 45, 0),
      X('face_pull', 3, [15, 20], 45, 0),
    ],
    cardio: { ej: 'caminadora', min: 30 },
  },
  f5j: {
    id: 'f5j', nombre: POST + ' (volumen)', zona: 'pierna', min: 75,
    ejercicios: [
      X('rumano_barra', 3, [8, 10], 150, 2, { nota: NOTA.rumano }),
      X('hip_thrust', 4, [10, 12], 90, 1),
      X('femoral_acostado', 3, [12, 15], 60, 0),
      X('femoral_pie', 3, [12, 15], 45, 0, { lado: true }),
      X('prensa_alta', 3, [12, 15], 90, 1),
      X('abductor', 3, [15, 20], 45, 0),
      X('pantorrilla_sentado', 4, [15, 20], 45, 0),
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
