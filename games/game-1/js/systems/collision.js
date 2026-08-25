export function playerCaught(state) {
  return state.monsters.some(monster => monster.x === state.player.x && monster.y === state.player.y);
}

export function reachedExit(state) {
  return state.player.x === state.maze.exit.x && state.player.y === state.maze.exit.y;
}
