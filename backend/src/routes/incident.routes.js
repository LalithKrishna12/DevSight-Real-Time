const express = require("express");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const { status, serviceId } = req.query;
    const where = {
      service: { organizationId: req.user.organizationId },
    };

    if (status && ["OPEN", "INVESTIGATING", "RESOLVED"].includes(String(status).toUpperCase())) {
      where.status = String(status).toUpperCase();
    }
    if (serviceId) {
      where.serviceId = String(serviceId);
    }

    const incidents = await prisma.incident.findMany({
      where,
      include: { service: true, alerts: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(incidents);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const incident = await prisma.incident.findFirst({
      where: { id: req.params.id, service: { organizationId: req.user.organizationId } },
      include: { service: true, alerts: true },
    });
    if (!incident) return res.status(404).json({ error: "Incident not found" });
    res.json(incident);
  } catch (err) {
    next(err);
  }
});

const statusSchema = z.object({
  status: z.enum(["OPEN", "INVESTIGATING", "RESOLVED"]),
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);

    const incident = await prisma.incident.findFirst({
      where: { id: req.params.id, service: { organizationId: req.user.organizationId } },
    });
    if (!incident) return res.status(404).json({ error: "Incident not found" });

    const data = {
      status,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
    };

    const updated = await prisma.incident.update({
      where: { id: incident.id },
      data,
      include: { service: true, alerts: true },
    });

    if (status === "RESOLVED") {
      // Check if there are other open incidents for this service
      const otherOpen = await prisma.incident.count({
        where: {
          serviceId: incident.serviceId,
          status: { not: "RESOLVED" },
          id: { not: incident.id },
        },
      });
      if (otherOpen === 0) {
        await prisma.service.update({
          where: { id: incident.serviceId },
          data: { status: "HEALTHY" },
        });
      }
    } else if (status === "INVESTIGATING" || status === "OPEN") {
      await prisma.service.update({
        where: { id: incident.serviceId },
        data: { status: "DEGRADED" },
      });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/resolve", async (req, res, next) => {
  try {
    const incident = await prisma.incident.findFirst({
      where: { id: req.params.id, service: { organizationId: req.user.organizationId } },
    });
    if (!incident) return res.status(404).json({ error: "Incident not found" });

    const updated = await prisma.incident.update({
      where: { id: incident.id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
      include: { service: true, alerts: true },
    });

    await prisma.service.update({
      where: { id: incident.serviceId },
      data: { status: "HEALTHY" },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
