import React, { useCallback, useEffect, useMemo, useState } from "react";
import socket, {
  type CellPayload,
  type GamePayload,
  type LeaderboardEntry,
  type UserPayload,
} from "./socket";
import Grid from "./components/Grid";
import Header from "./components/Header";
import Leaderboard from "./components/Leaderboard";
import Toast from "./components/Toast";
import { useCooldown } from "./hooks/useCooldown";
import { cellKey } from "./cellKey";
import "./App.css";

interface ToastMsg {
  id: number;
  text: string;
  type: "error" | "info";
}

let toastId = 0;

export default function App() {
  const [game, setGame] = useState<GamePayload | null>(null);
  const [cells, setCells] = useState<Map<string, CellPayload>>(new Map());
  const [me, setMe] = useState<UserPayload | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const { cooldownMs, isCooldown, startCooldown } = useCooldown();

  const totalCells = useMemo(
    () => (game ? game.rows * game.cols : 0),
    [game]
  );

  const addToast = useCallback((text: string, type: ToastMsg["type"] = "info") => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("init_state", ({ game: rawGame, cells: rawCells, me: rawMe, onlineCount: count }) => {
      const map = new Map<string, CellPayload>();
      rawCells.forEach((c) => map.set(cellKey(c.row, c.col), c));
      setGame(rawGame);
      setCells(map);
      setMe(rawMe);
      setOnlineCount(count);
    });

    socket.on("cell_updated", (cell) => {
      setCells((prev) => {
        const next = new Map(prev);
        next.set(cellKey(cell.row, cell.col), cell);
        return next;
      });
    });

    socket.on("leaderboard_update", (entries) => {
      setLeaderboard(entries);
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
    (row: number, col: number) => {
      if (!connected || !game) return;
      startCooldown(game.cooldownMs);
      socket.emit("claim_cell", { row, col });
    },
    [connected, game, startCooldown]
  );

  return (
    <div className="app">
      <Header
        gameName={game?.name ?? "Capture"}
        me={me}
        onlineCount={onlineCount}
        cooldownMs={cooldownMs}
        cooldownMaxMs={game?.cooldownMs ?? 1500}
        totalCells={totalCells}
      />
      <div className="app__body">
        {game && (
          <Grid
            rows={game.rows}
            cols={game.cols}
            cells={cells}
            myId={me?.id ?? null}
            isCooldown={isCooldown}
            onClaim={handleClaim}
          />
        )}
        <Leaderboard
          entries={leaderboard}
          myId={me?.id ?? null}
          totalCells={totalCells}
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
