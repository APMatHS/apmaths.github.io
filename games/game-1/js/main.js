import { createGameState, resetRoundState } from './gameState.js';
import { CONFIG } from './config.js';
import { generateMaze } from './maze/mazeGenerator.js';
import { shortestPath } from './maze/mazeUtils.js';
import { createPlayer } from './entities/player.js';
import { createMonsters } from './entities/monster.js';
import { bindInput } from './systems/input.js';
import { tryPlayerMove, updatePlayerMovement, updateMonsterMovement } from './systems/movement.js';
import { runMonsterTurn } from './systems/monsterAI.js';
import { revealAroundPlayer } from './systems/vision.js';
import { visitCurrentCell } from './systems/safeZone.js';
import { addLife, loseLife } from './systems/lives.js';
import { playerCaught, reachedExit } from './systems/collision.js';
import { createRenderer } from './render/renderer.js';
import { createHud } from './ui/hud.js';
import { createScreens } from './ui/screens.js';

const canvas = document.querySelector('#game-canvas');
const state = createGameState();
const render = createRenderer(canvas);
const hud = createHud();
const screens = createScreens();
let pendingTurnResolution = false;
let leaderboardReturnStatus = 'ready';

const apiHeaders = {
  apikey: CONFIG.SUPABASE_KEY,
  'Content-Type': 'application/json'
};

