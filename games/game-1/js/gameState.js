import { CONFIG } from './config.js';

export function createGameState() {
  return {
    status: 'loading', maze: null, player: null, monsters: [],
    lives: CONFIG.STARTING_LIVES, safeVisited: 0, lastSafe: { x: 0, y: 0 },
    turn: 0, moves: 0, livesLost: 0, shortestPathLength: 0,
    animation: null, monsterAnimations: [], camera: { x: 0, y: 0 },
    startedAt: 0, finishedTime: 0, finalScore: 0,
    message: '', invulnerableUntil: 0
  };
}

export function resetRoundState(state, maze, player, monsters) {
  Object.assign(state, {
    status: 'ready', maze, player, monsters, lives: CONFIG.STARTING_LIVES,
    safeVisited: 0, lastSafe: { x: player.x, y: player.y }, turn: 0,
    moves: 0, livesLost: 0, shortestPathLength: 0,
    animation: null, monsterAnimations: [], startedAt: 0,
    finishedTime: 0, finalScore: 0, invulnerableUntil: 0, message: ''
  });
  return state;
}
