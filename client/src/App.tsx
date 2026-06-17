import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  getToken,
  setToken,
  clearToken,
  type CellPayload,
  type GamePayload,
  type LeaderboardEntry,
  type PlayerPayload,
} from "./socket";
import Grid from "./components/Grid";
import Header from "./components/Header";
import Leaderboard from "./components/Leaderboard";
import LoginForm from "./components/LoginForm";
import GameCompleteModal from "./components/GameCompleteModal";
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

type AppPhase = "login" | "connecting" | "playing";

export default function App() {
  const [phase, setPhase] = useState<AppPhase>(() =>
    getToken() ? "connecting" : "login"
  );
  const [game, setGame] = useState<GamePayload | null>(null);
  const [cells, setCells] = useState<Map<string, CellPayload>>(new Map());
  const [me, setMe] = useState<PlayerPayload | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [startingNewGame, setStartingNewGame] = useState(false);
  const { cooldownMs, isCooldown, startCooldown, resetCooldown } = useCooldown();

  const gameCompleted = game?.status === "completed";

  const totalCells = useMemo(
    () => (game ? game.rows * game.cols : 0),
    [game]
  );

  const addToast = useCallback((text: string, type: ToastMsg["type"] = "info") => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const bindSocketEvents = useCallback(() => {
    const socket = getSocket();

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("init_state", ({ game: rawGame, cells: rawCells, me: rawMe, onlineCount: count }) => {
      const map = new Map<string, CellPayload>();
      rawCells.forEach((c) => map.set(cellKey(c.row, c.col), c));
      setGame(rawGame);
      setCells(map);
      setMe(rawMe);
      setOnlineCount(count);
      setPhase("playing");
      setStartingNewGame(false);
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
        return prev;
      });
    });

    socket.on("online_count", (count) => setOnlineCount(count));

    socket.on("cooldown_rejected", ({ remainingMs }) => {
      startCooldown(remainingMs);
      addToast(`Wait ${(remainingMs / 1000).toFixed(1)}s before capturing again`, "error");
    });

    socket.on("cell_claim_rejected", ({ reason }) => {
      if (reason === "game_completed") {
        addToast("Game is over — start a new game to play again", "error");
      } else {
        addToast("Tile already captured", "error");
      }
    });

    socket.on("claim_ack", () => {
      setGame((g) => {
        if (g) startCooldown(g.cooldownMs);
        return g;
      });
    });

    socket.on("game_completed", ({ game: completedGame, finalLeaderboard }) => {
      setGame(completedGame);
      setLeaderboard(finalLeaderboard);
      setMe((prev) => {
        if (!prev) return prev;
        const entry = finalLeaderboard.find((e) => e.id === prev.id);
        if (entry) return { ...prev, score: entry.score };
        return prev;
      });
    });

    socket.on("game_started", ({ game: newGame, cells: rawCells, me: newMe, leaderboard: entries }) => {
      const map = new Map<string, CellPayload>();
      rawCells.forEach((c) => map.set(cellKey(c.row, c.col), c));
      setGame(newGame);
      setCells(map);
      setMe(newMe);
      setLeaderboard(entries);
      resetCooldown();
      setStartingNewGame(false);
    });

    socket.on("create_new_game_rejected", ({ reason }) => {
      setStartingNewGame(false);
      const message =
        reason === "GAME_ALREADY_STARTED"
          ? "A new game was already started"
          : reason === "GAME_NOT_COMPLETED"
            ? "Current game is still in progress"
            : "Could not start new game";
      addToast(message, "error");
    });

    socket.on("connect_error", () => {
      clearToken();
      disconnectSocket();
      setPhase("login");
      addToast("Session expired — please log in again", "error");
    });
  }, [startCooldown, resetCooldown, addToast]);

  const startSession = useCallback(
    (token: string) => {
      setToken(token);
      setPhase("connecting");
      setGame(null);
      setCells(new Map());
      setMe(null);
      disconnectSocket();
      connectSocket(token);
      bindSocketEvents();
    },
    [bindSocketEvents]
  );

  useEffect(() => {
    const token = getToken();
    if (token && phase === "connecting") {
      connectSocket(token);
      bindSocketEvents();
    }
    return () => {
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = useCallback(() => {
    disconnectSocket();
    clearToken();
    setGame(null);
    setCells(new Map());
    setMe(null);
    setLeaderboard([]);
    setPhase("login");
  }, []);

  const handleClaim = useCallback(
    (row: number, col: number) => {
      if (!connected || !game || game.status !== "active") return;
      getSocket().emit("claim_cell", { row, col });
    },
    [connected, game]
  );

  const handleStartNewGame = useCallback(() => {
    setStartingNewGame(true);
    getSocket().emit("create_new_game");
  }, []);

  if (phase === "login") {
    return (
      <div className="app app--login">
        <LoginForm onSuccess={startSession} />
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        gameName={game?.name ?? "Capture"}
        me={me}
        onlineCount={onlineCount}
        cooldownMs={cooldownMs}
        cooldownMaxMs={game?.cooldownMs ?? 1500}
        totalCells={totalCells}
        onLogout={handleLogout}
      />
      <div className="app__body">
        {phase === "playing" && game && (
          <Grid
            rows={game.rows}
            cols={game.cols}
            cells={cells}
            myId={me?.id ?? null}
            isCooldown={isCooldown}
            disabled={gameCompleted}
            onClaim={handleClaim}
          />
        )}
        {phase === "connecting" && (
          <div className="app__connecting">Connecting to game…</div>
        )}
        {phase === "playing" && (
          <Leaderboard
            entries={leaderboard}
            myId={me?.id ?? null}
            totalCells={totalCells}
          />
        )}
      </div>

      {phase === "playing" && !connected && (
        <div className="app__disconnected">
          <span className="app__disconnected-dot" />
          Reconnecting…
        </div>
      )}

      {phase === "playing" && gameCompleted && game && (
        <GameCompleteModal
          game={game}
          leaderboard={leaderboard}
          loading={startingNewGame}
          onStartNewGame={handleStartNewGame}
        />
      )}

      <div className="app__toasts">
        {toasts.map((t) => (
          <Toast key={t.id} text={t.text} type={t.type} />
        ))}
      </div>
    </div>
  );
}
