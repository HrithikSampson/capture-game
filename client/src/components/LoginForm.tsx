import React, { useState } from "react";
import { login, register } from "../auth";
import "./LoginForm.css";

interface Props {
  onSuccess: (token: string) => void;
}

type Tab = "login" | "register";

export default function LoginForm({ onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fn = tab === "login" ? login : register;
      const { token } = await fn(username.trim(), password);
      onSuccess(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-card__brand">
          <span className="login-card__logo">⬛</span>
          <h1 className="login-card__title">Capture</h1>
          <p className="login-card__subtitle">Claim tiles. Compete in real time.</p>
        </div>

        <div className="login-tabs">
          <button
            type="button"
            className={`login-tabs__btn ${tab === "login" ? "login-tabs__btn--active" : ""}`}
            onClick={() => { setTab("login"); setError(null); }}
          >
            Log in
          </button>
          <button
            type="button"
            className={`login-tabs__btn ${tab === "register" ? "login-tabs__btn--active" : ""}`}
            onClick={() => { setTab("register"); setError(null); }}
          >
            Register
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-form__field">
            <span>Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_name"
              autoComplete="username"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]{3,20}"
            />
          </label>

          <label className="login-form__field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
            />
          </label>

          {error && <p className="login-form__error">{error}</p>}

          <button type="submit" className="login-form__submit" disabled={loading}>
            {loading ? "…" : tab === "login" ? "Log in & play" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
