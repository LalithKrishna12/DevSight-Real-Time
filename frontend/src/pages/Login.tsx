import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("password123");
  const [name, setName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        if (!name.trim() || !organizationName.trim()) {
          setError("All fields are required");
          setLoading(false);
          return;
        }
        await register(email, password, name, organizationName);
      }
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.error || (mode === "login" ? "Login failed" : "Registration failed"));
    } finally {
      setLoading(false);
    }
  }

  function setDemoUser(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("password123");
    setMode("login");
    setError(null);
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand" style={{ marginBottom: 16, fontSize: 18, textAlign: "center" }}>
          DevSight<span style={{ color: "var(--signal)" }}>AI</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", marginBottom: 20 }}>
          Autonomous Cloud & Microservice Observability
        </p>

        {/* Tab selector */}
        <div className="tab-group" style={{ marginBottom: 18 }}>
          <button
            type="button"
            className={`tab-btn ${mode === "login" ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              setError(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`tab-btn ${mode === "register" ? "active" : ""}`}
            onClick={() => {
              setMode("register");
              setError(null);
            }}
          >
            Register Org
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <div className="field">
                <label>Organization / Company Name</label>
                <input
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  type="text"
                  placeholder="Acme Corp"
                  required
                />
              </div>
              <div className="field">
                <label>Your Full Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  placeholder="Alex Rivera"
                  required
                />
              </div>
            </>
          )}

          <div className="field">
            <label>Email Address</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="name@company.com"
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          {error && <div className="error-text">{error}</div>}

          <button className="btn" type="submit" style={{ width: "100%", marginTop: 6 }} disabled={loading}>
            {loading ? "Processing..." : mode === "login" ? "Sign In" : "Create Organization"}
          </button>
        </form>

        {mode === "login" && (
          <div style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 8, textTransform: "uppercase" }}>
              Quick Demo Logins:
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn secondary"
                style={{ fontSize: 11, padding: "4px 8px" }}
                onClick={() => setDemoUser("admin@demo.com")}
              >
                Admin
              </button>
              <button
                type="button"
                className="btn secondary"
                style={{ fontSize: 11, padding: "4px 8px" }}
                onClick={() => setDemoUser("devops@demo.com")}
              >
                DevOps
              </button>
              <button
                type="button"
                className="btn secondary"
                style={{ fontSize: 11, padding: "4px 8px" }}
                onClick={() => setDemoUser("developer@demo.com")}
              >
                Developer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
