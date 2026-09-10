# SPEC 02 — Salida del corral

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-09-10
> **Objetivo:** pinky, inky y clyde salen del corral por la puerta mediante una ruta fija hasta (13,11) — al iniciar la partida y tras cada vida perdida — y una vez fuera la puerta cuenta como muro para su IA normal.

## Motivo

SPEC 01 decidió "salida inmediata y libre" del corral, pero `decideGhost` elige por distancia Manhattan greedy: dentro del corral (área abierta, filas 13-15) ese cálculo los hace vagar u oscilar — bajar, por ejemplo, los "acerca" a la fila de Pac-Man (23) — y jamás toman el único camino útil: subir por la puerta (13,12). Resultado: quedan atrapados. Solo blinky, que arranca fuera, funciona.

## Alcance

**In:**

- Flag `inPen` en las entradas de corral de `GHOST_STARTS` y nueva global `GATE_EXIT` en `maze.js`.
- Campo `exiting` en cada fantasma de `game.js`, activo al crear la partida y al resetear posiciones.
- Ruta fija de salida en `moveGhost`: alinear a la columna 13, subir hasta (13,11) y ahí pasar a IA normal.
- Puerta unidireccional: la celda 3 bloquea también a los fantasmas que no estén `exiting` (antes solo bloqueaba a Pac-Man).

**Out of scope (para specs futuras):**

- Salida escalonada por tiempo o dots comidos (ya aplazada en SPEC 01).
- Re-entrada al corral tras ser comido (no existe modo frightened).
- Animación de rebote "idle" dentro del corral del arcade.
- Cualquier cambio en `render.js` o `index.html`.

## Modelo de datos

```js
// maze.js — GHOST_STARTS gana inPen; blinky (fuera) no lo lleva
const GHOST_STARTS = [
  { x: 13, y: 11, kind: 'blinky' },              // fuera del corral
  { x: 13, y: 14, kind: 'pinky', inPen: true },  // dentro, bajo la puerta
  { x: 11, y: 14, kind: 'inky',  inPen: true },  // dentro, izquierda
  { x: 16, y: 14, kind: 'clyde', inPen: true },  // dentro, derecha
];
const GATE_EXIT = { x: 13, y: 11 }; // celda sobre la puerta donde termina la salida
```

```js
// game.js — cada fantasma gana exiting (createGame y resetPositions)
ghosts: GHOST_STARTS.map( ( g ) => ( {
  x: g.x, y: g.y, dir: 'up', speed: GHOST_SPEED,
  kind: g.kind, exiting: !!g.inPen,
} ) ),
```

Ruta de salida mientras `g.exiting` (en `moveGhost`):

- Si `Math.round( g.x ) < 13` → `dir = 'right'`; si `> 13` → `dir = 'left'`; si `=== 13` → `dir = 'up'`.
- Avanza a `GHOST_SPEED`, con la misma mecánica de alineado que el resto del juego (`aligned()` + redondeo).
- Al quedar alineado en `GATE_EXIT` (13,11): `exiting = false`. Con `dir` en `'up'`, `decideGhost` ya excluye la reversa `'down'` — justo la puerta — al retomar la IA.

Puerta unidireccional: en `isWall`/`canMove` la celda 3 es muro para todo actor salvo un fantasma con `exiting` en true. Pac-Man queda igual que antes.

Convenciones:

- Los ojos del fantasma ya miran según `dir`, así que la salida se ve natural sin tocar `render.js`.
- Colisión fantasma-Pac-Man en (13,11) al emerger: es una celda de pasillo normal, la colisión existente la cubre sin caso especial.

## Plan de implementación

1. `maze.js`: añadir `inPen: true` a pinky/inky/clyde y `GATE_EXIT` como global. Nada lo usa aún; el juego corre idéntico. Funcional.
2. `game.js`: campo `exiting` derivado de `inPen` en `createGame` y `resetPositions`. Aún sin efecto. Funcional.
3. `game.js`: rama de salida en `moveGhost` — ruta fija (alinear a x=13, subir), sin `decideGhost` mientras `exiting`; `exiting = false` al llegar a `GATE_EXIT`. Prueba manual: al iniciar, los 3 atraviesan la puerta y se reparten por el mapa en pocos segundos.
4. `game.js`: puerta unidireccional — la celda 3 bloquea a los fantasmas que no están `exiting`. Prueba manual: dejar correr el juego; ningún fantasma re-entra; clyde sigue llegando a (1,29) sin atajos por el corral.

## Criterios de aceptación

- [ ] Al iniciar, pinky, inky y clyde salen del corral por la puerta y alcanzan (13,11) en pocos segundos, sin oscilar dentro.
- [ ] La salida ocurre a `GHOST_SPEED = 0.1`, sin excepciones de velocidad.
- [ ] blinky no cambia: arranca en (13,11) con IA normal desde el primer frame.
- [ ] Tras perder una vida, los 3 del corral vuelven a salir con la misma ruta.
- [ ] Ningún fantasma re-entra al corral con la IA normal (la celda 3 les es muro salvo en `exiting`).
- [ ] Pac-Man sigue sin poder cruzar la puerta.
- [ ] Una colisión con un fantasma emergiendo en (13,11) resta una vida con las reglas actuales.
- [ ] `open src/index.html` carga sin errores en consola.

## Decisiones

- **Sí:** salida inmediata de los 3 a la vez. Hereda la decisión de SPEC 01; la escalonada sigue aplazada.
- **Sí:** estado `exiting` con ruta fija. El greedy Manhattan es la causa del atrapamiento; reutilizarlo para salir sería re-introducir el bug.
- **Sí:** columna 13 como eje de salida (no 14 ni 13.5 del arcade). Coincide con el arranque de blinky y con `PACMAN_START.x`; todo el juego ya trabaja con celdas enteras.
- **Sí:** flag `inPen` en `GHOST_STARTS` y `GATE_EXIT` en `maze.js`. La geometría del nivel vive ahí; `game.js` no hardcodea filas del corral.
- **Sí:** misma velocidad durante la salida. Menos parámetros que ajustar.
- **Sí:** puerta unidireccional tras salir. Evita que acampen dentro y rutas extrañas hacia la esquina de clyde.
- **No:** teletransporte al iniciar. Salto visual; la ruta fija es poco código y se ve bien.
- **No:** salida escalonada por tiempo/dots. Ya aplazada en SPEC 01; va en su propia spec si la dificultad lo pide.
- **No:** rebote idle en el corral. Sin salida escalonada no hay espera que animar.

## Riesgos

| Riesgo                                                            | Mitigación                                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Acumulación de FP al alinear a x=13 sumando 0.1                    | `aligned()` ya redondea con tolerancia 1e-3; misma mecánica que Pac-Man en pasillos.  |
| Colisión justa en (13,11) al emerger mientras Pac-Man pasa por ahí | Aceptado: celda de pasillo normal, la colisión existente la cubre.                    |
| Dos fantasmas coincidiendo en la puerta al salir a la vez          | Aceptado: los fantasmas ya no colisionan entre sí; se superponen un instante y sigue. |

## Lo que **no** está en esta spec

- Salida escalonada del corral (por tiempo o dots).
- Re-entrada al corral tras ser comido (modo frightened).
- Animación de rebote idle dentro del corral.
- Cambios en `render.js` o `index.html`.

Cada uno, si llega, va en su propia spec.
