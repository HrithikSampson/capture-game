import React from "react";
import "./Toast.css";

interface Props {
  text: string;
  type: "error" | "info";
}

export default function Toast({ text, type }: Props) {
  return (
    <div className={`toast toast--${type}`}>
      <span className="toast__icon">{type === "error" ? "⏱" : "ℹ"}</span>
      {text}
    </div>
  );
}
