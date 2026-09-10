// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS, GATE_EXIT.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame
const FRIGHTENED_FRAMES = 480; // 8 s a 60 fps
const FRIGHTENED_SPEED = 0.05; // mitad de GHOST_SPEED

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 || v === 4 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    frightenedTimer: 0, // frames restantes del efecto; 0 = inactivo
    ghostEatChain: 0,   // fantasmas comidos con el pellet activo
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      exiting: !!g.inPen,
      frightened: false, // true mientras dura el efecto
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado por pared (1) y por la puerta (3) salvo que este
//           saliendo del corral (exiting)
function isWall( grid, x, y, actor, exiting ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && !( actor === 'ghost' && exiting ) ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
// exiting (fantasmas): solo con true pueden cruzar la puerta del corral.
function canMove( grid, x, y, dir, actor, exiting ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor, exiting );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot o power pellet.
    const cell = grid[ p.y ][ p.x ];
    if ( cell === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    } else if ( cell === 4 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 50;
      game.dotsRemaining--;
      // Power pellet: asusta a todos y reinicia timer y cadena.
      game.frightenedTimer = FRIGHTENED_FRAMES;
      game.ghostEatChain = 0;
      game.ghosts.forEach( ( g ) => {
        g.frightened = true;
        // Reversa de marcha como aviso; los que salen del corral
        // mantienen su ruta fija.
        if ( !g.exiting ) g.dir = OPPOSITE[ g.dir ];
      } );
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

// Objetivo de punteria del fantasma g. Punto de referencia para comparar
// distancias; puede caer fuera del laberinto.
function targetForKind( game, g ) {
  const p = game.pacman;
  const px = Math.round( p.x );
  const py = Math.round( p.y );

  if ( g.kind === 'pinky' ) {
    // Embosca: 4 celdas delante de la mirada de Pac-Man (up sin desvio).
    const d = DIRS[ p.dir ];
    return { x: px + 4 * d.x, y: py + 4 * d.y };
  }

  if ( g.kind === 'inky' ) {
    // Flanquea: 2·(Pac-Man + 2·mirada) − celda de blinky.
    // Fallback sin blinky: la celda de Pac-Man.
    const b = game.ghosts.find( ( gh ) => gh.kind === 'blinky' );
    if ( !b ) return { x: px, y: py };
    const d = DIRS[ p.dir ];
    const ax = px + 2 * d.x;
    const ay = py + 2 * d.y;
    return { x: 2 * ax - Math.round( b.x ), y: 2 * ay - Math.round( b.y ) };
  }

  if ( g.kind === 'clyde' ) {
    // Timido: persigue a mas de 8 de distancia Manhattan;
    // a 8 o menos, huye a su esquina inferior-izquierda.
    const dist =
      Math.abs( Math.round( g.x ) - px ) + Math.abs( Math.round( g.y ) - py );
    if ( dist > 8 ) return { x: px, y: py };
    return { x: 1, y: 29 };
  }

  // blinky: persigue directo la celda de Pac-Man.
  return { x: px, y: py };
}

function decideGhost( game, g ) {
  const grid = game.grid;

  const options = Object.keys( DIRS ).filter(
    ( dir ) =>
      dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost', g.exiting )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  // Asustado: bifurca al azar entre las direcciones validas sin reversa.
  if ( g.frightened ) {
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
    return;
  }

  const target = targetForKind( game, g );

  // Direccion valida sin reversa que minimiza distancia Manhattan al objetivo.
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    const dist = Math.abs( nx - target.x ) + Math.abs( ny - target.y );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

// Direccion de la ruta fija de salida del corral: alinear a la columna
// de GATE_EXIT y subir por la puerta.
function exitDir( g ) {
  const col = Math.round( g.x );
  if ( col < GATE_EXIT.x ) return 'right';
  if ( col > GATE_EXIT.x ) return 'left';
  return 'up';
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );

    // Salida del corral: ruta fija, sin decideGhost mientras exiting.
    // Al llegar a GATE_EXIT se retoma la IA; con dir 'up' decideGhost
    // ya excluye la reversa 'down', justo la puerta.
    if ( g.exiting ) {
      if ( g.x === GATE_EXIT.x && g.y === GATE_EXIT.y ) g.exiting = false;
      else g.dir = exitDir( g );
    }
    if ( !g.exiting ) decideGhost( game, g );

    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost', g.exiting ) ) return;
  }

  const d = DIRS[ g.dir ];
  // Asustado (y no saliendo del corral): mitad de velocidad.
  const speed = g.frightened && !g.exiting ? FRIGHTENED_SPEED : g.speed;
  g.x += d.x * speed;
  g.y += d.y * speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.exiting = !!GHOST_STARTS[ i ].inPen;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  // Cuenta atras del frightened; al llegar a 0 el efecto termina para todos.
  if ( game.frightenedTimer > 0 ) {
    game.frightenedTimer--;
    if ( game.frightenedTimer === 0 ) {
      game.ghosts.forEach( ( g ) => {
        g.frightened = false;
      } );
    }
  }

  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
