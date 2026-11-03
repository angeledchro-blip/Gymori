# Gymori

App para bajar a 74–75 kg sin perder músculo: rutina progresiva de principiante a pro, plan de comida
con precios de Guasave y una alarma que solo se apaga dejando presionado un botón 10 segundos.

## Qué trae

- **Hoy**: qué rutina toca, calorías y macros que te quedan, horario del día (desayuno, comida, colación, cena y hora de dormir),
  agua, pendientes del día (creatina, pasos, proteína, sueño), peso y nivel.
- **Entreno**: rutina de lunes a viernes (jalón, pierna cuádriceps, empuje, hombro y torso, pierna posterior) con un básico
  al inicio de cada día, en 5 fases (Técnica → Fuerza e hipertrofia → Intermedio → Avanzado → Pro) con requisitos para subir, calentamiento,
  series con peso de la vez pasada y sugerencia de cuánto subir (doble progresión), descanso con vibración,
  cardio y estiramientos. Cada ejercicio con fotos del movimiento y botón a video.
- **Comida**: plan del día ajustado a tus calorías con comida de Guasave, registro rápido, búsqueda de alimentos,
  foto del plato (la IA calcula calorías e ingredientes), código de barras (Open Food Facts), plan semanal y
  lista del súper con precios de Bodega Aurrera, Walmart, Casa Ley, Oxxo y Farmacias Similares (suplementos).
- **Progreso**: gráfica de peso con promedio de 7 días, ritmo por semana, fecha estimada para llegar a la meta,
  ajuste automático de calorías, cintura, fuerza (1 rep estimada) y constancia.
- **Alarma**: suena con volumen que va subiendo, sale encima del bloqueo y se apaga solo manteniendo el disco 10 s.

## Cómo está armada

```
android/   App Android (Java): WebView + alarma nativa + puente para guardar datos.
web/       Worker de Cloudflare: sirve la app y la API de la cámara.
  public/  La app (HTML, CSS y JS). También va dentro del APK para funcionar sin internet.
  src/     API: foto del plato con IA y búsqueda de códigos de barras.
  test/    Pruebas (cálculos, datos, Worker).
```

La app abre primero la web del Worker (así los cambios llegan sin reinstalar). Si no hay internet o el Worker
no existe, abre la copia que trae el APK. Los datos se guardan en Android, así que son los mismos en los dos casos.

| Qué cambia | Dónde | Cuándo se ve en la app |
| --- | --- | --- |
| Rutinas, ejercicios, alimentos, precios, menús, textos | `web/public/js/datos/` → push a `main` | Al abrir la app (si el Worker está conectado) |
| Diseño o funciones | `web/public` → push a `main` | Al abrir la app |
| Alarma, permisos, ícono | `android/` → compilar en Bitrise | Hay que instalar el APK nuevo |

Después de cambiar algo en `web/public` corre `node scripts/lista-sw.mjs` (dentro de `web/`) para que la copia
sin internet quede al día; las pruebas avisan si se te olvida.

## Conectar Cloudflare (una sola vez)

1. Cloudflare → Workers & Pages → Create → Import a repository → `Gymori`.
2. Nombre del Worker: `gymori`. Root directory: `web`. Deploy command: `npx wrangler deploy`. Guardar.
3. Queda en `https://gymori.angeled-chro.workers.dev/` (si cambia, ponlo en `android/gradle.properties` → `gym.webUrl`).

La IA de la foto usa la IA gratis de Cloudflare. Para que la revise **Claude**: Workers → `gymori` → Settings →
Variables and Secrets → agregar el secreto `ANTHROPIC_API_KEY`. Límite de fotos por día: variable `LIMITE_DIA` (60 por defecto).

## Compilar el APK

Bitrise, workflow `build_apk` (proyecto en `android/`, variante debug). El APK se firma siempre con
`android/app/debug.keystore`, así que cada versión se instala encima de la anterior.

## Alarma en Xiaomi / HyperOS

En la app: Más → Alarma de gym → activa todo lo de "Para que no falle" (notificaciones, alarmas exactas,
pantalla completa, sin límite de batería e inicio automático de Xiaomi).

## Pruebas

```
cd web
node --test test/*.test.mjs
```

## Créditos

- Fotos de ejercicios: [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (dominio público).
- Letra Barlow (SIL Open Font License), lector de códigos ZXing (Apache 2.0), datos de productos Open Food Facts (ODbL).
- Precios aproximados de noviembre 2026: tiendas en línea de Walmart, Bodega Aurrera y Farmacias Similares, folletos de Casa Ley en Sinaloa y Oxxo en Rappi.
