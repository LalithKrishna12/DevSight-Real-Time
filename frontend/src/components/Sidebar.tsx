import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { user, logout } = useAuth();

  const roleLabels: Record<string, string> = {
    ADMIN: "Admin",
    DEVOPS_ENGINEER: "DevOps",
    DEVELOPER: "Developer",
    MANAGER: "Manager",
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        DevSight<span>AI</span>
      </div>
      <nav>
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          Dashboard
        </NavLink>
        <NavLink to="/incidents" className={({ isActive }) => (isActive ? "active" : "")}>
          Incidents
        </NavLink>
        <NavLink to="/log-analyzer" className={({ isActive }) => (isActive ? "active" : "")}>
          Log Analyzer & Live Logs
        </NavLink>
      </nav>
      <div style={{ marginTop: "auto", fontSize: 12, color: "var(--text-dim)" }}>
        <div style={{ marginBottom: 4, fontWeight: 600, color: "var(--text)" }}>{user?.name}</div>
        <div style={{ marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}>
          <span className="badge" style={{ fontSize: 10 }}>
            {user?.role ? roleLabels[user.role] || user.role : "User"}
          </span>
        </div>
        <button className="btn secondary" onClick={logout} style={{ width: "100%" }}>
          Log out
        </button>
      </div>
    </aside>
  );
}
