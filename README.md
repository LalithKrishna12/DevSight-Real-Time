# DevSight AI — Autonomous Cloud & Microservice Observability

[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript-blue)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20Prisma-indigo)](https://www.prisma.io/)
[![AI](https://img.shields.io/badge/AI%20Engine-Claude%203.7%20%2B%20Heuristic%20Core-purple)](https://www.anthropic.com/)
[![License](https://img.shields.io/badge/License-MIT-orange)](#)

> **DevSight AI** is a real-time cloud observability and autonomous incident diagnosis platform. Instead of just displaying raw metric graphs, DevSight AI detects statistical anomalies ($\ge 3\sigma$), correlates telemetry snapshots with error logs, and delivers an instant **plain-English root cause explanation** with actionable remediation steps in seconds.

---

## 📄 Project Guide & Viva Preparation PDF
The complete technical and viva preparation guide is available in the repository:  
👉 **[Download / View DevSight_AI_Project_Guide.pdf](./DevSight_AI_Project_Guide.pdf)**

---

## 🚀 Key Features Implemented

| Feature | Status | Details |
|---|---|---|
| **Multi-Tenant Auth & RBAC** | ✅ Working | JWT Authentication with role guard (`ADMIN`, `DEVOPS_ENGINEER`, `DEVELOPER`, `MANAGER`) and Org Registration. |
| **Unified Ops Dashboard** | ✅ Working | Real-time health cards, auto-refreshing stats, and high-visibility incident overview. |
| **Statistical Anomaly Detection** | ✅ Working | Rolling mean/stddev over 200 samples; flags outliers deviating by $\ge 3\sigma$. |
| **AI Root Cause Engine** | ✅ Working | Powered by Claude 3.7 Sonnet with an **intelligent heuristic fallback engine** (works out-of-the-box with zero setup). |
| **Autonomous Incident Agent** | ✅ Working | End-to-end autonomous pipeline: Ingest $\rightarrow$ Anomaly $\rightarrow$ AI Diagnosis $\rightarrow$ Persistent Incident $\rightarrow$ Alert. |
| **Live Log Analyzer & Stream** | ✅ Working | Multi-service live log viewer with level filters (`INFO`, `WARN`, `ERROR`), search, and **1-click inline AI explanations**. |
| **1-Click Anomaly Simulator** | ✅ Working | Test the full AI pipeline directly from the UI by simulating traffic or latency spikes on any service. |
| **Multi-Channel Alerting** | ✅ Working | Structured notification dispatcher for **Slack Webhooks**, **Email (SMTP)**, and **Microsoft Teams**. |
| **Service Management** | ✅ Working | Register new microservices with calibrated baselines and cascade deletion. |

---

## 🏗️ System Architecture

```
                  ┌─────────────────────────────────────────┐
                  │       Frontend (React + TypeScript)     │
                  │   Dashboard | Incidents | Log Analyzer  │
                  └────────────────────┬────────────────────┘
                                       │ HTTP / REST
                  ┌────────────────────▼────────────────────┐
                  │       Backend (Node.js + Express)       │
                  │  JWT Auth & RBAC Guard (Admin/DevOps)   │
                  └───────┬─────────────────────────┬───────┘
                          │                         │
     ┌────────────────────▼──────────────┐   ┌──────▼─────────────────────┐
     │  Statistical Anomaly Detector     │   │      PostgreSQL (Prisma)    │
     │  (Rolling 3σ stddev baseline)     │   │  Orgs, Users, Services,    │
     └────────────────────┬──────────────┘   │  Metrics, Logs, Incidents  │
                          │ Trigger          └────────────────────────────┘
     ┌────────────────────▼──────────────┐
     │      AI Root Cause Engine         │ ───► Multi-Channel Alert Engine
     │  (Claude Sonnet + Heuristic Core) │      (Slack Webhooks / Email / Teams)
     └───────────────────────────────────┘
```

---

## ⚡ Quick Start

### 1. Prerequisites
* **Node.js:** v18 or higher
* **PostgreSQL:** Running on `localhost:5432` (or SQLite fallback)

### 2. Install & Start Backend
```bash
cd backend
npm install
npm run db:push    # syncs schema to PostgreSQL
npm run seed       # seeds demo org, 4 services, metrics, logs, and incidents
npm run dev        # running on http://localhost:4000
```

### 3. Install & Start Frontend
```bash
cd frontend
npm install
npm run dev        # running on http://localhost:5173
```

---

## 🔑 Demo Login Credentials

You can sign in directly with the seeded demo credentials:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@demo.com` | `password123` |
| **DevOps Engineer** | `devops@demo.com` | `password123` |
| **Developer** | `developer@demo.com` | `password123` |

*(You can also use the **"Register Org"** tab on the login screen to create a brand new organization).*

---

## 🧪 Testing the Autonomous AI Incident Pipeline

You can test the entire pipeline in **1 click** from the dashboard:

1. Log in to `http://localhost:5173`.
2. On the **Unified Dashboard**, find **Payment Gateway**.
3. Click **"⚡ Simulate Anomaly"**.
4. **Watch the magic happen:**
   - A latency spike ($\ge 1,600\text{ms}$) is recorded.
   - Statistical anomaly detector flags the $\ge 3\sigma$ deviation.
   - AI correlates recent error logs (`connection pool exhausted`) with the spike.
   - Structured Incident report is created with plain-English *Why*, *Impact*, and *Suggested Fix*.
   - Service status transitions to **`DEGRADED`** and alerts are dispatched.
5. Click on the new Incident to view the full diagnostic telemetry snapshot.

---

## 📂 Project Layout

```
devsight-ai/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # PostgreSQL relational schema
│   │   └── seed.js                # Seed script for services, metrics & logs
│   └── src/
│       ├── middleware/auth.js     # JWT & RBAC permission guards
│       ├── routes/                # Auth, Services, Metrics, Logs, Incidents, Alerts
│       ├── services/
│       │   ├── anomalyDetection.js# 3-sigma statistical baseline calculator
│       │   ├── aiRootCause.js     # Claude 3.7 + Heuristic fallback engine
│       │   ├── alertEngine.js     # Slack, Email, and Teams alert dispatcher
│       │   └── incidentTrigger.js # Autonomous incident correlation agent
│       └── server.js              # Express app entry point
├── frontend/
│   └── src/
│       ├── api/client.ts          # API client & TypeScript interfaces
│       ├── context/AuthContext.tsx# Authentication provider
│       ├── pages/
│       │   ├── Login.tsx          # Login & Organization registration
│       │   ├── Dashboard.tsx      # Ops overview & 1-click anomaly simulator
│       │   ├── Incidents.tsx      # Multi-status incident filtering
│       │   ├── IncidentDetail.tsx # AI diagnosis & telemetry snapshot viewer
│       │   └── LogAnalyzer.tsx    # Live log stream & 1-click AI explainer
│       └── styles/global.css      # Dark ops high-contrast theme
├── DevSight_AI_Project_Guide.pdf  # Complete viva & technical project guide
└── README.md
```

---

## 📜 License
MIT License. Built for real-time cloud observability and autonomous AI incident operations.
