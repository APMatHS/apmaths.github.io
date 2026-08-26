const KEY_DIRECTIONS = new Map([
  ['ArrowUp', 'up'], ['w', 'up'], ['W', 'up'],
  ['ArrowRight', 'right'], ['d', 'right'], ['D', 'right'],
  ['ArrowDown', 'down'], ['s', 'down'], ['S', 'down'],
  ['ArrowLeft', 'left'], ['a', 'left'], ['A', 'left']
]);

function isEditableTarget(target) {
  return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));
}

export function bindInput(canvas, onDirection, onPause, getPlayerScreenPoint) {
  const keydown = event => {
    if (isEditableTarget(event.target)) return;
    const direction = KEY_DIRECTIONS.get(event.key);
    if (direction) {
      event.preventDefault();
      onDirection(direction);
    } else if (event.key === 'Escape' || event.key === 'p' || event.key === 'P') {
      event.preventDefault();
      onPause();
    }
  };
  const pointer = event => {
    const rect = canvas.getBoundingClientRect();
    const playerPoint = getPlayerScreenPoint?.();
    const centerX = playerPoint?.x ?? rect.width / 2;
    const centerY = playerPoint?.y ?? rect.height / 2;
    const dx = event.clientX - rect.left - centerX;
    const dy = event.clientY - rect.top - centerY;
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    onDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };
  window.addEventListener('keydown', keydown, { passive: false });
  canvas.addEventListener('pointerdown', pointer, { passive: true });
  return () => {
    window.removeEventListener('keydown', keydown);
    canvas.removeEventListener('pointerdown', pointer);
  };
}
