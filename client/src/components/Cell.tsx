import React, { memo, useCallback, useRef } from "react";
import type { CellPayload } from "../socket";
import "./Cell.css";

interface Props {
  cell: CellPayload;
  isMe: boolean;
  isCooldown: boolean;
  onClaim: (id: string) => void;
}

function Cell({ cell, isMe, isCooldown, onClaim }: Props) {
  const claimed = cell.ownerId !== null;
  const ref = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(() => {
    if (isCooldown && !isMe) return;
    // Trigger pop animation
    const el = ref.current;
    if (el) {
      el.classList.remove("pop");
      void el.offsetWidth; // reflow
      el.classList.add("pop");
    }
    onClaim(cell.id);
  }, [cell.id, isMe, isCooldown, onClaim]);

  const title = claimed
    ? `${cell.ownerName}${isMe ? " (you)" : ""} • ${
        cell.capturedAt ? new Date(cell.capturedAt).toLocaleTimeString() : ""
      }`
    : "Unclaimed — click to capture";

  return (
    <button
      ref={ref}
      className={[
        "cell",
        claimed ? "cell--claimed" : "cell--empty",
        isMe ? "cell--mine" : "",
        isCooldown && !isMe ? "cell--locked" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        claimed
          ? ({
              "--cell-color": cell.ownerColor ?? "#6366f1",
            } as React.CSSProperties)
          : undefined
      }
      onClick={handleClick}
      title={title}
      aria-label={title}
    />
  );
}

export default memo(Cell);
