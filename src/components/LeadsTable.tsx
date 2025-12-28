"use client";

type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  lead_type: string;
  timeline: string;
  budget?: string | null;
  area?: string | null;
  status: string;
  created_at: string;
};

export default function LeadsTable({ leads }: { leads: Lead[] }) {
  return (
    <div className="card">
      <div className="h2">Leads</div>
      <div className="muted" style={{ marginBottom: 12 }}>Newest first</div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Timeline</th>
            <th>Status</th>
            <th>Phone</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {leads.map(l => (
            <tr key={l.id}>
              <td>{l.first_name} {l.last_name}</td>
              <td><span className="badge">{l.lead_type}</span></td>
              <td>{l.timeline}</td>
              <td><span className="badge">{l.status}</span></td>
              <td>{l.phone}</td>
              <td>{new Date(l.created_at).toLocaleString()}</td>
            </tr>
          ))}
          {leads.length === 0 && (
            <tr><td colSpan={6} className="muted">No leads yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
