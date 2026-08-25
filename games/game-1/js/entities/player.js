export function createPlayer(start) {
  return { x: start.x, y: start.y, renderX: start.x, renderY: start.y, facing: 'down' };
}

export function placePlayer(player, position) {
  Object.assign(player, { x: position.x, y: position.y, renderX: position.x, renderY: position.y });
}
