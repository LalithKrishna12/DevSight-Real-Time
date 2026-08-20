import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api, Incident, Service } from "../api/client";

export default function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [serviceFilter, setServiceFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const fetchIncidents = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (serviceFilter !== "ALL") params.serviceId = serviceFilter;

      const [incidentsRes, servicesRes] = await Promise.all([
        api.get<Incident[]>("/incidents", { params }),
        api.get<Service[]>("/services"),
      ]);

      setIncidents(incidentsRes.data);
      setServices(servicesRes.data);
    } catch (e) {
      console.error("Failed to load incidents:", e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, serviceFilter]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h1 className="page-title">Incidents & Root Cause Reports</h1>
        <button className="btn secondary" onClick={() => fetchIncidents()} style={{ fontSize: 12 }}>
          ↻ Refresh
        </button>
      </div>
      <p className="page-sub">Chronological list of all autonomous AI-generated root cause analyses.</p>

      {/* Filter Bar */}
      <div className="card" style={{ padding: "12px 16px", marginBottom: 16, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: "var(--text-dim)" }}>Status:</label>
          <div className="tab-group">
            {["ALL", "OPEN", "INVESTIGATING", "RESOLVED"].map((st) => (
              <button
                key={st}
                type="button"
                className={`tab-btn ${statusFilter === st ? "active" : ""}`}
                style={{ fontSize: 11, padding: "4px 8px" }}
                onClick={() => setStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: "var(--text-dim)" }}>Service:</label>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">All Services</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="page-sub">Loading incidents…</p>
      ) : incidents.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No incidents found</div>
          <p style={{ color: "var(--text-dim)", fontSize: 13, margin: 0 }}>
            {statusFilter !== "ALL" || serviceFilter !== "ALL"
              ? "Try adjusting your filters to see more incidents."
              : "When anomalies occur, the AI Root Cause Engine will automatically log incidents here."}
          </p>
        </div>
      ) : (
        incidents.map((incident) => (
          <Link to={`/incidents/${incident.id}`} key={incident.id} style={{ textDecoration: "none" }}>
            <div className="incident-row">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div className="meta">
                  {incident.service.name} · {new Date(incident.createdAt).toLocaleTimeString()} · {new Date(incident.createdAt).toLocaleDateString()}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {incident.alerts && incident.alerts.length > 0 && (
                    <span className="badge" style={{ fontSize: 10 }}>
                      📢 {incident.alerts.length} alerts sent
                    </span>
                  )}
                  <span className={`badge ${incident.status.toLowerCase()}`}>
                    {incident.status}
                  </span>
                </div>
              </div>

              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                {incident.whatFailed}
              </div>

              <div className="translation">
                <span className="label">Root Cause</span>
                {incident.whyReason}
              </div>

              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>
                <strong>Impact:</strong> {incident.impact}
              </div>
            </div>
          </Link>
        ))
      )}
    </>
  );
}
