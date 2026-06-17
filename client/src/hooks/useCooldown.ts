import { useState, useEffect, useRef, useCallback } from "react";

export function useCooldown() {
  const [cooldownMs, setCooldownMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback((durationMs: number) => {
    setCooldownMs(durationMs);
    if (timerRef.current) clearInterval(timerRef.current);
    const step = 50;
    timerRef.current = setInterval(() => {
      setCooldownMs((prev) => {
        const next = prev - step;
        if (next <= 0) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return next;
      });
    }, step);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return { cooldownMs, isCooldown: cooldownMs > 0, startCooldown };
}
