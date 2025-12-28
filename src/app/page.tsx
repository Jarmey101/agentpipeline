import LeadForm from "@/components/LeadForm";

export default function Page() {
  return (
    <main className="container">
      <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr", alignItems: "start" }}>
        <div className="card">
          <div className="badge">AgentPipeline</div>
          <h1 className="h1">Where Real Estate Leads Become Closings</h1>
          <p className="muted">
            Capture leads, respond instantly by SMS and email, and push every lead toward a booked conversation.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <span className="badge">Instant lead alerts</span>
            <span className="badge">Buyer/Seller routing</span>
            <span className="badge">Dashboard tracking</span>
          </div>
        </div>
        <LeadForm />
      </div>
      <div style={{ marginTop: 16 }} className="muted">
        Tip: connect this page to ads, QR codes, and your domain. This page is the lead generator.
      </div>
    </main>
  );
}
