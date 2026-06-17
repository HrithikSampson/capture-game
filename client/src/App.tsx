import React, { useCallback, useEffect, useRef, useState } from "react";
import socket, {
  type CellPayload,
  type LeaderboardEntry,
  type UserPayload,
} from "./socket";
import Grid from "./components/Grid";
import Header from "./components/Header";
import Leaderboard from "./components/Leaderboard";
import Toast from "./components/Toast";
import { useCooldown } from "./hooks/useCooldown";
import "./App.css";

const GRID_ROWS = 30;
const GRID_COLS = 50;
const TOTAL_CELLS = GRID_ROWS * GRID_COLS;

interface ToastMsg {
  id: number;
  text: string;
  type: "error" | "info";
}

let toastId = 0;

export default function App() {
  const [cells, setCells] = useState<Map<string, CellPayload>>(new Map());
  const [me, setMe] = useState<UserPayload | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const { cooldownMs, isCooldown, startCooldown } = useCooldown();

  const addToast = useCallback((text: string, type: ToastMsg["type"] = "info") => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("init_state", ({ cells: rawCells, me: rawMe, onlineCount: count }) => {
      const map = new Map<string, CellPayload>();
      rawCells.forEach((c) => map.set(c.id, c));
      setCells(map);
      setMe(rawMe);
      setOnlineCount(count);
    });

    socket.on("cell_updated", (cell) => {
      setCells((prev) => {
        const next = new Map(prev);
        next.set(cell.id, cell);
        return next;
      });
      // Update my score if I'm involved
      setMe((prev) => {
        if (!prev) return prev;
        return prev; // score is pushed via leaderboard_update
      });
    });

    socket.on("leaderboard_update", (entries) => {
      setLeaderboard(entries);
      // Sync my score from leaderboard
      setMe((prev) => {
        if (!prev) return prev;
        const entry = entries.find((e) => e.id === prev.id);
        if (entry) return { ...prev, score: entry.score };
        return { ...prev, score: 0 };
      });
    });

    socket.on("online_count", (count) => setOnlineCount(count));

    socket.on("cooldown_rejected", ({ remainingMs }) => {
      startCooldown(remainingMs);
      addToast(`Wait ${(remainingMs / 1000).toFixed(1)}s before capturing again`, "error");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("init_state");
      socket.off("cell_updated");
      socket.off("leaderboard_update");
      socket.off("online_count");
      socket.off("cooldown_rejected");
    };
  }, [startCooldown, addToast]);

  const handleClaim = useCallback(
    (cellId: string) => {
      if (!connected) return;
      // Optimistic cooldown (1500ms matches server)
      startCooldown(1500);
      socket.emit("claim_cell", { cellId });
    },
    [connected, startCooldown]
  );

  return (
    <div className="app">
      <Header
        me={me}
        onlineCount={onlineCount}
        cooldownMs={cooldownMs}
        totalCells={TOTAL_CELLS}
      />
      <div className="app__body">
        <Grid
          cells={cells}
          myId={me?.id ?? null}
          isCooldown={isCooldown}
          onClaim={handleClaim}
        />
        <Leaderboard
          entries={leaderboard}
          myId={me?.id ?? null}
          totalCells={TOTAL_CELLS}
        />
      </div>

      {!connected && (
        <div className="app__disconnected">
          <span className="app__disconnected-dot" />
          Connecting…
        </div>
      )}

      <div className="app__toasts">
        {toasts.map((t) => (
          <Toast key={t.id} text={t.text} type={t.type} />
        ))}
      </div>
    </div>
  );
}
