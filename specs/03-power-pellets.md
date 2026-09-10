# SPEC 03 — Power pellets y fantasmas asustados

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-09-10
> **Objetivo:** Añadir 4 power pellets en las esquinas que asustan a los 4 fantasmas durante 8 s — azules, a media velocidad y con dirección aleatoria, comibles por Pac-Man a 200/400/800/1600 y devueltos al corral para re-salir por la puerta.

## Alcance

**In:**

- Valor de celda 4 (char `'o'`) en `maze.js` para los 4 pellets en (1,3), (26,3), (1,23), (26,23).
- Los pellets cuentan en `dotsRemaining` (hay que comerlos para ganar) y valen 50 puntos.
- Estado frightened en `game.js`: `frightenedTimer` de 480 frames, `ghostEatChain`, flag `frightened` por fantasma y reversa al activarse.
- Fantasmas asustados: dirección válida sin reversa elegida al azar y velocidad `0.05`.
- Comer fantasma asustado: cadena 200/400/800/1600 y teletransporte a su celda de `GHOST_STARTS` con `exiting = true`.
- `render.js`: pellet grande parpadeante; fantasma azul (parpadeo azul↔blanco los últimos 2 s).

**Out of scope (para specs futuras):**

- Pausa de 1 s del arcade al comer un fantasma y puntos flotantes (200, 400…) en pantalla.
- "Ojos" que caminan de vuelta al corral (se descarta: teletransporte).
- Escalado de duración por nivel (el juego tiene un solo nivel).
- Scatter, Cruise Elroy y salida escalonada (ya aplazadas en SPEC 01 y SPEC 02).

## Modelo de datos

```js
// maze.js — nuevo tile en parseTile; las 4 esquinas cambian '.' por 'o'
if ( ch === 'o' ) return 4;
```

```js
// game.js — constantes nuevas
const FRIGHTENED_FRAMES = 480; // 8 s a 60 fps
const FRIGHTENED_SPEED = 0.05; // mitad de GHOST_SPEED
const GHOST_SCORES = [ 200, 400, 800, 1600 ];
```

```js
// game.js — estado nuevo en createGame (y que resetPositions limpia)
frightenedTimer: 0, // frames restantes del efecto; 0 = inactivo
ghostEatChain: 0,   // fantasmas comidos con el pellet activo
// cada fantasma gana:
frightened: false,  // true mientras dura el efecto
```

Reglas:

- Comer pellet (celda 4 en `movePacman`): `grid → 0`, `+50`, `dotsRemaining--`, `frightenedTimer = 480`, `ghostEatChain = 0`, todos los fantasmas `frightened = true`; reversa (`dir = OPPOSITE[dir]`) solo a los que no están `exiting`.
- Asustado en `decideGhost`: dirección válida sin reversa elegida al azar (callejón → reversa, como hoy); velocidad `FRIGHTENED_SPEED` en `moveGhost`.
- Expiración en `update`: `frightenedTimer` llega a 0 → todos `frightened = false`.
- Comer fantasma asustado (colisión): `score += GHOST_SCORES[ Math.min( ghostEatChain, 3 ) ]`, `ghostEatChain++`, vuelve a su celda de `GHOST_STARTS` con `dir: 'up'`, `exiting: true`, `frightened: false`.
- `resetPositions` (vida perdida): `frightenedTimer = 0`, `ghostEatChain = 0`, todos `frightened = false`.

Convenciones:

- `dotsRemaining` cuenta los valores 2 y 4: ganar exige comer los pellets.
- `frightened` y `exiting` conviven: la ruta fija de salida manda sobre la IA, pero el fantasma se pinta azul y es comible; sale a `GHOST_SPEED`, sin bajar a `FRIGHTENED_SPEED`.
- Un revivido no re-asusta con el pellet que lo comió; el siguiente pellet sí lo re-asusta (reinicia timer y cadena para todos, revividos incluidos).
- `drawDots` necesita `frame` para el parpadeo: firma `drawDots( ctx, grid, frame )`.

## Plan de implementación

1. `maze.js`: `'o'` → 4 en `parseTile` y en las 4 esquinas de `MAZE_STR` (filas 3 y 23, cols 1 y 26). Nada lo usa aún; el juego corre idéntico. Funcional.
2. `game.js` + `render.js` — pellets comestibles como "dots gordos": `createGame` cuenta la celda 4 en `dotsRemaining`; `movePacman` la come (+50, `dotsRemaining--`, sin efecto aún); `drawDots` la dibuja como círculo r=7. Dos archivos en un paso: sin ambos, el nivel queda inganable o con pellets invisibles. Prueba manual: 4 círculos grandes; comer uno suma 50; el nivel no termina sin comerlos. Funcional.
3. `game.js` — modo frightened: comer pellet activa timer + cadena y asusta a los 4; reversa de los no `exiting`; rama aleatoria en `decideGhost` para asustados; velocidad `0.05`; expiración en `update`. Prueba manual: al comer un pellet todos invierten marcha y vagan lentos (aún letales, aún con su color). Funcional.
4. `game.js` — comer fantasmas: colisión con asustado → puntos de cadena + teletransporte al corral con `exiting = true`; `resetPositions` limpia el efecto. Prueba manual: comer 2 fantasmas seguidos suma 200+400 y ambos re-emergen por la puerta. Funcional.
5. `render.js` — visuales: pellet parpadeante con `frame`; fantasma asustado azul `#2121de` con ojos blancos sin pupila; parpadeo azul↔blanco los últimos 120 frames. Prueba manual: azul al comer el pellet, parpadeo al final, color original al expirar. Funcional.

