let Anthropic = null;
try {
  Anthropic = require("@anthropic-ai/sdk");
} catch (e) {
  // SDK optional in fallback mode
}

const SYSTEM_PROMPT = `You are the AI Root Cause Engine inside an observability platform called DevSight AI.
You are given recent metrics and log lines for one service that has just been flagged as anomalous.
Correlate them and respond ONLY with a valid JSON object (no markdown fences, no conversational prose) with exactly these keys:
{
  "whatFailed": "short title of what failed, e.g. 'Payment Service Latency Spike'",
  "whyReason": "one or two sentence root cause explanation in plain English",
  "impact": "one sentence describing the downstream/business impact",
  "suggestedFix": "one concrete, actionable fix"
}
Be specific and reference the actual numbers/errors given to you.`;

/**
 * @param {object} params
 * @param {string} params.serviceName
 * @param {Array<{name:string,value:number,timestamp:Date}>} params.metrics
 * @param {Array<{level:string,message:string,timestamp:Date}>} params.logs
 * @param {object} params.anomaly - output of anomalyDetection.recordMetricAndCheck
 */
async function generateRootCauseReport({ serviceName, metrics = [], logs = [], anomaly = {} }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey && apiKey.startsWith("sk-ant-") && Anthropic) {
    try {
      const client = new Anthropic({ apiKey });
      const context = buildContext({ serviceName, metrics, logs, anomaly });

      const response = await client.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: context }],
      });

      const text = response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("")
        .trim();

      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.whatFailed && parsed.whyReason && parsed.impact && parsed.suggestedFix) {
        return parsed;
      }
    } catch (err) {
      console.warn("[aiRootCause] Anthropic API call failed or timed out. Falling back to heuristic AI engine:", err.message);
    }
  }

  // Resilient heuristic AI correlation engine (works out of the box with zero external API keys)
  return generateHeuristicRootCause({ serviceName, metrics, logs, anomaly });
}

function generateHeuristicRootCause({ serviceName, metrics, logs, anomaly }) {
  const observedVal = anomaly.observedValue || (metrics[0]?.value ?? "unknown");
  const baseline = anomaly.baselineMean ? `${anomaly.baselineMean}ms` : "baseline";
  const deviation = anomaly.deviationStdDevs ? ` (${anomaly.deviationStdDevs} standard deviations above normal)` : "";

  // Check recent logs for errors or warnings
  const recentErrors = logs.filter((l) => l.level === "error");
  const recentWarns = logs.filter((l) => l.level === "warn");

  let whatFailed = `${serviceName} anomalous metric spike`;
  let whyReason = `Metric ${anomaly.observedValue ? observedVal : "level"} significantly exceeded normal ${baseline}${deviation}.`;
  let impact = `Downstream callers may experience degraded responsiveness or timeouts.`;
  let suggestedFix = `Inspect recent service deployments, database connection pool, and upstream dependency health.`;

  if (recentErrors.length > 0) {
    const errorMsg = recentErrors[0].message;
    whatFailed = `${serviceName} latency & error spike`;

    if (/connection pool|exhausted|database|timeout/i.test(errorMsg)) {
      whyReason = `Database connection saturation and request queue timeouts (${errorMsg.slice(0, 90)}...).`;
      impact = `Requests are waiting in queue, causing end-user latency to spike to ${observedVal}ms.`;
      suggestedFix = `Scale database connection pool limits or investigate slow queries holding open locks.`;
    } else if (/memory|heap|oom/i.test(errorMsg)) {
      whyReason = `High memory utilization triggered aggressive GC pauses (${errorMsg.slice(0, 90)}...).`;
      impact = `Node event-loop latency degraded, slowing down HTTP handlers.`;
      suggestedFix = `Increase container memory ceiling and check for object leaks in memory snapshots.`;
    } else if (/gateway|504|502|500/i.test(errorMsg)) {
      whyReason = `Upstream network dependency returned errors (${errorMsg.slice(0, 90)}...).`;
      impact = `Cascading delays impacting dependent user workflows.`;
      suggestedFix = `Check upstream API provider status and verify circuit breaker failover thresholds.`;
    } else {
      whyReason = `Recent critical error detected: "${errorMsg.slice(0, 100)}" during traffic spike.`;
    }
  } else if (recentWarns.length > 0) {
    whyReason = `Resource warning triggered: "${recentWarns[0].message.slice(0, 100)}".`;
  }

  return {
    whatFailed,
    whyReason,
    impact,
    suggestedFix,
  };
}

function buildContext({ serviceName, metrics, logs, anomaly }) {
  const metricLines = metrics
    .slice(0, 20)
    .map((m) => `${m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp} ${m.name}=${m.value}`)
    .join("\n");

  const logLines = logs
    .slice(0, 30)
    .map((l) => `[${l.level}] ${l.timestamp instanceof Date ? l.timestamp.toISOString() : l.timestamp} ${l.message}`)
    .join("\n");

  return `Service: ${serviceName}

Anomaly detected:
${JSON.stringify(anomaly, null, 2)}

Recent metrics:
${metricLines || "(none)"}

Recent logs:
${logLines || "(none)"}`;
}

module.exports = { generateRootCauseReport };
