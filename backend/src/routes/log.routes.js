const express = require("express");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

let Anthropic = null;
try {
  Anthropic = require("@anthropic-ai/sdk");
} catch (e) {}

const ingestSchema = z.object({
  serviceId: z.string(),
  level: z.enum(["info", "warn", "error"]).default("info"),
  message: z.string().min(1),
});

// Ingest a single log line
router.post("/ingest", async (req, res, next) => {
  try {
    const data = ingestSchema.parse(req.body);
    const service = await prisma.service.findFirst({
      where: { id: data.serviceId, organizationId: req.user.organizationId },
    });
    if (!service) return res.status(404).json({ error: "Service not found" });

    const log = await prisma.logEntry.create({ data });
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
});

// Query logs with filtering (serviceId, level, search, limit)
router.get("/", async (req, res, next) => {
  try {
    const { serviceId, level, search, limit } = req.query;
    const where = {
      service: { organizationId: req.user.organizationId },
    };

    if (serviceId) {
      where.serviceId = String(serviceId);
    }
    if (level && ["info", "warn", "error"].includes(String(level).toLowerCase())) {
      where.level = String(level).toLowerCase();
    }
    if (search) {
      where.message = { contains: String(search), mode: "insensitive" };
    }

    const logs = await prisma.logEntry.findMany({
      where,
      include: { service: { select: { id: true, name: true } } },
      orderBy: { timestamp: "desc" },
      take: Math.min(Number(limit) || 100, 300),
    });

    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// Query logs for a specific service
router.get("/:serviceId", async (req, res, next) => {
  try {
    const logs = await prisma.logEntry.findMany({
      where: {
        serviceId: req.params.serviceId,
        service: { organizationId: req.user.organizationId },
      },
      orderBy: { timestamp: "desc" },
      take: 200,
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// Explain raw log / stack trace using AI with smart heuristic fallback
const explainSchema = z.object({ rawLog: z.string().min(1) });

router.post("/explain", async (req, res, next) => {
  try {
    const { rawLog } = explainSchema.parse(req.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey && apiKey.startsWith("sk-ant-") && Anthropic) {
      try {
        const client = new Anthropic({ apiKey });
        const response = await client.messages.create({
          model: "claude-3-7-sonnet-20250219",
          max_tokens: 400,
          system:
            "You explain raw application/infra log output in plain English for engineers. " +
            "Be concise: 2-4 sentences. Name the likely root cause and one concrete next step. " +
            "If the log is too ambiguous to interpret, say so plainly.",
          messages: [{ role: "user", content: rawLog.slice(0, 8000) }],
        });

        const explanation = response.content
          .map((b) => (b.type === "text" ? b.text : ""))
          .join("")
          .trim();

        if (explanation) {
          return res.json({ explanation });
        }
      } catch (err) {
        console.warn("[log.routes] Anthropic explain failed, falling back to heuristic:", err.message);
      }
    }

    // Heuristic intelligent log explanation fallback
    const explanation = generateHeuristicLogExplanation(rawLog);
    res.json({ explanation });
  } catch (err) {
    next(err);
  }
});

function generateHeuristicLogExplanation(raw) {
  const text = raw.toLowerCase();

  if (text.includes("connection pool") || text.includes("pool exhausted") || text.includes("econnrefused")) {
    return "The application failed because its database connection pool reached maximum capacity and incoming requests timed out waiting for an open connection. Recommended next step: increase the connection pool size in your database client config and check for unindexed or slow queries holding locks.";
  }
  if (text.includes("504") || text.includes("gateway timeout") || text.includes("etimedout")) {
    return "A 504 Gateway Timeout occurred because an upstream service or proxy took too long to respond to an internal HTTP request. Recommended next step: verify the health and latency of the upstream microservice and inspect network routing rules.";
  }
  if (text.includes("out of memory") || text.includes("heap limit") || text.includes("javascript heap out of memory")) {
    return "The process ran out of allocated memory (OOM), likely due to a memory leak or processing large payloads in memory all at once. Recommended next step: increase Node.js --max-old-space-size or stream large data sets instead of buffering them in RAM.";
  }
  if (text.includes("rate limit") || text.includes("429") || text.includes("too many requests")) {
    return "The request was rejected due to hitting an API rate limit threshold (HTTP 429). Recommended next step: check if a client is generating excessive request bursts and verify your backoff/retry jitter strategy.";
  }
  if (text.includes("jwks") || text.includes("unauthorized") || text.includes("jwt") || text.includes("401") || text.includes("invalid token")) {
    return "Authentication failed because the provided access token is missing, expired, or signed with an invalid cryptographic key. Recommended next step: inspect token expiration timestamps and ensure the auth secret/keys match across microservices.";
  }
  if (text.includes("syntaxerror") || text.includes("typeerror") || text.includes("cannot read property") || text.includes("undefined")) {
    return "A runtime JavaScript exception occurred due to accessing an undefined property or object reference. Recommended next step: add null checks or optional chaining (?.) at the stack trace line number referenced in the log.";
  }

  return `Log analysis: The log entry indicates an operational event: "${raw.slice(0, 120).trim()}...". Review recent dependency response times and check service error logs around this timestamp.`;
}

module.exports = router;
