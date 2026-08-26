export const CONFIG = Object.freeze({
  SUPABASE_URL: 'https://cboppgbnzqvnrsjwzmeu.supabase.co',
  SUPABASE_KEY: 'sb_publishable_90BXyMFlso8A4iOVi327OQ_4X13Rudl',
  COLS: 31,
  ROWS: 31,
  CELL_SIZE: 42,
  WALL_WIDTH: 5,
  PLAYER_VISION: 2.45,
  MONSTER_VISION: 4,
  SAFE_RATE: 1 / 27,
  EXTRA_LIVES: 3,
  STARTING_LIVES: 3,
  MAX_LIVES: 5,
  PLAYER_MOVE_MS: 115,
  MONSTER_MOVE_MS: 150,
  RENDER_FPS: 30,
  MAX_DPR: 1.5,
  MONSTER_STEP_EVERY: 2,
  MONSTER_COUNT: 3,
  MIN_MONSTER_DISTANCE: 14,
  SCORE: { moves: 6000, time: 3000, survival: [1000, 700, 400] },
  COLORS: {
    floor: '#0b151d', visited: '#10232c', wall: '#46616c',
    wallGlow: 'rgba(105, 215, 199, .16)', player: '#f5fcff',
    monster: '#ff667d', safe: '#65e7b5', life: '#ffd166', exit: '#7ea7ff'
  }
});

export const DIRECTIONS = Object.freeze({
  up: { dx: 0, dy: -1, wall: 'top', opposite: 'bottom' },
  right: { dx: 1, dy: 0, wall: 'right', opposite: 'left' },
  down: { dx: 0, dy: 1, wall: 'bottom', opposite: 'top' },
  left: { dx: -1, dy: 0, wall: 'left', opposite: 'right' }
});
