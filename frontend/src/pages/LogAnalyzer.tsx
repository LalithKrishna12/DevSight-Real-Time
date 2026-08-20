import { useState, useEffect, useCallback } from "react";
import { api, LogEntry, Service } from "../api/client";

export default function LogAnalyzer() {
  const [activeTab, setActiveTab] = useState<"live" | "raw">("live");

  // Raw explainer state
  const [rawLog, setRawLog] = useState("");
  const [rawExplanation, setRawExplanation] = useState<string | null>(null);
  const [rawLoading, setRawLoading] = useState(false);

  // Live logs state
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<string>("ALL");
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [inlineExplainingId, setInlineExplainingId] = useState<string | null>(null);
  const [inlineExplanation, setInlineExplanation] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    api.get<Service[]>("/services").then((res) => setServices(res.data)).catch(console.error);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params: Record<string, string> = { limit: "150" };
      if (selectedService !== "ALL") params.serviceId = selectedService;
      if (selectedLevel !== "ALL") params.level = selectedLevel.toLowerCase();
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get<LogEntry[]>("/logs", { params });
      setLogs(res.data);
    } catch (e) {
      console.error("Error loading logs:", e);
    } finally {
      setLogsLoading(false);
    }
  }, [selectedService, selectedLevel, searchQuery]);

  useEffect(() => {
    if (activeTab === "live") {
      fetchLogs();
    }
  }, [activeTab, fetchLogs]);

  async function handleRawAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!rawLog.trim()) return;
    setRawLoading(true);
    setRawExplanation(null);
    try {
      const { data } = await api.post("/logs/explain", { rawLog });
      setRawExplanation(data.explanation);
    } catch (err: any) {
      setRawExplanation(err?.response?.data?.error || "Failed to analyze log.");
    } finally {
      setRawLoading(false);
    }
  }

  async function explainInline(log: LogEntry) {
    setInlineExplainingId(log.id);
    setInlineExplanation(null);
    try {
      const { data } = await api.post("/logs/explain", { rawLog: `[${log.level}] ${log.message}` });
      setInlineExplanation({ id: log.id, text: data.explanation });
    } catch (err: any) {
      alert("Analysis failed: " + (err?.response?.data?.error || "Error"));
    } finally {
      setInlineExplainingId(null);
    }
  }

  function setPresetLog(type: "pool" | "timeout" | "oom") {
    if (type === "pool") {
      setRawLog(
        "ERROR 2026-08-20 09:30:12 [pg-pool] Connection pool exhausted (active=50, max=50). Connection request timed out after 5000ms at DatabaseClient.acquire (/app/db.js:42)"
      );
    } else if (type === "timeout") {
      setRawLog(
        "WARN 2026-08-20 09:31:05 [http-proxy] Upstream HTTP 504 Gateway Timeout while proxying request to http://billing-internal-svc:8080/v1/charges/charge_9981"
      );
    } else {
      setRawLog(
        "FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory (heap used: 4096 MB, heap total: 4140 MB)"
      );
    }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h1 className="page-title">Log Analyzer & Live Service Logs</h1>
        {activeTab === "live" && (
          <button className="btn secondary" onClick={() => fetchLogs()} style={{ fontSize: 12 }}>
            ↻ Refresh Logs
          </button>
        )}
      </div>
      <p className="page-sub">Live microservice log stream and AI-powered log translation engine.</p>

      {/* Tabs */}
      <div className="tab-group" style={{ marginBottom: 18, width: "fit-content" }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === "live" ? "active" : ""}`}
          onClick={() => setActiveTab("live")}
        >
          Live Service Logs ({logs.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "raw" ? "active" : ""}`}
          onClick={() => setActiveTab("raw")}
        >
          Raw Log Explainer
        </button>
      </div>

      {activeTab === "live" ? (
        <>
          {/* Filters */}
          <div className="card" style={{ padding: "12px 16px", marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--text-dim)" }}>Service:</label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
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

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--text-dim)" }}>Level:</label>
              <div className="tab-group">
                {["ALL", "INFO", "WARN", "ERROR"].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={`tab-btn ${selectedLevel === lvl ? "active" : ""}`}
                    style={{ fontSize: 11, padding: "4px 8px" }}
                    onClick={() => setSelectedLevel(lvl)}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 180 }}>
              <input
                type="text"
                placeholder="Search log messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "6px 10px", fontSize: 12 }}
              />
            </div>
          </div>

          {/* Log Table / List */}
          <div className="card" style={{ padding: "10px 14px" }}>
            {logsLoading ? (
              <p className="page-sub" style={{ margin: "14px 0" }}>Loading log entries…</p>
            ) : logs.length === 0 ? (
              <p className="page-sub" style={{ margin: "14px 0" }}>No log entries match your filter criteria.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} style={{ borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className={`badge ${log.level}`} style={{ fontSize: 10, textTransform: "uppercase" }}>
                        {log.level}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)" }}>
                        {log.service?.name || "Service"}
                      </span>
                      <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <button
                      className="btn secondary"
                      style={{ fontSize: 11, padding: "3px 8px" }}
                      disabled={inlineExplainingId === log.id}
                      onClick={() => explainInline(log)}
                    >
                      {inlineExplainingId === log.id ? "Analyzing..." : "⚡ Explain with AI"}
                    </button>
                  </div>

                  <div
                    className="mono"
                    style={{
                      fontSize: 12.5,
                      color: log.level === "error" ? "var(--down)" : log.level === "warn" ? "var(--degraded)" : "var(--text)",
                      lineHeight: 1.4,
                      wordBreak: "break-all",
                    }}
                  >
                    {log.message}
                  </div>

                  {inlineExplanation && inlineExplanation.id === log.id && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "8px 12px",
                        background: "var(--bg-inset)",
                        borderRadius: "var(--radius)",
                        borderLeft: "3px solid var(--signal)",
                      }}
                    >
                      <span style={{ fontSize: 11, color: "var(--signal)", fontWeight: 600, display: "block", marginBottom: 2 }}>
                        AI Explanation:
                      </span>
                      <span style={{ fontSize: 12.5, color: "var(--text)" }}>{inlineExplanation.text}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div className="card">
            <div className="card-title">Paste Raw Log / Stack Trace</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: "var(--text-dim)", alignSelf: "center" }}>Preset Examples:</span>
              <button
                type="button"
                className="btn secondary"
                style={{ fontSize: 11, padding: "3px 8px" }}
                onClick={() => setPresetLog("pool")}
              >
                DB Pool Exhaustion
              </button>
              <button
                type="button"
                className="btn secondary"
                style={{ fontSize: 11, padding: "3px 8px" }}
                onClick={() => setPresetLog("timeout")}
              >
                504 Gateway Timeout
              </button>
              <button
                type="button"
                className="btn secondary"
                style={{ fontSize: 11, padding: "3px 8px" }}
                onClick={() => setPresetLog("oom")}
              >
                Out of Memory
              </button>
            </div>

            <form onSubmit={handleRawAnalyze}>
              <div className="field">
                <textarea
                  rows={8}
                  value={rawLog}
                  onChange={(e) => setRawLog(e.target.value)}
                  placeholder="Paste raw stack trace, exception dump, or system error log here..."
                  style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
                />
              </div>
              <button className="btn" type="submit" disabled={rawLoading}>
                {rawLoading ? "Analyzing with AI…" : "⚡ Explain this log"}
              </button>
            </form>
          </div>

          {rawExplanation && (
            <div className="card" style={{ borderLeft: "4px solid var(--signal)", marginTop: 16 }}>
              <div className="card-title">Plain-English AI Explanation</div>
              <p className="translation" style={{ fontSize: 15, margin: "6px 0 0" }}>
                {rawExplanation}
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
