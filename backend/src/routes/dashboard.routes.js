const express = require("express");
const prisma = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// One screen: service health, open incident count, recent incidents.
// This is the "Unified Dashboard" feature — deliberately a single aggregate
// call so the frontend doesn't have to fan out to five endpoints on load.
router.get("/", async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;

    const [services, openIncidents, recentIncidents] = await Promise.all([
      prisma.service.findMany({ where: { organizationId: orgId } }),
      prisma.incident.count({
        where: { service: { organizationId: orgId }, status: { not: "RESOLVED" } },
      }),
      prisma.incident.findMany({
        where: { service: { organizationId: orgId } },
        include: { service: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const statusCounts = services.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      totalServices: services.length,
      statusCounts,
      openIncidentCount: openIncidents,
      services,
      recentIncidents,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
