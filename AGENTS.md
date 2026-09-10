# AGENTS.md

## Proyecto

Juego tipo Pac-Man en JavaScript puro. Sin framework, sin bundler, sin npm. También es un repo de aprendizaje para Spec-Driven Development.

## Comandos y verificación

- No hay `package.json`, scripts, tests, linter ni CI. No inventar comandos npm/test: no existen.
- Verificar: abrir `src/index.html` directamente en el navegador (`open src/index.html`). No hace falta servidor ni build.

## Arquitectura

- Entrada única: `src/index.html` (canvas 560x620, `TILE = 20` en render.js).
- Sin módulos ES: los archivos se comunican por globals (`window.MAZE`, `window.createGame`, `update`, `draw`, …). El orden de los `<script>` en index.html ES la cadena de dependencias: `maze.js` → `game.js` → `render.js` → `main.js`. Un archivo nuevo debe insertar su `<script>` en la posición correcta.
- `maze.js`: datos del nivel (globals `MAZE`, `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`). Laberinto 28x31 escrito como strings; valores: 0 vacío, 1 pared, 2 dot, 3 puerta del corral (bloquea solo a Pac-Man, no a los fantasmas). `TUNNEL_ROW = 14` tiene wrap horizontal.
- `game.js`: estado y reglas (`createGame`, `update`). `game.grid` es una copia de `MAZE`: los dots comidos mutan la copia, nunca `MAZE`.
- `render.js`: dibujo en canvas (`draw`). Usa `game.grid` (no `MAZE`) para reflejar los dots comidos.
- `main.js`: bucle, teclado y overlay.

## Workflow: specs

- Las features se trabajan con los skills `/spec` y `/spec-impl` (`.agents/skills/`, pinneados en `skills-lock.json`). Las specs viven en `specs/NN-slug.md`.
- Flujo: `/spec` crea la spec en Draft → el humano la aprueba → `/spec-impl` crea la rama `spec-NN-slug` e implementa paso a paso. Nunca implementar una spec cuyo estado no sea Approved.
- Idioma: escribir specs, comentarios y UI en español, imitando el estilo de las specs existentes si las hay.