async function callRpc(functionName, body = {}) {
  const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: 'POST', headers: apiHeaders, body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Supabase RPC ${functionName}: ${response.status}`);
  return response.json();
}

const getLeaderboard = () => callRpc('get_game1_top10');

function calculateScore(shortest, moves, timeSeconds, livesLost) {
  const stepScore = Math.round(CONFIG.SCORE.moves * Math.sqrt(shortest / Math.max(shortest, moves)));
  const parTime = Math.max(60, 0.8 * shortest);
  const timeScore = Math.round(CONFIG.SCORE.time * Math.sqrt(parTime / Math.max(parTime, timeSeconds)));
  const survivalScore = CONFIG.SCORE.survival[livesLost] || 0;
  return Math.min(10000, stepScore + timeScore + survivalScore);
}

function finalDetails() {
  const timeSeconds = Math.max(1, state.finishedTime / 1000);
  return {
    score: state.finalScore, moves: state.moves, timeSeconds,
    shortestPath: state.shortestPathLength, livesLost: state.livesLost
  };
}

function beats(candidate, record) {
  if (candidate.score !== Number(record.score)) return candidate.score > Number(record.score);
  if (candidate.moves !== Number(record.moves)) return candidate.moves < Number(record.moves);
  return candidate.timeSeconds < Number(record.time_seconds);
}

function buildRound() {
  const maze = generateMaze();
  const player = createPlayer(maze.start);
  const monsters = createMonsters(maze);
  resetRoundState(state, maze, player, monsters);
  state.shortestPathLength = shortestPath(maze, maze.start, maze.exit).length - 1;
  maze.cells[player.y][player.x].visited = true;
  maze.cells[player.y][player.x].safeUsed = true;
  state.safeVisited = 1;
  revealAroundPlayer(maze, player);
  pendingTurnResolution = false;
  hud.update(state);
}

async function finishGame(won, now = performance.now()) {
  state.status = won ? 'won' : 'lost';
  if (!won) { screens.showResult(false); return; }
  state.finishedTime = Math.max(1000, now - state.startedAt);
  const details = finalDetails();
  state.finalScore = calculateScore(details.shortestPath, details.moves, details.timeSeconds, details.livesLost);
  details.score = state.finalScore;
  screens.showResult(true, details);
  try {
    const records = await getLeaderboard();
    if (records.length < 10 || beats(details, records[records.length - 1])) screens.showScoreEntry(details);
  } catch (error) {
    console.warn('Không thể kiểm tra bảng kỷ lục:', error);
  }
}

function handleCapture(now) {
  if (!playerCaught(state)) return false;
  const result = loseLife(state, now);
  hud.update(state);
  if (result === 'lost') finishGame(false, now);
  else if (result === 'respawned') revealAroundPlayer(state.maze, state.player);
  return result !== 'ignored';
}

function resolvePlayerTurn(now) {
  const event = visitCurrentCell(state);
  if (event.life) addLife(state);
  revealAroundPlayer(state.maze, state.player);
  hud.update(state);
  if (event.exit || reachedExit(state)) { finishGame(true, now); return; }
  if (handleCapture(now)) return;
  runMonsterTurn(state, now);
  handleCapture(now);
}

function move(direction) {
  if (tryPlayerMove(state, direction)) pendingTurnResolution = true;
}

function togglePause() {
  if (state.status === 'playing') {
    state.status = 'paused';
    screens.show('pause');
  } else if (state.status === 'paused') {
    state.status = 'playing';
    screens.hideAll();
  }
}

function startGame() {
  state.status = 'playing';
  state.startedAt = performance.now();
  screens.hideAll();
  canvas.focus();
}

function restartGame() {
  buildRound();
  screens.show('start');
}

async function openLeaderboard() {
  leaderboardReturnStatus = state.status;
  if (state.status === 'playing') state.status = 'paused';
  screens.showLeaderboardLoading();
  try { screens.showLeaderboard(await getLeaderboard()); }
  catch (error) { console.warn(error); screens.showLeaderboardError(); }
}

function closeLeaderboard() {
  if (leaderboardReturnStatus === 'playing') {
    state.status = 'playing';
    screens.hideAll();
  } else if (leaderboardReturnStatus === 'won') {
    screens.showResult(true, finalDetails());
  } else if (leaderboardReturnStatus === 'lost') {
    screens.showResult(false);
  } else {
    screens.show('start');
  }
}

async function saveHighScore(event) {
  event.preventDefault();
  const name = document.querySelector('#player-name').value.trim();
  if (!name || name.length > 20 || /[<>\u0000-\u001f\u007f]/.test(name)) {
    screens.setScoreError('Tên phải có từ 1 đến 20 ký tự hợp lệ.');
    return;
  }
  screens.setScoreSaving(true);
  screens.setScoreError('');
  const details = finalDetails();
  try {
    const result = await callRpc('submit_game1_score', {
      p_player_name: name,
      p_moves: details.moves,
      p_time_seconds: Number(details.timeSeconds.toFixed(2)),
      p_shortest_path: details.shortestPath,
      p_lives_lost: details.livesLost
    });
    localStorage.setItem('game1_player_name', name);
    if (!result[0]?.accepted) {
      screens.setScoreError('Top 10 vừa thay đổi. Kỷ lục này chưa được lưu.');
      return;
    }
    leaderboardReturnStatus = 'won';
    screens.showLeaderboard(await getLeaderboard());
  } catch (error) {
    console.warn(error);
    screens.setScoreError('Không thể lưu kỷ lục. Vui lòng thử lại.');
  } finally {
    screens.setScoreSaving(false);
  }
}

bindInput(canvas, move, togglePause);
document.querySelector('#start-button').addEventListener('click', startGame);
document.querySelector('#pause-button').addEventListener('click', togglePause);
document.querySelector('#resume-button').addEventListener('click', togglePause);
document.querySelector('#restart-button').addEventListener('click', restartGame);
document.querySelector('#leaderboard-button').addEventListener('click', openLeaderboard);
document.querySelector('#close-leaderboard-button').addEventListener('click', closeLeaderboard);
document.querySelector('#score-entry-form').addEventListener('submit', saveHighScore);
document.querySelector('#skip-score-button').addEventListener('click', () => screens.showResult(true, finalDetails()));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.status === 'playing') togglePause();
});

function gameLoop(now) {
  if (state.status !== 'paused') {
    const movementFinished = updatePlayerMovement(state, now);
    updateMonsterMovement(state, now);
    if (movementFinished && pendingTurnResolution && state.status === 'playing') {
      pendingTurnResolution = false;
      resolvePlayerTurn(now);
    }
  }
  render(state, now);
  hud.update(state, now);
  requestAnimationFrame(gameLoop);
}

try {
  buildRound();
  screens.show('start');
  requestAnimationFrame(gameLoop);
} catch (error) {
  console.error('Không thể khởi tạo Game 1:', error);
  document.querySelector('#loading-screen p').textContent = 'Không thể tạo mê cung. Hãy tải lại trang.';
}
