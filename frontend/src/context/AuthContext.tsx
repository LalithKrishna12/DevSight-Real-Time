import { createContext, useContext, useState, ReactNode } from "react";
import { api, User } from "../api/client";

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, organizationName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("devsight_user");
    return raw ? JSON.parse(raw) : null;
  });

  async function login(email: string, password: string) {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("devsight_token", data.token);
    localStorage.setItem("devsight_user", JSON.stringify(data.user));
    setUser(data.user);
  }

  async function register(email: string, password: string, name: string, organizationName: string) {
    const { data } = await api.post("/auth/register", { email, password, name, organizationName });
    localStorage.setItem("devsight_token", data.token);
    localStorage.setItem("devsight_user", JSON.stringify(data.user));
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("devsight_token");
    localStorage.removeItem("devsight_user");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
