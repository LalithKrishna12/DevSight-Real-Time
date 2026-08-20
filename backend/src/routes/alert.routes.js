const express = require("express");
const prisma = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: { incident: { service: { organizationId: req.user.organizationId } } },
      include: { incident: { include: { service: true } } },
      orderBy: { sentAt: "desc" },
      take: 100,
    });
    res.json(alerts);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
