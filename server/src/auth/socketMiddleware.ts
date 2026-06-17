import { Socket } from "socket.io";
import { verifyToken } from "./password";

export interface AuthenticatedSocket extends Socket {
  data: {
    playerId: string;
  };
}

export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): void {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    next(new Error("Authentication required"));
    return;
  }
  try {
    const { playerId } = verifyToken(token);
    socket.data.playerId = playerId;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
}
