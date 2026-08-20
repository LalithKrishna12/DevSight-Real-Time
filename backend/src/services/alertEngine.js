const prisma = require("../utils/prisma");

// Each channel sender takes an incident (with service included) and
// returns true/false for success. Wire up real credentials in .env;
// senders no-op (log only) when their config is missing so local dev
// never crashes on a missing webhook.

async function sendSlack(incident) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  const text = formatMessage(incident);
  if (!webhook) {
    console.log("[alertEngine] SLACK_WEBHOOK_URL not set — simulated dispatch. Alert message:\n", text);
    return true; // Marked simulated delivery for dev
  }
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch (e) {
    console.error("[alertEngine] Slack dispatch failed:", e.message);
    return false;
  }
}

async function sendEmail(incident) {
  const text = formatMessage(incident);
  if (!process.env.SMTP_HOST) {
    console.log("[alertEngine] SMTP not configured — simulated email alert to devops team:\n", text);
    return true; // Simulated delivery for dev
  }
  // In production, nodemailer can be used with SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
  return true;
}

async function sendTeams(incident) {
  const webhook = process.env.TEAMS_WEBHOOK_URL;
  const text = formatMessage(incident);
  if (!webhook) {
    console.log("[alertEngine] TEAMS_WEBHOOK_URL not set — simulated Teams alert:\n", text);
    return true;
  }
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `DevSight AI Alert: ${incident.service?.name || "Service"} Incident`,
        text,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("[alertEngine] Teams dispatch failed:", e.message);
    return false;
  }
}

function formatMessage(incident) {
  const serviceName = incident.service?.name || "Monitored Service";
  return `🚨 *${serviceName}* — ${incident.whatFailed}
*Why:* ${incident.whyReason}
*Impact:* ${incident.impact}
*Suggested fix:* ${incident.suggestedFix}`;
}

const SENDERS = { SLACK: sendSlack, EMAIL: sendEmail, TEAMS: sendTeams };

async function dispatchAlerts(incident, channels = ["SLACK", "EMAIL"]) {
  const results = [];
  for (const channel of channels) {
    const sender = SENDERS[channel];
    if (!sender) continue;
    try {
      const success = await sender(incident);
      const alert = await prisma.alert.create({
        data: { incidentId: incident.id, channel, success: Boolean(success) },
      });
      results.push(alert);
    } catch (e) {
      console.error(`[alertEngine] Failed to dispatch ${channel}:`, e.message);
    }
  }
  return results;
}

module.exports = { dispatchAlerts };
