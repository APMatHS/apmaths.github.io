import { CONFIG } from '../config.js';
import { manhattan } from '../maze/mazeUtils.js';

export function createMonsters(maze, count = CONFIG.MONSTER_COUNT) {
  const cells = maze.cells.flat().filter(cell =>
    !cell.exit && !cell.safe && manhattan(cell, maze.start) >= CONFIG.MIN_MONSTER_DISTANCE
  );
  const monsters = [];
  while (monsters.length < count && cells.length) {
    const index = Math.floor(Math.random() * cells.length);
    const cell = cells.splice(index, 1)[0];
    if (monsters.every(monster => manhattan(monster, cell) > 6)) {
      monsters.push({
        id: monsters.length, x: cell.x, y: cell.y,
        renderX: cell.x, renderY: cell.y, alerted: false, facing: 'left'
      });
    }
  }
  return monsters;
}
