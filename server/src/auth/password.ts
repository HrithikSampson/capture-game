import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;
const JWT_EXPIRY = "7d";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

export interface JwtPayload {
  playerId: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(playerId: string): string {
  return jwt.sign({ playerId } satisfies JwtPayload, getJwtSecret(), {
    expiresIn: JWT_EXPIRY,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function validateCredentials(
  username: string,
  password: string
): string | null {
  if (!USERNAME_RE.test(username)) {
    return "Username must be 3–20 characters (letters, numbers, underscore)";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }
  return null;
}
