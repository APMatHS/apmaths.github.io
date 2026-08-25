import { CONFIG, DIRECTIONS } from '../config.js';
import { getCell } from '../maze/mazeUtils.js';

export function hasLineOfSight(maze, observer, target, range = CONFIG.MONSTER_VISION) {
  const dx = target.x - observer.x, dy = target.y - observer.y;
  if (dx !== 0 && dy !== 0) return false;
  const distance = Math.abs(dx) + Math.abs(dy);
  if (!distance || distance > range) return false;
  const directionName = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
  const direction = DIRECTIONS[directionName];
  let x = observer.x, y = observer.y;
  for (let step = 0; step < distance; step += 1) {
    const cell = getCell(maze, x, y);
    if (!cell || cell.walls[direction.wall]) return false;
    x += direction.dx;
    y += direction.dy;
  }
  return true;
}

export function revealAroundPlayer(maze, player, radius = CONFIG.PLAYER_VISION) {
  const range = Math.ceil(radius);
  for (let y = player.y - range; y <= player.y + range; y += 1) {
    for (let x = player.x - range; x <= player.x + range; x += 1) {
      const cell = getCell(maze, x, y);
      const dx = Math.abs(x - player.x), dy = Math.abs(y - player.y);
      if (cell && Math.max(dx, dy) <= 2 && !(dx === 2 && dy === 2)) cell.explored = true;
    }
  }
}
