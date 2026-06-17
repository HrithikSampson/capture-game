const store = new Map<string, Date>();

function key(gameId: string, playerId: string): string {
  return `${gameId}:${playerId}`;
}

export function getCooldownUntil(gameId: string, playerId: string): Date | null {
  return store.get(key(gameId, playerId)) ?? null;
}

export function setCooldownUntil(
  gameId: string,
  playerId: string,
  until: Date
): void {
  store.set(key(gameId, playerId), until);
}

export function clearCooldown(gameId: string, playerId: string): void {
  store.delete(key(gameId, playerId));
}

export function getRemainingMs(gameId: string, playerId: string): number {
  const until = getCooldownUntil(gameId, playerId);
  if (!until) return 0;
  return Math.max(0, until.getTime() - Date.now());
}

export function clearGameCooldowns(gameId: string): void {
  const prefix = `${gameId}:`;
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) {
      store.delete(k);
    }
  }
}
