const prisma = require("../utils/prisma");
const { generateRootCauseReport } = require("./aiRootCause");
const { dispatchAlerts } = require("./alertEngine");

// This is the "AI Incident Agent" from the PRD: on an anomaly, it autonomously
// pulls recent metrics + logs, asks the AI Root Cause Engine to correlate them,
// persists the structured Incident, and fires alerts.
async function triggerIncidentAnalysis(service, anomaly) {
  const [metrics, logs] = await Promise.all([
    prisma.metric.findMany({
      where: { serviceId: service.id },
      orderBy: { timestamp: "desc" },
      take: 20,
    }),
    prisma.logEntry.findMany({
      where: { serviceId: service.id },
      orderBy: { timestamp: "desc" },
      take: 30,
    }),
  ]);

  const report = await generateRootCauseReport({
    serviceName: service.name,
    metrics,
    logs,
    anomaly,
  });

  const incident = await prisma.incident.create({
    data: {
      serviceId: service.id,
      whatFailed: report.whatFailed,
      whyReason: report.whyReason,
      impact: report.impact,
      suggestedFix: report.suggestedFix,
      rawContext: { metrics, logs, anomaly },
    },
    include: { service: true },
  });

  await prisma.service.update({
    where: { id: service.id },
    data: { status: "DEGRADED" },
  });

  await dispatchAlerts(incident, ["SLACK", "EMAIL"]);

  return incident;
}

module.exports = { triggerIncidentAnalysis };
