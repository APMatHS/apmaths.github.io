import { CONFIG } from '../config.js';
import { placePlayer } from '../entities/player.js';

export function addLife(state) {
  const before = state.lives;
  state.lives = Math.min(CONFIG.MAX_LIVES, state.lives + 1);
  return state.lives > before;
}

export function loseLife(state, now = performance.now()) {
  if (now < state.invulnerableUntil) return 'ignored';
  state.lives -= 1;
  state.livesLost += 1;
  state.animation = null;
  state.monsterAnimations = [];
  if (state.lives <= 0) {
    state.status = 'lost';
    return 'lost';
  }
  placePlayer(state.player, state.lastSafe);
  state.invulnerableUntil = now + 1200;
  return 'respawned';
}
