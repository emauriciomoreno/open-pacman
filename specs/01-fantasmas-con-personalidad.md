# SPEC 01 — Cuatro fantasmas con personalidad

> **Estado:** Aprobado
> **Depende de:** ninguna
> **Fecha:** 2026-09-10
> **Objetivo:** Reemplazar los 2 fantasmas genéricos actuales por 4 con las personalidades clásicas del arcade — blinky persigue agresivamente, pinky embosca, inky flanquea y clyde es tímido — a igual velocidad y sin modos globales.

## Alcance

**In:**

- `GHOST_STARTS` con 4 fantasmas: blinky fuera del corral, pinky/inky/clyde dentro.
- `decideGhost` en `game.js` con un objetivo de puntería distinto por kind.
- Color de fantasma fijo por kind en `render.js`.
- Eliminación de los kinds `hunter` y `random`.

**Out of scope (para specs futuras):**

- Modo scatter (retiradas periódicas a esquinas).
- Power-pellets y fantasmas asustados/comibles (frightened).
- Cambios de velocidad entre fantasmas (Cruise Elroy).
- Salida escalonada del corral (por tiempo o dots).

## Modelo de datos

```js
// maze.js — 4 fantasmas (antes 2)
const GHOST_STARTS = [
  { x: 13, y: 11, kind: 'blinky' }, // fuera del corral, sobre la puerta
  { x: 13, y: 14, kind: 'pinky' },  // dentro del corral, bajo la puerta
  { x: 11, y: 14, kind: 'inky' },   // dentro del corral, izquierda
  { x: 16, y: 14, kind: 'clyde' },  // dentro del corral, derecha
];
```

```js
// render.js — color fijo por kind (antes GHOST_COLORS por índice)
const GHOST_COLOR_BY_KIND = {
  blinky: '#ff0000', // rojo
  pinky: '#ffb8ff',  // rosa
  inky: '#00ffff',   // cian
  clyde: '#ffb852',  // naranja
};
```

Objetivo de puntería por kind en `game.js` (función `targetForKind(game, g)`):

| kind   | Objetivo (celda)                                                              |
| ------ | ----------------------------------------------------------------------------- |
| blinky | Celda de Pac-Man.                                                             |
| pinky  | Celda de Pac-Man + 4 en su dirección de mirada (corregida: `up` sin desvío).  |
| inky   | 2·(celda de Pac-Man + 2·mirada) − celda de blinky.                            |
| clyde  | Pac-Man si dist. Manhattan > 8; si no, esquina (1,29).                        |

Convenciones:

- Los objetivos son puntos de puntería: pueden caer fuera del laberinto, solo se usan para comparar distancias.
- Celda de un actor = `Math.round(x)`, `Math.round(y)` (como el hunter actual).
- Cada fantasma conserva sus campos actuales: `x`, `y`, `dir`, `speed`, `kind`.

## Plan de implementación

1. `maze.js`: reemplazar `GHOST_STARTS` por las 4 entradas nuevas. El juego corre con 4 fantasmas; como ningún kind es `hunter`, todos usan la rama aleatoria actual. Funcional.
2. `game.js`: eliminar la rama `hunter`/`random` de `decideGhost`; nueva `targetForKind` que por ahora devuelve la celda de Pac-Man para los 4 kinds. Elección común: dirección válida sin reversa que minimiza distancia Manhattan al objetivo (callejón → reversa). Los 4 persiguen directo. Funcional.
3. `game.js`: pinky — objetivo = Pac-Man + 4·`DIRS[pacman.dir]`. Prueba manual: pinky corta el paso por delante de Pac-Man.
4. `game.js`: inky — objetivo = 2·(Pac-Man + 2·mirada) − blinky; si no hay blinky en `game.ghosts`, usa la celda de Pac-Man.
5. `game.js`: clyde — persigue si dist. Manhattan > 8, si no apunta a (1,29). Prueba manual: acercarse a clyde y ver que se aleja a su esquina.
6. `render.js`: sustituir `GHOST_COLORS[i]` por `GHOST_COLOR_BY_KIND[g.kind]`. Prueba manual: 4 colores distintos estables tras perder una vida.

## Criterios de aceptación

- [ ] Al iniciar hay 4 fantasmas: blinky en (13,11) sobre la puerta y los otros 3 dentro del corral.
- [ ] blinky elige en cada bifurcación la dirección válida sin reversa que minimiza su distancia Manhattan a la celda de Pac-Man.
- [ ] pinky apunta 4 celdas delante de la mirada de Pac-Man, también cuando mira `up`.
- [ ] inky apunta a 2·(Pac-Man + 2·mirada) − celda de blinky.
- [ ] clyde persigue a Pac-Man con dist. Manhattan > 8 y apunta a (1,29) con dist. ≤ 8.
- [ ] Ningún fantasma invierte marcha salvo en callejón sin salida.
- [ ] Los kinds `hunter` y `random` no aparecen en ningún archivo de `src/js`.
- [ ] Cada fantasma se dibuja con el color fijo de su kind: rojo, rosa, cian, naranja.
- [ ] Los 4 se mueven a `GHOST_SPEED = 0.1`, sin excepciones.
- [ ] Una colisión con cualquier fantasma resta una vida y resetea posiciones.
- [ ] `open src/index.html` carga sin errores en consola.

## Decisiones

- **Sí:** personalidades clásicas del arcade. Mapean 1:1 con lo pedido y son la referencia documentada más conocida.
- **No:** comportamientos custom. Menos probados y sin referencia compartida.
- **Sí:** misma velocidad para los 4. La agresividad de blinky viene del objetivo, no de correr más; menos parámetros que ajustar.
- **No:** Cruise Elroy. Aplazado; se puede añadir después sin romper nada.
- **Sí:** salida inmediata y libre del corral, con blinky ya afuera. Reutiliza el comportamiento actual, sin lógica de temporización.
- **No:** salida escalonada. Irá en otra spec si la dificultad lo pide.
- **Sí:** extender `decideGhost` en `game.js`. La IA ya vive ahí y no se toca la cadena de `<script>` de `index.html`.
- **No:** archivo nuevo `js/ghosts.js`. No compensa exponer globals extra ahora.
- **Sí:** color fijo por kind. Identidad visual estable aunque cambie el orden de `GHOST_STARTS`.
- **Sí:** pinky "corregida" (`up` sin desvío lateral). Predecible y fácil de explicar; el bug histórico no justifica un caso especial.
- **Sí:** eliminar `hunter` y `random`. El hunter actual es exactamente el blinky nuevo; random queda obsoleto.

## Riesgos

| Riesgo                                                         | Mitigación                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------- |
| 4 fantasmas con IA y sin scatter → partidas más difíciles      | Aceptado; una spec futura de scatter lo alivia.                  |
| inky depende de que exista un blinky en `game.ghosts`          | Fallback: si no lo encuentra, apunta a la celda de Pac-Man.      |
| Manhattan con Pac-Man en el túnel (wrap) sobreestima distancia | Ya ocurre con el hunter actual; se tolera y no se corrige aquí.  |

## Lo que **no** está en esta spec

- Modo scatter (retiradas periódicas a esquinas).
- Power-pellets y fantasmas asustados/comibles.
- Cambios de velocidad entre fantasmas.
- Salida escalonada del corral.

Cada uno, si llega, va en su propia spec.
