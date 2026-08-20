const express = require("express");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");
const { recordMetricAndCheck } = require("../services/anomalyDetection");
const { triggerIncidentAnalysis } = require("../services/incidentTrigger");

const router = express.Router();
router.use(requireAuth);

const ingestSchema = z.object({
  serviceId: z.string(),
  name: z.string().default("latency_ms"),
  value: z.number(),
});

// This is what Prometheus/OTel exporters or agents POST to
router.post("/ingest", async (req, res, next) => {
  try {
    const data = ingestSchema.parse(req.body);

    const service = await prisma.service.findFirst({
      where: { id: data.serviceId, organizationId: req.user.organizationId },
    });
    if (!service) return res.status(404).json({ error: "Service not found" });

    const anomaly = await recordMetricAndCheck(data.serviceId, data.name, data.value);

    let incident = null;
    if (anomaly.isAnomaly) {
      // Create warning / error logs to give AI rich context
      await prisma.logEntry.create({
        data: {
          serviceId: service.id,
          level: "error",
          message: `High latency spike detected: ${data.value}ms. Response threshold exceeded.`,
        },
      });

      incident = await triggerIncidentAnalysis(service, anomaly).catch((err) => {
        console.error("[metric.routes] incident analysis failed:", err);
        return null;
      });
    }

    res.status(202).json({ recorded: true, anomaly, incident });
  } catch (err) {
    next(err);
  }
});

// Quick simulator endpoint to test normal metrics or trigger an anomaly spike directly from UI
const simulateSchema = z.object({
  serviceId: z.string(),
  type: z.enum(["NORMAL", "ANOMALY"]).default("ANOMALY"),
  multiplier: z.number().optional().default(8.5),
});

router.post("/simulate", async (req, res, next) => {
  try {
    const { serviceId, type, multiplier } = simulateSchema.parse(req.body);

    const service = await prisma.service.findFirst({
      where: { id: serviceId, organizationId: req.user.organizationId },
    });
    if (!service) return res.status(404).json({ error: "Service not found" });

    const baseline = service.baselineMs || 150;
    let value;

    if (type === "ANOMALY") {
      value = Math.round(baseline * multiplier * 10) / 10;
      await prisma.logEntry.create({
        data: {
          serviceId: service.id,
          level: "warn",
          message: `Elevated concurrency on worker threads. Processing backlog queue size > 400 items.`,
        },
      });
      await prisma.logEntry.create({
        data: {
          serviceId: service.id,
          level: "error",
          message: `Connection pool exhausted or upstream gateway timeout during transaction spike.`,
        },
      });
    } else {
      const jitter = (Math.random() * 0.1 - 0.05) * baseline;
      value = Math.round((baseline + jitter) * 10) / 10;
    }

    const anomaly = await recordMetricAndCheck(service.id, "latency_ms", value);

    let incident = null;
    if (anomaly.isAnomaly) {
      incident = await triggerIncidentAnalysis(service, anomaly).catch((err) => {
        console.error("[metric.routes] incident analysis failed:", err);
        return null;
      });
    }

    res.json({
      message: type === "ANOMALY" ? "Anomaly simulated and incident generated" : "Normal metric ingested",
      value,
      anomaly,
      incident,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:serviceId", async (req, res, next) => {
  try {
    const metrics = await prisma.metric.findMany({
      where: {
        serviceId: req.params.serviceId,
        service: { organizationId: req.user.organizationId },
      },
      orderBy: { timestamp: "desc" },
      take: 200,
    });
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