## Criterios de aceptación

- [ ] Hay 4 pellets grandes y parpadeantes en (1,3), (26,3), (1,23), (26,23) desde el inicio.
- [ ] Comer un pellet suma 50 puntos y descuenta 1 de `dotsRemaining`.
- [ ] El nivel no se gana sin comer los 4 pellets.
- [ ] Al comer un pellet los 4 fantasmas se vuelven azules e invierten la marcha (los `exiting` mantienen su ruta).
- [ ] Un fantasma asustado avanza lento (mitad de velocidad) y toma bifurcaciones al azar sin reversa.
- [ ] Tras ~8 s los fantasmas recuperan color, velocidad e IA, con parpadeo azul↔blanco los últimos ~2 s.
- [ ] Colisionar con un fantasma asustado lo come: 200, 400, 800 y 1600 por el 1.º al 4.º del mismo pellet.
- [ ] El fantasma comido reaparece en su celda de `GHOST_STARTS` y re-sale por la puerta a `GHOST_SPEED`.
- [ ] Un fantasma revivido no está asustado aunque el temporizador siga activo.
- [ ] Comer otro pellet reinicia el temporizador a 8 s y la cadena a 200.
- [ ] Colisión con fantasma normal resta una vida y resetea posiciones como antes.
- [ ] Perder una vida cancela el efecto (nadie queda azul tras el reset).
- [ ] `open src/index.html` carga sin errores en consola.

## Decisiones

- **Sí:** las 4 esquinas clásicas (1,3), (26,3), (1,23), (26,23). Referencia del arcade; hoy son dots, el cambio es trivial.
- **Sí:** valor de celda 4 con char `'o'`. Sigue el patrón de `parseTile`; los pellets se comen mutando `game.grid`, igual que los dots.
- **No:** lista de posiciones aparte de la matriz. Duplicaría la fuente de verdad del nivel.
- **Sí:** cuentan para `dotsRemaining`. En el arcade ganar exige comerlos; sin esto el nivel sería inganable en cuanto existan.
- **Sí:** 50 puntos por pellet (valor del arcade).
- **Sí:** dirección aleatoria + `FRIGHTENED_SPEED = 0.05`. Comportamiento clásico; reutiliza el filtro de opciones de `decideGhost`.
- **No:** huir determinista (maximizar distancia). Más código para un resultado menos clásico.
- **Sí:** 8 s fijos (480 frames). Un solo nivel: el escalado por nivel del arcade no aplica.
- **Sí:** reversa al activarse. Señal clásica e inmediata del cambio de modo; el pasillo de atrás siempre es transitable.
- **Sí:** teletransporte al corral + `exiting = true`. Reutiliza la ruta de salida de SPEC 02; cero lógica de regreso.
- **No:** ojos que caminan de vuelta. Exigiría pathing de regreso; el greedy Manhattan ya demostró fallar dentro del corral (motivo de SPEC 02).
- **Sí:** flag `frightened` por fantasma, no solo timer global. Permite revivir normal aunque el efecto siga activo (regla del arcade).
- **Sí:** asustar también a los del corral o saliendo. Una sola regla uniforme; Pac-Man no puede entrar al corral, así que no hay caso abusivo.
- **Sí:** cadena 200→1600 que reinicia con cada pellet. Regla clásica; premia cazar varios con un mismo power.
- **No:** pausa de 1 s al comer fantasma y puntos flotantes en pantalla. Estéticos; tocarían el bucle de `main.js` sin aportar mecánica.
- **Sí:** parpadeo final (últimos 120 frames) y pellets parpadeantes. Avisan al jugador; señal clásica.

## Riesgos

| Riesgo                                                                           | Mitigación                                                                                        |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `requestAnimationFrame` no garantiza 60 fps → los "8 s" son aproximados          | Aceptado: misma suposición que `PACMAN_SPEED` y `GHOST_SPEED` ya hacen.                           |
| Pellet comido con un fantasma saliendo por la puerta                             | La reversa no aplica a `exiting`; puede ser comido en (13,11), celda de pasillo normal (SPEC 02). |
| Quinto fantasma comido con un mismo pellet (revivido re-asustado por el segundo) | `GHOST_SCORES[ Math.min( chain, 3 ) ]` topea la cadena en 1600.                                   |
| Azul frightened `#2121de` cercano al azul de paredes `#2121ff`                   | Cuerpo relleno grande sobre pasillos negros vs líneas finas de pared: se distingue.              |

## Lo que **no** está en esta spec

- Pausa del arcade al comer fantasma y puntos flotantes (200/400…) en pantalla.
- "Ojos" que caminan de vuelta al corral.
- Escalado de duración por nivel y segundos niveles.
- Scatter, Cruise Elroy y salida escalonada del corral.

Cada uno, si llega, va en su propia spec.
