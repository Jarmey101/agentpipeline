export const runtime = "nodejs";
import LeadsTable from "@/components/LeadsTable";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("leads").select("*").order("created_at", { ascending: false }).limit(200);

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div className="badge">AgentPipeline</div>
          <h1 className="h2" style={{ marginTop: 10 }}>Dashboard</h1>
          <div className="muted">Lead capture + automation status</div>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="btn btn2" type="submit">Logout</button>
        </form>
      </div>

      {error ? (
        <div className="card">Error loading leads: {error.message}</div>
      ) : (
        <LeadsTable leads={(data || []) as any} />
      )}
    </main>
  );
}
