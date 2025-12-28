"use client";

import { useState } from "react";

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  lead_type: string;
  timeline: string;
  budget: string;
  area: string;
};

export default function LeadForm() {
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [f, setF] = useState<FormState>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    lead_type: "Buyer",
    timeline: "0-3 months",
    budget: "",
    area: ""
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setOk(null); setErr(null);

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f)
    });

    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setErr(data?.error || "Submission failed");
      return;
    }

    setOk("Submitted. Check your phone and email.");
    setF({ ...f, first_name: "", last_name: "", email: "", phone: "", budget: "", area: "" });
  }

  return (
    <form onSubmit={submit} className="card">
      <div className="h2">Letâ€™s Get You Moving</div>
      <div className="row">
        <div>
          <label className="label">First Name</label>
          <input className="input" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Last Name</label>
          <input className="input" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} required />
        </div>
      </div>

      <div className="row">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required />
        </div>
      </div>

      <div className="row">
        <div>
          <label className="label">Buyer / Seller / Investor</label>
          <select className="input" value={f.lead_type} onChange={(e) => setF({ ...f, lead_type: e.target.value })}>
            <option>Buyer</option>
            <option>Seller</option>
            <option>Investor</option>
          </select>
        </div>
        <div>
          <label className="label">Timeline</label>
          <select className="input" value={f.timeline} onChange={(e) => setF({ ...f, timeline: e.target.value })}>
            <option>0-3 months</option>
            <option>3-6 months</option>
            <option>6+ months</option>
          </select>
        </div>
      </div>

      <div className="row">
        <div>
          <label className="label">Budget Range</label>
          <input className="input" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} placeholder="e.g.,  - " />
        </div>
        <div>
          <label className="label">Preferred Area</label>
          <input className="input" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} placeholder="e.g., Fort Worth, Keller, Arlington" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button className="btn" disabled={busy}>{busy ? "Submitting..." : "Get My Info"}</button>
        <a className="btn btn2" href="/auth">Admin Login</a>
      </div>

      {ok && <div style={{ marginTop: 12 }} className="badge">{ok}</div>}
      {err && <div style={{ marginTop: 12 }} className="badge" aria-live="polite">Error: {err}</div>}
    </form>
  );
}
