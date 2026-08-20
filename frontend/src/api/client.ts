import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("devsight_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Shared types (mirror backend Prisma models) ---

export type Role = "ADMIN" | "DEVOPS_ENGINEER" | "DEVELOPER" | "MANAGER";
export type ServiceStatus = "HEALTHY" | "DEGRADED" | "DOWN" | "UNKNOWN";
export type IncidentStatus = "OPEN" | "INVESTIGATING" | "RESOLVED";
export type AlertChannel = "EMAIL" | "SLACK" | "TEAMS";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string;
}

export interface Metric {
  id: string;
  serviceId: string;
  name: string;
  value: number;
  timestamp: string;
}

export interface LogEntry {
  id: string;
  serviceId: string;
  level: "info" | "warn" | "error";
  message: string;
  timestamp: string;
  service?: {
    id: string;
    name: string;
  };
}

export interface Alert {
  id: string;
  incidentId: string;
  channel: AlertChannel;
  sentAt: string;
  success: boolean;
}

export interface Service {
  id: string;
  name: string;
  status: ServiceStatus;
  baselineMs: number | null;
  createdAt: string;
  _count?: {
    incidents: number;
    metrics: number;
    logs: number;
  };
}

export interface Incident {
  id: string;
  serviceId: string;
  service: Service;
  status: IncidentStatus;
  whatFailed: string;
  whyReason: string;
  impact: string;
  suggestedFix: string;
  rawContext?: {
    anomaly?: {
      isAnomaly: boolean;
      observedValue: number;
      baselineMean: number;
      stddev: number;
      deviationStdDevs: number;
    };
    metrics?: Metric[];
    logs?: LogEntry[];
    metricsSnapshot?: Metric[];
    logsSnapshot?: LogEntry[];
  } | null;
  alerts?: Alert[];
  createdAt: string;
  resolvedAt: string | null;
}

export interface DashboardSummary {
  totalServices: number;
  statusCounts: Record<string, number>;
  openIncidentCount: number;
  services: Service[];
  recentIncidents: Incident[];
}
