const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning existing records...");
  await prisma.alert.deleteMany({});
  await prisma.incident.deleteMany({});
  await prisma.metric.deleteMany({});
  await prisma.logEntry.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.organization.deleteMany({});

  console.log("Seeding organizations...");
  const org = await prisma.organization.create({
    data: {
      name: "Demo Startup Inc.",
      planTier: "PROFESSIONAL",
    },
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  console.log("Seeding users...");
  const admin = await prisma.user.create({
    data: {
      email: "admin@demo.com",
      passwordHash,
      name: "Alex Rivera (Admin)",
      role: "ADMIN",
      organizationId: org.id,
    },
  });

  const devops = await prisma.user.create({
    data: {
      email: "devops@demo.com",
      passwordHash,
      name: "Jordan Lee (DevOps)",
      role: "DEVOPS_ENGINEER",
      organizationId: org.id,
    },
  });

  const dev = await prisma.user.create({
    data: {
      email: "developer@demo.com",
      passwordHash,
      name: "Sam Chen (Developer)",
      role: "DEVELOPER",
      organizationId: org.id,
    },
  });

  console.log("Seeding monitored services...");
  const payment = await prisma.service.create({
    data: {
      name: "Payment Gateway",
      organizationId: org.id,
      status: "DEGRADED",
      baselineMs: 200,
    },
  });

  const checkout = await prisma.service.create({
    data: {
      name: "Checkout Service",
      organizationId: org.id,
      status: "HEALTHY",
      baselineMs: 150,
    },
  });

  const authSvc = await prisma.service.create({
    data: {
      name: "Auth & Identity API",
      organizationId: org.id,
      status: "HEALTHY",
      baselineMs: 85,
    },
  });

  const inventory = await prisma.service.create({
    data: {
      name: "Inventory Worker",
      organizationId: org.id,
      status: "HEALTHY",
      baselineMs: 120,
    },
  });

  console.log("Seeding time-series metrics...");
  const now = Date.now();
  const metricData = [];

  // Payment service: 30 baseline readings + 1 spike at the end
  for (let i = 0; i < 30; i++) {
    const jitter = Math.random() * 20 - 10;
    metricData.push({
      serviceId: payment.id,
      name: "latency_ms",
      value: Math.round((200 + jitter) * 10) / 10,
      timestamp: new Date(now - (32 - i) * 60000),
    });
  }
  // Spike that triggered anomaly
  metricData.push({
    serviceId: payment.id,
    name: "latency_ms",
    value: 1850.5,
    timestamp: new Date(now - 2 * 60000),
  });

  // Checkout service metrics
  for (let i = 0; i < 25; i++) {
    const jitter = Math.random() * 15 - 7.5;
    metricData.push({
      serviceId: checkout.id,
      name: "latency_ms",
      value: Math.round((150 + jitter) * 10) / 10,
      timestamp: new Date(now - (25 - i) * 60000),
    });
    metricData.push({
      serviceId: checkout.id,
      name: "error_rate",
      value: Math.round(Math.random() * 0.5 * 100) / 100,
      timestamp: new Date(now - (25 - i) * 60000),
    });
  }

  // Auth service metrics
  for (let i = 0; i < 25; i++) {
    const jitter = Math.random() * 10 - 5;
    metricData.push({
      serviceId: authSvc.id,
      name: "latency_ms",
      value: Math.round((85 + jitter) * 10) / 10,
      timestamp: new Date(now - (25 - i) * 60000),
    });
  }

  // Inventory worker metrics
  for (let i = 0; i < 25; i++) {
    const jitter = Math.random() * 15 - 7.5;
    metricData.push({
      serviceId: inventory.id,
      name: "latency_ms",
      value: Math.round((120 + jitter) * 10) / 10,
      timestamp: new Date(now - (25 - i) * 60000),
    });
  }

  await prisma.metric.createMany({ data: metricData });

  console.log("Seeding application logs...");
  const logEntries = [
    // Payment Gateway logs
    { serviceId: payment.id, level: "info", message: "Stripe API client initialized with TLS 1.3", timestamp: new Date(now - 30 * 60000) },
    { serviceId: payment.id, level: "info", message: "Payment intent #pi_991823 validated for $49.00", timestamp: new Date(now - 20 * 60000) },
    { serviceId: payment.id, level: "warn", message: "Database connection pool utilization high (82% active, 41/50 connections)", timestamp: new Date(now - 8 * 60000) },
    { serviceId: payment.id, level: "error", message: "Connection pool exhausted (active=50, max=50). Queue wait time exceeded 1500ms", timestamp: new Date(now - 3 * 60000) },
    { serviceId: payment.id, level: "error", message: "HTTP 504 Gateway Timeout while proxying request to /v1/charges", timestamp: new Date(now - 2 * 60000) },
    { serviceId: payment.id, level: "warn", message: "Circuit breaker TRIPPED for upstream billing-replica-02", timestamp: new Date(now - 1 * 60000) },

    // Checkout Service logs
    { serviceId: checkout.id, level: "info", message: "Cart checkout initiated for session #usr_7721", timestamp: new Date(now - 15 * 60000) },
    { serviceId: checkout.id, level: "info", message: "Discount code 'SPRING20' applied successfully", timestamp: new Date(now - 14 * 60000) },
    { serviceId: checkout.id, level: "warn", message: "Upstream payment service response time slower than usual (1820ms)", timestamp: new Date(now - 2 * 60000) },

    // Auth Service logs
    { serviceId: authSvc.id, level: "info", message: "OAuth token issued for user #usr_9941", timestamp: new Date(now - 10 * 60000) },
    { serviceId: authSvc.id, level: "info", message: "JWKS cache refreshed with 2 active public keys", timestamp: new Date(now - 5 * 60000) },
    { serviceId: authSvc.id, level: "warn", message: "Rate limit threshold reached for IP 192.168.1.104 (50 req/min)", timestamp: new Date(now - 1 * 60000) },

    // Inventory Worker logs
    { serviceId: inventory.id, level: "info", message: "Inventory sync job completed (14,200 items updated)", timestamp: new Date(now - 25 * 60000) },
    { serviceId: inventory.id, level: "info", message: "SKU #WH-8840 stock reserved for order #ord_3321", timestamp: new Date(now - 8 * 60000) },
  ];

  for (const log of logEntries) {
    await prisma.logEntry.create({ data: log });
  }

  console.log("Seeding sample incident & alerts...");
  const incident = await prisma.incident.create({
    data: {
      serviceId: payment.id,
      status: "OPEN",
      whatFailed: "Payment Gateway latency spike (1,850.5ms vs 200.0ms baseline)",
      whyReason: "Database connection pool exhaustion (50/50 active) caused request queue timeouts and upstream gateway latency spikes.",
      impact: "Users experiencing delayed checkout finalization; estimated 12% drop in transaction completions during the spike.",
      suggestedFix: "Increase PostgreSQL pool size from 50 to 150 connections and enable async webhook processing.",
      rawContext: {
        anomaly: {
          isAnomaly: true,
          observedValue: 1850.5,
          baselineMean: 200.2,
          stddev: 6.1,
          deviationStdDevs: 270.5,
        },
        metricsSnapshot: metricData.slice(-5),
        logsSnapshot: logEntries.filter((l) => l.serviceId === payment.id).slice(-3),
      },
      createdAt: new Date(now - 2 * 60000),
    },
  });

  await prisma.alert.createMany({
    data: [
      {
        incidentId: incident.id,
        channel: "SLACK",
        sentAt: new Date(now - 2 * 60000),
        success: true,
      },
      {
        incidentId: incident.id,
        channel: "EMAIL",
        sentAt: new Date(now - 2 * 60000),
        success: true,
      },
    ],
  });

  console.log("\nDatabase successfully seeded!");
  console.log("-----------------------------------------");
  console.log("Organization:", org.name);
  console.log("Logins:");
  console.log("  Admin:    admin@demo.com    / password123");
  console.log("  DevOps:   devops@demo.com   / password123");
  console.log("  Dev:      developer@demo.com/ password123");
  console.log("Monitored Services: 4");
  console.log("Sample Incidents:   1 (Payment Gateway)");
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
