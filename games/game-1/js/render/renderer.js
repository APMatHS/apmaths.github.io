import { CONFIG } from '../config.js';
import { resizeCanvas, updateCamera } from './camera.js';
import { applyLighting } from './lighting.js';
import { drawSpawnShield, pulse } from './animations.js';

function visibleRange(camera, viewport, maze) {
  const size = CONFIG.CELL_SIZE;
  return {
    minX: Math.max(0, Math.floor(camera.x / size) - 1),
    maxX: Math.min(maze.cols - 1, Math.ceil((camera.x + viewport.width) / size) + 1),
    minY: Math.max(0, Math.floor(camera.y / size) - 1),
    maxY: Math.min(maze.rows - 1, Math.ceil((camera.y + viewport.height) / size) + 1)
  };
}

function drawCell(ctx, cell, camera, now) {
  const size = CONFIG.CELL_SIZE, x = cell.x * size - camera.x, y = cell.y * size - camera.y;
  ctx.fillStyle = cell.visited ? CONFIG.COLORS.visited : CONFIG.COLORS.floor;
  ctx.fillRect(x, y, size, size);
  if (cell.safe) {
    ctx.strokeStyle = cell.safeUsed ? 'rgba(101,231,181,.35)' : CONFIG.COLORS.safe;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 10, y + 10, size - 20, size - 20);
  }
  if (cell.extraLife && !cell.lifeUsed) {
    ctx.fillStyle = CONFIG.COLORS.life;
    ctx.font = `bold ${Math.floor(size * 0.44)}px system-ui`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('♥', x + size / 2, y + size / 2 + 1);
  }
  if (cell.exit) {
    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    ctx.rotate(Math.PI / 4);
    const scale = 0.72 + pulse(now) * 0.12;
    ctx.strokeStyle = CONFIG.COLORS.exit; ctx.lineWidth = 3;
    ctx.strokeRect(-size * 0.2 * scale, -size * 0.2 * scale, size * 0.4 * scale, size * 0.4 * scale);
    ctx.restore();
  }
  const w = CONFIG.WALL_WIDTH;
  ctx.lineWidth = w; ctx.lineCap = 'square'; ctx.strokeStyle = CONFIG.COLORS.wall;
  ctx.shadowColor = CONFIG.COLORS.wallGlow; ctx.shadowBlur = 3;
  ctx.beginPath();
  if (cell.walls.top) { ctx.moveTo(x, y); ctx.lineTo(x + size, y); }
  if (cell.walls.right) { ctx.moveTo(x + size, y); ctx.lineTo(x + size, y + size); }
  if (cell.walls.bottom) { ctx.moveTo(x + size, y + size); ctx.lineTo(x, y + size); }
  if (cell.walls.left) { ctx.moveTo(x, y + size); ctx.lineTo(x, y); }
  ctx.stroke(); ctx.shadowBlur = 0;
}

function drawPlayer(ctx, player, camera, state, now) {
  const size = CONFIG.CELL_SIZE;
  const x = player.renderX * size + size / 2 - camera.x;
  const y = player.renderY * size + size / 2 - camera.y;
  const bob = state.animation ? Math.sin(now * 0.035) * 2 : 0;
  ctx.save(); ctx.translate(x, y + bob);
  ctx.fillStyle = CONFIG.COLORS.player; ctx.shadowColor = 'rgba(255,255,255,.75)'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(0, 0, size * 0.23, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#071019';
  const eyeX = player.facing === 'left' ? -5 : player.facing === 'right' ? 5 : 0;
  const eyeY = player.facing === 'up' ? -5 : player.facing === 'down' ? 5 : 0;
  ctx.beginPath(); ctx.arc(eyeX, eyeY, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  drawSpawnShield(ctx, x, y, size * 0.34, now, state.invulnerableUntil);
}

function drawMonster(ctx, monster, camera, now) {
  const size = CONFIG.CELL_SIZE;
  const x = monster.renderX * size + size / 2 - camera.x;
  const y = monster.renderY * size + size / 2 - camera.y;
  ctx.save(); ctx.translate(x, y);
  const r = size * (0.22 + pulse(now + monster.id * 400, 0.006) * 0.035);
  ctx.fillStyle = CONFIG.COLORS.monster; ctx.shadowColor = CONFIG.COLORS.monster; ctx.shadowBlur = monster.alerted ? 22 : 10;
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.75); ctx.quadraticCurveTo(-r * 1.15, -r * 0.7, 0, -r);
  ctx.quadraticCurveTo(r * 1.15, -r * 0.7, r, r * 0.75);
  ctx.lineTo(r * 0.45, r * 0.48); ctx.lineTo(0, r * 0.82); ctx.lineTo(-r * 0.45, r * 0.48); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#24040a';
  ctx.beginPath(); ctx.arc(-r * 0.34, -r * 0.12, 2.2, 0, Math.PI * 2); ctx.arc(r * 0.34, -r * 0.12, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  return function render(state, now) {
    if (!state.maze || !state.player) return;
    const viewport = resizeCanvas(canvas);
    ctx.setTransform(viewport.ratio, 0, 0, viewport.ratio, 0, 0);
    updateCamera(state.camera, state.player, viewport, state.maze);
    ctx.fillStyle = '#03070b'; ctx.fillRect(0, 0, viewport.width, viewport.height);
    const range = visibleRange(state.camera, viewport, state.maze);
    for (let y = range.minY; y <= range.maxY; y += 1) {
      for (let x = range.minX; x <= range.maxX; x += 1) drawCell(ctx, state.maze.cells[y][x], state.camera, now);
    }
    for (const monster of state.monsters) drawMonster(ctx, monster, state.camera, now);
    drawPlayer(ctx, state.player, state.camera, state, now);
    applyLighting(ctx, viewport, state.camera, state.player);
  };
}
