import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, Incident } from "../api/client";

export default function IncidentDetail() {
  const { id } = useParams();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    api
      .get<Incident>(`/incidents/${id}`)
      .then((res) => setIncident(res.data))
      .catch((e) => console.error("Error loading incident:", e))
      .finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(status: "INVESTIGATING" | "RESOLVED" | "OPEN") {
    if (!incident) return;
    setUpdating(true);
    try {
      const { data } = await api.patch<Incident>(`/incidents/${incident.id}/status`, { status });
      setIncident(data);
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <p className="page-sub">Loading incident report…</p>;
  if (!incident) return <p className="page-sub">Incident not found.</p>;

  const rawContext = incident.rawContext;
  const metricsList = rawContext?.metrics || rawContext?.metricsSnapshot || [];
  const logsList = rawContext?.logs || rawContext?.logsSnapshot || [];
  const anomalyStats = rawContext?.anomaly;

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Link to="/incidents" style={{ fontSize: 13, color: "var(--signal)", textDecoration: "none" }}>
          ← Back to Incidents
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">{incident.whatFailed}</h1>
          <p className="page-sub" style={{ marginBottom: 8 }}>
            Service: <strong>{incident.service.name}</strong> · Detected: {new Date(incident.createdAt).toLocaleString()}
            {incident.resolvedAt && ` · Resolved: ${new Date(incident.resolvedAt).toLocaleString()}`}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className={`badge ${incident.status.toLowerCase()}`} style={{ fontSize: 13, padding: "6px 12px" }}>
            {incident.status}
          </span>
          {incident.status !== "RESOLVED" && (
            <>
              {incident.status === "OPEN" && (
                <button
                  className="btn secondary"
                  onClick={() => updateStatus("INVESTIGATING")}
                  disabled={updating}
                  style={{ fontSize: 12 }}
                >
                  Mark Investigating
                </button>
              )}
              <button
                className="btn"
                onClick={() => updateStatus("RESOLVED")}
                disabled={updating}
                style={{ fontSize: 12, background: "var(--ok)", color: "#000" }}
              >
                Mark Resolved
              </button>
            </>
          )}
        </div>
      </div>

      {/* Signature AI Diagnosis Card */}
      <div className="card" style={{ borderLeft: "4px solid var(--signal)", marginTop: 14 }}>
        <div className="card-title">AI Root Cause Translation</div>
        <div className="translation" style={{ fontSize: 16, fontWeight: 500, margin: "4px 0 12px" }}>
          {incident.whyReason}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <div>
            <div className="card-title" style={{ fontSize: 11, marginBottom: 4 }}>
              Downstream Impact
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text)" }}>{incident.impact}</p>
          </div>
          <div>
            <div className="card-title" style={{ fontSize: 11, marginBottom: 4 }}>
              Suggested Remediation
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text)" }}>{incident.suggestedFix}</p>
          </div>
        </div>
      </div>

      {/* Alert Dispatch Channel Status */}
      {incident.alerts && incident.alerts.length > 0 && (
        <div className="card">
          <div className="card-title">Alert Notifications Dispatched</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {incident.alerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  background: "var(--bg-inset)",
                  padding: "8px 14px",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 12,
                }}
              >
                <span style={{ fontWeight: 600 }}>{alert.channel}</span>
                <span className={`status-dot ${alert.success ? "HEALTHY" : "DOWN"}`} />
                <span style={{ color: "var(--text-dim)" }}>
                  {alert.success ? "Delivered" : "Failed"} at {new Date(alert.sentAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagnostic Context Snapshots */}
      {rawContext && (
        <div className="card">
          <div className="card-title">Diagnostic Telemetry Snapshot</div>

          {anomalyStats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginBottom: 16 }}>
              <div className="stat-card" style={{ padding: "10px 12px" }}>
                <div className="value" style={{ fontSize: 16, color: "var(--degraded)" }}>
                  {anomalyStats.observedValue}ms
                </div>
                <div className="label">Observed Value</div>
              </div>
              <div className="stat-card" style={{ padding: "10px 12px" }}>
                <div className="value" style={{ fontSize: 16 }}>
                  {anomalyStats.baselineMean}ms
                </div>
                <div className="label">Baseline Mean</div>
              </div>
              <div className="stat-card" style={{ padding: "10px 12px" }}>
                <div className="value" style={{ fontSize: 16 }}>
                  {anomalyStats.deviationStdDevs}σ
                </div>
                <div className="label">Deviation (StdDev)</div>
              </div>
            </div>
          )}

          {logsList.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", marginBottom: 6 }}>
                Logs Correlated During Incident:
              </div>
              <div style={{ background: "var(--bg-inset)", borderRadius: "var(--radius)", padding: 10, maxHeight: 180, overflowY: "auto" }}>
                {logsList.map((log: any, idx: number) => (
                  <div key={idx} style={{ fontSize: 12, fontFamily: "var(--font-mono)", padding: "3px 0" }}>
                    <span className={`status-dot ${log.level === "error" ? "DOWN" : log.level === "warn" ? "DEGRADED" : "HEALTHY"}`} />
                    <span style={{ color: "var(--text-faint)", marginRight: 8 }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ""}
                    </span>
                    <span style={{ color: log.level === "error" ? "var(--down)" : log.level === "warn" ? "var(--degraded)" : "var(--text)" }}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {metricsList.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", marginBottom: 6 }}>
                Metric Points at Trigger Time:
              </div>
              <div style={{ background: "var(--bg-inset)", borderRadius: "var(--radius)", padding: 10, maxHeight: 140, overflowY: "auto" }}>
                {metricsList.map((m: any, idx: number) => (
                  <div key={idx} style={{ fontSize: 12, fontFamily: "var(--font-mono)", padding: "2px 0", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-dim)" }}>
                      {m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : ""} · {m.name}
                    </span>
                    <span style={{ fontWeight: 600, color: m.value > 500 ? "var(--degraded)" : "var(--ok)" }}>
                      {m.value}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
