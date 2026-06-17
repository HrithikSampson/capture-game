import { PLAYER_COLORS } from "../userGenerator";

let colorIndex = 0;

export function assignPlayerColor(): string {
  const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  colorIndex++;
  return color;
}

export function toPlayerPayload(player: {
  id: string;
  username: string;
  color: string;
}) {
  return {
    id: player.id,
    username: player.username,
    color: player.color,
  };
}
