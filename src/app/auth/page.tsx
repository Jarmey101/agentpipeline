"use client";

import { useState } from "react";

export default function AuthPage() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw })
    });

    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j?.error || "Login failed");
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 520 }}>
        <div className="h2">Admin Login</div>
        <form onSubmit={login}>
          <label className="label">Password</label>
          <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button className="btn" disabled={busy}>{busy ? "Signing in..." : "Sign In"}</button>
            <a className="btn btn2" href="/">Back</a>
          </div>
          {err && <div style={{ marginTop: 12 }} className="badge">Error: {err}</div>}
        </form>
      </div>
      <div style={{ marginTop: 14 }} className="muted">
        Password comes from .env.local: APP_ADMIN_PASSWORD
      </div>
    </main>
  );
}
