const express = require("express");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const services = await prisma.service.findMany({
      where: { organizationId: req.user.organizationId },
      include: {
        _count: {
          select: {
            incidents: { where: { status: { not: "RESOLVED" } } },
            metrics: true,
            logs: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
    res.json(services);
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  name: z.string().min(1),
  baselineMs: z.number().optional().default(100),
});

router.post("/", requireRole("ADMIN", "DEVOPS_ENGINEER"), async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const service = await prisma.service.create({
      data: {
        name: data.name,
        baselineMs: data.baselineMs,
        status: "HEALTHY",
        organizationId: req.user.organizationId,
      },
    });

    // Automatically seed a baseline of metric points so anomaly detection has statistical context
    const now = Date.now();
    const baseline = data.baselineMs || 100;
    const initialMetrics = [];
    for (let i = 0; i < 25; i++) {
      const jitter = (Math.random() * 0.1 - 0.05) * baseline;
      initialMetrics.push({
        serviceId: service.id,
        name: "latency_ms",
        value: Math.round((baseline + jitter) * 10) / 10,
        timestamp: new Date(now - (25 - i) * 60000),
      });
    }
    await prisma.metric.createMany({ data: initialMetrics });

    await prisma.logEntry.create({
      data: {
        serviceId: service.id,
        level: "info",
        message: `Service registered to DevSight monitoring. Baseline calibrated at ${baseline}ms.`,
      },
    });

    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const service = await prisma.service.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId },
      include: {
        incidents: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
    if (!service) return res.status(404).json({ error: "Service not found" });

    const recentMetrics = await prisma.metric.findMany({
      where: { serviceId: service.id },
      orderBy: { timestamp: "desc" },
      take: 30,
    });

    res.json({ ...service, recentMetrics });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireRole("ADMIN", "DEVOPS_ENGINEER"), async (req, res, next) => {
  try {
    const service = await prisma.service.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId },
    });
    if (!service) return res.status(404).json({ error: "Service not found" });

    // Cascade delete relations
    const incidentIds = (
      await prisma.incident.findMany({
        where: { serviceId: service.id },
        select: { id: true },
      })
    ).map((i) => i.id);

    if (incidentIds.length > 0) {
      await prisma.alert.deleteMany({ where: { incidentId: { in: incidentIds } } });
      await prisma.incident.deleteMany({ where: { id: { in: incidentIds } } });
    }
    await prisma.metric.deleteMany({ where: { serviceId: service.id } });
    await prisma.logEntry.deleteMany({ where: { serviceId: service.id } });
    await prisma.service.delete({ where: { id: service.id } });

    res.json({ message: "Service deleted successfully" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
