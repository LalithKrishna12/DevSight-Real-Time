const prisma = require("../utils/prisma");

// Simple statistical anomaly detector: compares an incoming metric value
// against the service's rolling baseline for that metric name.
// Not ML — this is the "PRD-accurate" v1: learn a mean/stddev, flag outliers.
// Swap this module out for a proper model later without touching callers.

const DEVIATION_THRESHOLD_STDDEVS = 3;
const MIN_SAMPLES_BEFORE_FLAGGING = 20;

async function recordMetricAndCheck(serviceId, name, value) {
  await prisma.metric.create({ data: { serviceId, name, value } });

  const recent = await prisma.metric.findMany({
    where: { serviceId, name },
    orderBy: { timestamp: "desc" },
    take: 200,
  });

  if (recent.length < MIN_SAMPLES_BEFORE_FLAGGING) {
    return { isAnomaly: false, reason: "insufficient_baseline_data" };
  }

  const values = recent.map((m) => m.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);

  const deviation = stddev === 0 ? 0 : Math.abs(value - mean) / stddev;
  const isAnomaly = deviation >= DEVIATION_THRESHOLD_STDDEVS;

  return {
    isAnomaly,
    baselineMean: Math.round(mean * 100) / 100,
    stddev: Math.round(stddev * 100) / 100,
    observedValue: value,
    deviationStdDevs: Math.round(deviation * 100) / 100,
  };
}

module.exports = { recordMetricAndCheck };
