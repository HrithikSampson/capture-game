export const DEFAULT_GAME_ID = "capture-grid";

export const DEFAULT_GAME = {
  id: DEFAULT_GAME_ID,
  name: "Capture Grid",
  rows: 30,
  cols: 50,
  cooldownMs: 1500,
  status: "active" as const,
};
