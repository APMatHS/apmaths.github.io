import { DIRECTIONS } from '../config.js';

export const cellKey = (x, y) => `${x},${y}`;
export const inBounds = (maze, x, y) => x >= 0 && y >= 0 && x < maze.cols && y < maze.rows;
export const getCell = (maze, x, y) => inBounds(maze, x, y) ? maze.cells[y][x] : null;

export function canMove(maze, x, y, directionName) {
  const direction = DIRECTIONS[directionName];
  const cell = getCell(maze, x, y);
  return Boolean(direction && cell && !cell.walls[direction.wall] &&
    inBounds(maze, x + direction.dx, y + direction.dy));
}

export function openNeighbors(maze, x, y) {
  return Object.entries(DIRECTIONS)
    .filter(([name]) => canMove(maze, x, y, name))
    .map(([name, d]) => ({ name, x: x + d.dx, y: y + d.dy }));
}

export const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function shortestPath(maze, start, goal) {
  const queue = [{ x: start.x, y: start.y }];
  const parents = new Map([[cellKey(start.x, start.y), null]]);
  for (let i = 0; i < queue.length; i += 1) {
    const current = queue[i];
    if (current.x === goal.x && current.y === goal.y) break;
    for (const next of openNeighbors(maze, current.x, current.y)) {
      const key = cellKey(next.x, next.y);
      if (!parents.has(key)) {
        parents.set(key, current);
        queue.push({ x: next.x, y: next.y });
      }
    }
  }
  const goalKey = cellKey(goal.x, goal.y);
  if (!parents.has(goalKey)) return [];
  const path = [];
  let current = { x: goal.x, y: goal.y };
  while (current) {
    path.push(current);
    current = parents.get(cellKey(current.x, current.y));
  }
  return path.reverse();
}

export function farthestCell(maze, start) {
  const queue = [{ ...start, distance: 0 }];
  const seen = new Set([cellKey(start.x, start.y)]);
  let farthest = queue[0];
  for (let i = 0; i < queue.length; i += 1) {
    const current = queue[i];
    if (current.distance > farthest.distance) farthest = current;
    for (const next of openNeighbors(maze, current.x, current.y)) {
      const key = cellKey(next.x, next.y);
      if (!seen.has(key)) {
        seen.add(key);
        queue.push({ x: next.x, y: next.y, distance: current.distance + 1 });
      }
    }
  }
  return farthest;
}
