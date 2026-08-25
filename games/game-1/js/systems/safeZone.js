import { getCell } from '../maze/mazeUtils.js';

export function visitCurrentCell(state) {
  const cell = getCell(state.maze, state.player.x, state.player.y);
  if (!cell) return { safe: false, life: false, exit: false };
  cell.visited = true;
  let safe = false, life = false;
  if (cell.safe) {
    state.lastSafe = { x: cell.x, y: cell.y };
    if (!cell.safeUsed) {
      cell.safeUsed = true;
      state.safeVisited += 1;
      safe = true;
    }
  }
  if (cell.extraLife && !cell.lifeUsed) {
    cell.lifeUsed = true;
    life = true;
  }
  return { safe, life, exit: cell.exit };
}
