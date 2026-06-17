import type { AuthResponse } from "./socketTypes";

const API_BASE = "";

async function parseJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) {
    if (!res.ok) {
      throw new Error(
        res.status === 502 || res.status === 504
          ? "Server unavailable — make sure the backend is running (npm run dev)"
          : `Request failed (${res.status})`
      );
    }
    return {};
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid response from server");
  }
}

async function authRequest(
  path: string,
  username: string,
  password: string
): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new Error(
      "Cannot reach server — run npm run dev from the project root"
    );
  }

  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Authentication failed"
    );
  }

  return data as AuthResponse;
}

export async function register(
  username: string,
  password: string
): Promise<AuthResponse> {
  return authRequest("/api/auth/register", username, password);
}

export async function login(
  username: string,
  password: string
): Promise<AuthResponse> {
  return authRequest("/api/auth/login", username, password);
}
