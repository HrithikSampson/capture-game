import { io, Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "./socketTypes";

export type { ServerToClientEvents, ClientToServerEvents } from "./socketTypes";
export type {
  GamePayload,
  CellPayload,
  PlayerPayload,
  LeaderboardEntry,
} from "./socketTypes";

const TOKEN_KEY = "capture_token";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) throw new Error("Socket not connected");
  return socket;
}

export function connectSocket(token: string): Socket<
  ServerToClientEvents,
  ClientToServerEvents
> {
  if (socket?.connected) {
    socket.disconnect();
  }

  socket = io({
    transports: ["websocket", "polling"],
    autoConnect: true,
    auth: { token },
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
