export interface CellPayload {
  id: string;
  row: number;
  col: number;
  ownerId: string | null;
  ownerName: string | null;
  ownerColor: string | null;
  capturedAt: string | null;
}

export interface UserPayload {
  id: string;
  name: string;
  color: string;
  score: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  color: string;
  score: number;
}

export interface ServerToClientEvents {
  init_state: (data: { cells: CellPayload[]; me: UserPayload; onlineCount: number }) => void;
  cell_updated: (cell: CellPayload) => void;
  leaderboard_update: (entries: LeaderboardEntry[]) => void;
  online_count: (count: number) => void;
  cooldown_rejected: (data: { remainingMs: number }) => void;
}

export interface ClientToServerEvents {
  claim_cell: (data: { cellId: string }) => void;
}
