import { CONFIG, DIRECTIONS } from '../config.js';
import { cellKey, farthestCell, manhattan } from './mazeUtils.js';

const randomItem = items => items[Math.floor(Math.random() * items.length)];

function makeCell(x, y) {
  return {
    x, y, walls: { top: true, right: true, bottom: true, left: true },
    visited: false, explored: false, safe: false, safeUsed: false,
    extraLife: false, lifeUsed: false, exit: false
  };
}

function carvePassages(maze) {
  const stack = [maze.cells[0][0]];
  const carved = new Set([cellKey(0, 0)]);
  while (stack.length) {
    const current = stack[stack.length - 1];
    const choices = Object.entries(DIRECTIONS).filter(([, d]) => {
      const nx = current.x + d.dx, ny = current.y + d.dy;
      return nx >= 0 && ny >= 0 && nx < maze.cols && ny < maze.rows && !carved.has(cellKey(nx, ny));
    });
    if (!choices.length) { stack.pop(); continue; }
    const [, d] = randomItem(choices);
    const next = maze.cells[current.y + d.dy][current.x + d.dx];
    current.walls[d.wall] = false;
    next.walls[d.opposite] = false;
    carved.add(cellKey(next.x, next.y));
    stack.push(next);
  }
}

function addLoops(maze) {
  const attempts = Math.floor(maze.cols * maze.rows * 0.06);
  for (let i = 0; i < attempts; i += 1) {
    const x = Math.floor(Math.random() * maze.cols), y = Math.floor(Math.random() * maze.rows);
    const choices = Object.values(DIRECTIONS).filter(d => {
      const nx = x + d.dx, ny = y + d.dy;
      return nx >= 0 && ny >= 0 && nx < maze.cols && ny < maze.rows;
    });
    const d = randomItem(choices), cell = maze.cells[y][x];
    cell.walls[d.wall] = false;
    maze.cells[y + d.dy][x + d.dx].walls[d.opposite] = false;
  }
}

function scatterFeatures(maze, start, exit) {
  const candidates = maze.cells.flat().filter(c => manhattan(c, start) > 4 && manhattan(c, exit) > 2);
  const safeCount = Math.max(6, Math.round(maze.cols * maze.rows * CONFIG.SAFE_RATE));
  for (let i = 0; i < safeCount && candidates.length; i += 1) {
    const index = Math.floor(Math.random() * candidates.length);
    candidates.splice(index, 1)[0].safe = true;
  }
  for (let i = 0; i < CONFIG.EXTRA_LIVES && candidates.length; i += 1) {
    const index = Math.floor(Math.random() * candidates.length);
    candidates.splice(index, 1)[0].extraLife = true;
  }
}

export function generateMaze(cols = CONFIG.COLS, rows = CONFIG.ROWS) {
  const maze = { cols, rows, cells: Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => makeCell(x, y))) };
  carvePassages(maze);
  addLoops(maze);
  const start = { x: 0, y: 0 };
  const exit = farthestCell(maze, start);
  maze.start = start;
  maze.exit = { x: exit.x, y: exit.y };
  maze.cells[exit.y][exit.x].exit = true;
  maze.cells[0][0].safe = true;
  scatterFeatures(maze, start, maze.exit);
  return maze;
}
