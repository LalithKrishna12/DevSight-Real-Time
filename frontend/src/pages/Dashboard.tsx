import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api, DashboardSummary } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceBaseline, setNewServiceBaseline] = useState(150);
  const [submitting, setSubmitting] = useState(false);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get<DashboardSummary>("/dashboard");
      setData(res.data);
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/services", {
        name: newServiceName.trim(),
        baselineMs: Number(newServiceBaseline) || 100,
      });
      setNewServiceName("");
      setNewServiceBaseline(150);
      setShowAddModal(false);
      setActionMessage("Service added successfully!");
      setTimeout(() => setActionMessage(null), 4000);
      await fetchDashboard();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to add service");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSimulate(serviceId: string, type: "NORMAL" | "ANOMALY") {
    setSimulatingId(serviceId);
    setActionMessage(null);
    try {
      const res = await api.post("/metrics/simulate", { serviceId, type });
      if (type === "ANOMALY") {
        setActionMessage(`🚨 Anomaly simulated (${res.data.value}ms)! AI Root Cause analyzed and Incident created.`);
      } else {
        setActionMessage(`Normal metric point recorded (${res.data.value}ms).`);
      }
      setTimeout(() => setActionMessage(null), 6000);
      await fetchDashboard();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Simulation failed");
    } finally {
      setSimulatingId(null);
    }
  }

  async function handleDeleteService(serviceId: string, name: string) {
    if (!confirm(`Are you sure you want to delete service "${name}" and all its logs & metrics?`)) return;
    try {
      await api.delete(`/services/${serviceId}`);
      await fetchDashboard();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete service");
    }
  }

  const isAdminOrDevops = user?.role === "ADMIN" || user?.role === "DEVOPS_ENGINEER";

  if (loading && !data) return <p className="page-sub">Loading DevSight observability metrics…</p>;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h1 className="page-title">Unified Dashboard</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn secondary" onClick={() => fetchDashboard()} style={{ fontSize: 12 }}>
            ↻ Refresh
          </button>
          {isAdminOrDevops && (
            <button className="btn" onClick={() => setShowAddModal(true)} style={{ fontSize: 12 }}>
              + Add Service
            </button>
          )}
        </div>
      </div>
      <p className="page-sub">Real-time service health, AI root causes, and incident diagnosis.</p>

      {actionMessage && (
        <div className="card" style={{ borderLeft: "4px solid var(--signal)", padding: "10px 14px", marginBottom: 16 }}>
          <span style={{ fontSize: 13 }}>{actionMessage}</span>
        </div>
      )}

      {data && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="value">{data.totalServices}</div>
              <div className="label">Monitored Services</div>
            </div>
            <div className="stat-card">
              <div
                className="value"
                style={{ color: data.openIncidentCount > 0 ? "var(--degraded)" : "var(--ok)" }}
              >
                {data.openIncidentCount}
              </div>
              <div className="label">Open Incidents</div>
            </div>
            <div className="stat-card">
              <div className="value" style={{ color: "var(--ok)" }}>
                {data.statusCounts.HEALTHY || 0}
              </div>
              <div className="label">Healthy</div>
            </div>
            <div className="stat-card">
              <div
                className="value"
                style={{ color: (data.statusCounts.DEGRADED || 0) > 0 ? "var(--degraded)" : "var(--text-dim)" }}
              >
                {data.statusCounts.DEGRADED || 0}
              </div>
              <div className="label">Degraded</div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div className="card-title" style={{ margin: 0 }}>Monitored Microservices</div>
              <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                Click "Simulate Anomaly" to test AI Root Cause Engine
              </span>
            </div>

            {data.services.map((s) => (
              <div className="service-row" key={s.id} style={{ padding: "12px 0" }}>
                <div>
                  <span className={`status-dot ${s.status}`} />
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                  <span className="mono" style={{ marginLeft: 10, fontSize: 12, color: "var(--text-dim)" }}>
                    {s.baselineMs ? `${s.baselineMs}ms baseline` : "no baseline"}
                  </span>
                  <span className={`badge ${s.status.toLowerCase()}`} style={{ marginLeft: 8 }}>
                    {s.status}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    className="btn secondary"
                    style={{ fontSize: 11, padding: "4px 8px" }}
                    disabled={simulatingId === s.id}
                    onClick={() => handleSimulate(s.id, "NORMAL")}
                    title="Send a metric near baseline"
                  >
                    Traffic
                  </button>
                  <button
                    className="btn"
                    style={{ fontSize: 11, padding: "4px 8px", background: "var(--degraded)", color: "#000" }}
                    disabled={simulatingId === s.id}
                    onClick={() => handleSimulate(s.id, "ANOMALY")}
                    title="Force an anomalous metric spike and trigger AI diagnosis"
                  >
                    {simulatingId === s.id ? "Analyzing..." : "⚡ Simulate Anomaly"}
                  </button>
                  {isAdminOrDevops && (
                    <button
                      className="btn secondary"
                      style={{ fontSize: 11, padding: "4px 8px", color: "var(--down)" }}
                      onClick={() => handleDeleteService(s.id, s.name)}
                      title="Delete service"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
            {data.services.length === 0 && (
              <p className="page-sub" style={{ margin: "10px 0" }}>No services registered yet.</p>
            )}
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div className="card-title" style={{ margin: 0 }}>Recent Incidents & AI Diagnoses</div>
              <Link to="/incidents" style={{ fontSize: 12, color: "var(--signal)", textDecoration: "none" }}>
                View all incidents →
              </Link>
            </div>

            {data.recentIncidents.map((incident) => (
              <Link to={`/incidents/${incident.id}`} key={incident.id} style={{ textDecoration: "none" }}>
                <div className="incident-row" style={{ transition: "border-color 0.2s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div className="meta">
                      {incident.service.name} · {new Date(incident.createdAt).toLocaleTimeString()} · {new Date(incident.createdAt).toLocaleDateString()}
                    </div>
                    <span className={`badge ${incident.status.toLowerCase()}`}>
                      {incident.status}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    {incident.whatFailed}
                  </div>
                  <div className="translation">
                    <span className="label">AI Root Cause Diagnosis</span>
                    {incident.whyReason}
                  </div>
                </div>
              </Link>
            ))}
            {data.recentIncidents.length === 0 && (
              <p className="page-sub" style={{ margin: "8px 0" }}>
                No incidents recorded. Try clicking "⚡ Simulate Anomaly" above to test the autonomous incident pipeline.
              </p>
            )}
          </div>
        </>
      )}

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="card-title" style={{ fontSize: 15, marginBottom: 16 }}>
              Register Monitored Service
            </div>
            <form onSubmit={handleAddService}>
              <div className="field">
                <label>Service / Component Name</label>
                <input
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="e.g. Recommendation Engine, Auth API"
                  required
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Baseline Latency (ms)</label>
                <input
                  type="number"
                  value={newServiceBaseline}
                  onChange={(e) => setNewServiceBaseline(Number(e.target.value))}
                  min={1}
                  required
                />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button type="button" className="btn secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button className="btn" type="submit" disabled={submitting}>
                  {submitting ? "Registering..." : "Create & Calibrate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
