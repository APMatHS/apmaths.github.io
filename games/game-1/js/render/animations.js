export const pulse = (time, speed = 0.005) => (Math.sin(time * speed) + 1) / 2;

export function drawSpawnShield(ctx, x, y, radius, now, activeUntil) {
  if (now >= activeUntil) return;
  const alpha = 0.25 + pulse(now, 0.012) * 0.35;
  ctx.save();
  ctx.strokeStyle = `rgba(87, 227, 192, ${alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius * (1 + pulse(now) * 0.12), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
