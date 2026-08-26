import { CONFIG, DIRECTIONS } from '../config.js';
import { canMove } from '../maze/mazeUtils.js';

export function tryPlayerMove(state, directionName, now = performance.now()) {
  if (state.status !== 'playing' || state.animation) return false;
  const player = state.player;
  if (!canMove(state.maze, player.x, player.y, directionName)) return false;
  const direction = DIRECTIONS[directionName];
  const from = { x: player.x, y: player.y };
  player.x += direction.dx;
  player.y += direction.dy;
  player.facing = directionName;
  state.animation = { from, to: { x: player.x, y: player.y }, startedAt: now, duration: CONFIG.PLAYER_MOVE_MS };
  state.turn += 1;
  state.moves += 1;
  return true;
}

export function updatePlayerMovement(state, now) {
  const animation = state.animation;
  if (!animation) return false;
  const t = Math.min(1, (now - animation.startedAt) / animation.duration);
  const eased = 1 - Math.pow(1 - t, 3);
  state.player.renderX = animation.from.x + (animation.to.x - animation.from.x) * eased;
  state.player.renderY = animation.from.y + (animation.to.y - animation.from.y) * eased;
  if (t >= 1) {
    state.player.renderX = state.player.x;
    state.player.renderY = state.player.y;
    state.animation = null;
    return true;
  }
  return false;
}

export function updateMonsterMovement(state, now) {
  const hadAnimations = state.monsterAnimations.length > 0;
  state.monsterAnimations = state.monsterAnimations.filter(animation => {
    const monster = state.monsters.find(item => item.id === animation.id);
    if (!monster) return false;
    const t = Math.min(1, (now - animation.startedAt) / animation.duration);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    monster.renderX = animation.from.x + (animation.to.x - animation.from.x) * eased;
    monster.renderY = animation.from.y + (animation.to.y - animation.from.y) * eased;
    if (t >= 1) {
      monster.renderX = monster.x;
      monster.renderY = monster.y;
      return false;
    }
    return true;
  });
  return hadAnimations && state.monsterAnimations.length === 0;
}
