import { CONFIG } from '../config.js';

export function createHud() {
  const lives = document.querySelector('#lives');
  const safeCount = document.querySelector('#safe-count');
  const moveCount = document.querySelector('#move-count');
  const timeCount = document.querySelector('#time-count');
  let previousLives = -1, previousSafe = -1, previousMoves = -1, previousSecond = -1;
  return {
    update(state, now = performance.now()) {
      if (state.lives !== previousLives) {
        lives.innerHTML = Array.from({ length: CONFIG.MAX_LIVES }, (_, index) =>
          `<span class="heart${index >= state.lives ? ' heart--lost' : ''}">♥</span>`
        ).join('');
        lives.setAttribute('aria-label', `${state.lives} mạng`);
        previousLives = state.lives;
      }
      if (state.safeVisited !== previousSafe) {
        safeCount.textContent = String(state.safeVisited);
        previousSafe = state.safeVisited;
      }
      if (state.moves !== previousMoves) {
        moveCount.textContent = String(state.moves);
        previousMoves = state.moves;
      }
      const elapsed = state.startedAt
        ? (state.finishedTime || Math.max(0, now - state.startedAt)) / 1000
        : 0;
      const second = Math.floor(elapsed);
      if (second !== previousSecond) {
        const minutes = Math.floor(second / 60).toString().padStart(2, '0');
        const seconds = (second % 60).toString().padStart(2, '0');
        timeCount.textContent = `${minutes}:${seconds}`;
        previousSecond = second;
      }
    }
  };
}
