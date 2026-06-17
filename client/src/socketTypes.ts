export interface GamePayload {
  id: string;
  name: string;
  rows: number;
  cols: number;
  cooldownMs: number;
  status: "active" | "completed";
  completedAt?: string | null;
  winners?: LeaderboardEntry[];
}

export interface CellPayload {
  row: number;
  col: number;
  ownerId: string | null;
  ownerName: string | null;
  ownerColor: string | null;
  capturedAt: string | null;
}

export interface PlayerPayload {
  id: string;
  username: string;
  color: string;
  score: number;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  color: string;
  score: number;
}

export interface ServerToClientEvents {
  init_state: (data: {
    game: GamePayload;
    cells: CellPayload[];
    me: PlayerPayload;
    onlineCount: number;
  }) => void;
  cell_updated: (cell: CellPayload) => void;
  leaderboard_update: (entries: LeaderboardEntry[]) => void;
  online_count: (count: number) => void;
  cooldown_rejected: (data: { remainingMs: number }) => void;
  cell_claim_rejected: (data: {
    row: number;
    col: number;
    reason: "already_claimed" | "game_completed";
  }) => void;
  claim_ack: (data: { row: number; col: number }) => void;
  game_completed: (data: {
    game: GamePayload;
    winners: LeaderboardEntry[];
    finalLeaderboard: LeaderboardEntry[];
  }) => void;
  game_started: (data: {
    game: GamePayload;
    cells: CellPayload[];
    me: PlayerPayload;
    leaderboard: LeaderboardEntry[];
  }) => void;
  create_new_game_rejected: (data: { reason: string }) => void;
}

export interface ClientToServerEvents {
  claim_cell: (data: { row: number; col: number }) => void;
  create_new_game: () => void;
}

export interface AuthResponse {
  token: string;
  player: {
    id: string;
    username: string;
    color: string;
  };
}
