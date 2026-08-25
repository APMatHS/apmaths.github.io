const KEY_DIRECTIONS = new Map([
  ['ArrowUp', 'up'], ['w', 'up'], ['W', 'up'],
  ['ArrowRight', 'right'], ['d', 'right'], ['D', 'right'],
  ['ArrowDown', 'down'], ['s', 'down'], ['S', 'down'],
  ['ArrowLeft', 'left'], ['a', 'left'], ['A', 'left']
]);

export function bindInput(canvas, onDirection, onPause) {
  const keydown = event => {
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
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    onDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };
  window.addEventListener('keydown', keydown, { passive: false });
  canvas.addEventListener('pointerdown', pointer);
  return () => {
    window.removeEventListener('keydown', keydown);
    canvas.removeEventListener('pointerdown', pointer);
  };
}
