# DevSight AI — MVP scaffold

A working monolith implementation of the DevSight AI PRD: Node/Express + PostgreSQL (Prisma) backend,
React + TypeScript frontend. Built to be split into microservices later, matching the PRD's own
architecture diagram (Auth / Metrics / Log / Alert / AI Analysis / Billing services).

## What's implemented

| PRD feature | Status |
|---|---|
| Auth (JWT, RBAC: Admin/DevOps/Developer/Manager) | ✅ working |
| Unified Dashboard | ✅ working |
| Anomaly Detection (statistical baseline) | ✅ working (v1 — see note below) |
| AI Root Cause Engine | ✅ working (calls Claude, needs your API key) |
| Log Analyzer | ✅ working |
| Alert Engine (Slack) | ✅ working (needs a webhook URL) |
| Alert Engine (Email, Teams) | 🔲 stubbed — logs to console, wire up SMTP/Teams webhook |
| AI Incident Agent (auto-trigger on anomaly) | ✅ working — `metrics/ingest` → anomaly → incident → alert, end to end |
| Billing / plan tiers | 🔲 schema only (`Organization.planTier`) — no Stripe integration yet |
| Log/metric ingestion from real Prometheus/OTel/Loki | 🔲 not built — current ingest is a plain REST endpoint you POST to |

**Anomaly detection note:** the PRD's "learns normal behavior" is implemented as a rolling
mean/stddev over each service's last 200 metric points, flagging values ≥3 standard deviations
out. This is intentionally simple (no ML) so it's easy to reason about and swap out — see
`backend/src/services/anomalyDetection.js`.

## Project layout

```
devsight-ai/
├── backend/           Express API, Prisma schema, AI + alert services
│   ├── prisma/schema.prisma   Full data model (Org, User, Service, Metric, LogEntry, Incident, Alert)
│   ├── prisma/seed.js         Demo org + login + sample data
│   └── src/
│       ├── routes/            auth, services, metrics, logs, incidents, alerts, dashboard
│       ├── services/          anomalyDetection, aiRootCause, alertEngine, incidentTrigger
│       └── middleware/auth.js JWT + role guard
├── frontend/          Vite + React + TypeScript
│   └── src/pages/     Login, Dashboard, Incidents, IncidentDetail, LogAnalyzer
└── docker-compose.yml Local Postgres
```

## Setup

### 1. Database
```bash
docker compose up -d postgres
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# edit .env — set ANTHROPIC_API_KEY, and SLACK_WEBHOOK_URL if you want real Slack alerts
npm install
npm run prisma:migrate   # creates tables
npm run seed              # demo org + admin@demo.com / password123
npm run dev                # http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

Log in with `admin@demo.com` / `password123`.

### 4. Trigger an end-to-end incident (manually, to see the AI pipeline work)

The seed data gives Payment Service a ~200ms latency baseline. POST an outlier value to force
an anomaly → AI root cause report → dashboard/incident entry:

```bash
# Get a token first: POST /api/auth/login with the demo credentials, copy `token`
curl -X POST http://localhost:4000/api/metrics/ingest \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"serviceId":"<payment-service-id-from-dashboard>","name":"latency_ms","value":1800}'
```

Within a few seconds a new Incident should appear on the dashboard with a plain-English root cause.

## Suggested build order from here

1. **Wire up real ingestion**: a small agent/exporter (or Prometheus remote-write receiver) that
   POSTs to `/api/metrics/ingest` and `/api/logs/ingest` instead of manual curl calls.
2. **Email + Teams alert channels** — `backend/src/services/alertEngine.js` has the TODOs.
3. **Billing** — Stripe subscription tied to `Organization.planTier`, enforce service-count limits
   per the PRD's pricing table (Starter/Professional/Enterprise).
4. **Split into microservices** — once the monolith outgrows itself, each `routes/*.routes.js` +
   its matching `services/*.js` is already close to a natural service boundary (Auth, Metrics,
   Log, Alert, AI Analysis).
5. **Real anomaly detection** — replace the stddev check with a proper time-series model
   (e.g. seasonal baseline) if you outgrow the simple version.
