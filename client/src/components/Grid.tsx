import React, { useCallback, useMemo, useRef, useState } from "react";
import type { CellPayload } from "../socket";
import Cell from "./Cell";
import "./Grid.css";

const GRID_ROWS = 30;
const GRID_COLS = 50;

interface Props {
  cells: Map<string, CellPayload>;
  myId: string | null;
  isCooldown: boolean;
  onClaim: (id: string) => void;
}

export default function Grid({ cells, myId, isCooldown, onClaim }: Props) {
  // Pan support
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 1 && e.button !== 0) return;
    if ((e.target as HTMLElement).classList.contains("cell")) return;
    isPanning.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(3, Math.max(0.4, s * delta)));
  }, []);

  const orderedCells = useMemo(() => {
    const arr: CellPayload[] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const cell = cells.get(`${r}_${c}`);
        if (cell) arr.push(cell);
      }
    }
    return arr;
  }, [cells]);

  return (
    <div
      className="grid-viewport"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div
        ref={containerRef}
        className="grid-canvas"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          gridTemplateColumns: `repeat(${GRID_COLS}, var(--cell-size))`,
          gridTemplateRows: `repeat(${GRID_ROWS}, var(--cell-size))`,
        }}
      >
        {orderedCells.map((cell) => (
          <Cell
            key={cell.id}
            cell={cell}
            isMe={cell.ownerId === myId}
            isCooldown={isCooldown}
            onClaim={onClaim}
          />
        ))}
      </div>
      <div className="grid-hint">scroll to zoom · drag to pan</div>
    </div>
  );
}
