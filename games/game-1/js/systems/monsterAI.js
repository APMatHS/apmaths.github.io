import { CONFIG } from '../config.js';
import { openNeighbors, shortestPath, manhattan } from '../maze/mazeUtils.js';
import { hasLineOfSight } from './vision.js';

function occupied(state, x, y, exceptId) {
  return state.monsters.some(monster => monster.id !== exceptId && monster.x === x && monster.y === y);
}

function choosePatrolStep(state, monster) {
  const options = openNeighbors(state.maze, monster.x, monster.y)
    .filter(cell => !occupied(state, cell.x, cell.y, monster.id));
  if (!options.length) return null;
  const awayFromStart = options.filter(cell => manhattan(cell, state.maze.start) > 4);
  const pool = awayFromStart.length ? awayFromStart : options;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function runMonsterTurn(state, now = performance.now()) {
  const shouldMove = state.turn % CONFIG.MONSTER_STEP_EVERY === 0;
  for (const monster of state.monsters) {
    const seesPlayer = hasLineOfSight(state.maze, monster, state.player);
    monster.alerted = seesPlayer;
    if (!shouldMove) continue;
    let next = null;
    if (seesPlayer) {
      const path = shortestPath(state.maze, monster, state.player);
      next = path[1] || null;
    } else if (Math.random() < 0.58) {
      next = choosePatrolStep(state, monster);
    }
    if (!next || occupied(state, next.x, next.y, monster.id)) continue;
    const from = { x: monster.x, y: monster.y };
    monster.facing = next.x > monster.x ? 'right' : next.x < monster.x ? 'left' : next.y > monster.y ? 'down' : 'up';
    monster.x = next.x;
    monster.y = next.y;
    state.monsterAnimations.push({ id: monster.id, from, to: { x: next.x, y: next.y }, startedAt: now, duration: CONFIG.MONSTER_MOVE_MS });
  }
}
