import nodemailer from 'nodemailer';

// ─── Transport ────────────────────────────────────────────────────────────────
// Uses Gmail SMTP with App Password (simpler than OAuth2 for hackathon).
// To generate an App Password:
//   1. Enable 2FA on your Google account
//   2. Go to myaccount.google.com → Security → App Passwords
//   3. Generate one for "Mail" and paste it in .env as GMAIL_APP_PASSWORD
// ─────────────────────────────────────────────────────────────────────────────

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

// ─── Internal send helper ────────────────────────────────────────────────────

async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter();

  const info = await transport.sendMail({
    from: `"AgenX SRE Bot 🤖" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,   // plain-text fallback
    html,
  });

  console.log(`📧 Email sent to ${to} — MessageId: ${info.messageId}`);
  return info;
}

// ─── Priority badge helper ────────────────────────────────────────────────────

function priorityBadge(priority) {
  const map = {
    high:   { color: '#dc2626', label: '🔴 HIGH' },
    medium: { color: '#d97706', label: '🟡 MEDIUM' },
    low:    { color: '#16a34a', label: '🟢 LOW' },
  };
  return map[priority?.toLowerCase()] || { color: '#6b7280', label: priority?.toUpperCase() || 'UNKNOWN' };
}

// ─── Email templates ─────────────────────────────────────────────────────────

function templateUserConfirmation({ ticket, reporterEmail }) {
  const badge = priorityBadge(ticket.priority);

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 24px; }
      .card { background: #fff; border-radius: 12px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
      .header { background: #1e1b4b; padding: 28px 32px; }
      .header h1 { color: #fff; margin: 0; font-size: 20px; font-weight: 700; }
      .header p  { color: #a5b4fc; margin: 4px 0 0; font-size: 13px; }
      .body { padding: 28px 32px; }
      .badge { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; color: #fff; background: ${badge.color}; }
      .field-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; margin: 20px 0 4px; }
      .field-value { font-size: 14px; color: #111827; }
      .description-box { background: #f9fafb; border-left: 3px solid #6366f1; border-radius: 4px; padding: 12px 16px; font-size: 13px; color: #374151; margin-top: 4px; }
      .btn { display: inline-block; margin-top: 24px; padding: 10px 20px; background: #4f46e5; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
      .footer { padding: 16px 32px; background: #f9fafb; font-size: 12px; color: #9ca3af; border-top: 1px solid #f0f0f0; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <h1>🎫 Ticket Received</h1>
        <p>AgenX SRE — Incident Intake System</p>
      </div>
      <div class="body">
        <p style="color:#374151; font-size:14px; margin-top:0">
          Hi there! Your incident report has been received and is being processed by our SRE team.
          Here's a summary of what was logged:
        </p>

        <div class="field-label">Ticket ID</div>
        <div class="field-value" style="font-family:monospace; font-size:15px; font-weight:700; color:#4f46e5">${ticket.jiraKey}</div>

        <div class="field-label">Summary</div>
        <div class="field-value">${ticket.summary}</div>

        <div class="field-label">Category</div>
        <div class="field-value" style="text-transform:capitalize">${ticket.category}</div>

        <div class="field-label">Priority</div>
        <div class="field-value"><span class="badge">${badge.label}</span></div>

        <div class="field-label">Your Report</div>
        <div class="description-box">${ticket.description}</div>

        <a class="btn" href="${ticket.jiraUrl}" target="_blank">View Ticket in Jira →</a>
      </div>
      <div class="footer">
        You'll receive another email once your ticket is resolved. &nbsp;|&nbsp; AgenX SRE Bot
      </div>
    </div>
  </body>
  </html>
  `;

  const text = `
Ticket Received — AgenX SRE

Your report has been logged. Details:
  Ticket ID : ${ticket.jiraKey}
  Summary   : ${ticket.summary}
  Category  : ${ticket.category}
  Priority  : ${ticket.priority}
  Jira URL  : ${ticket.jiraUrl}

Your original report:
"${ticket.description}"

You'll receive another email once the ticket is resolved.
  `.trim();

  return { html, text };
}

function templateTeamAlert({ ticket, reporterEmail }) {
  const badge = priorityBadge(ticket.priority);

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 24px; }
      .card { background: #fff; border-radius: 12px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
      .header { background: #7f1d1d; padding: 28px 32px; }
      .header h1 { color: #fff; margin: 0; font-size: 20px; font-weight: 700; }
      .header p  { color: #fca5a5; margin: 4px 0 0; font-size: 13px; }
      .body { padding: 28px 32px; }
      .badge { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; color: #fff; background: ${badge.color}; }
      .field-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; margin: 20px 0 4px; }
      .field-value { font-size: 14px; color: #111827; }
      .description-box { background: #fef2f2; border-left: 3px solid #dc2626; border-radius: 4px; padding: 12px 16px; font-size: 13px; color: #374151; margin-top: 4px; }
      .btn { display: inline-block; margin-top: 24px; padding: 10px 20px; background: #dc2626; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
      .info-row { display:flex; gap: 24px; margin-top: 16px; }
      .info-cell { flex: 1; }
      .footer { padding: 16px 32px; background: #f9fafb; font-size: 12px; color: #9ca3af; border-top: 1px solid #f0f0f0; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <h1>🚨 New Incident — Action Required</h1>
        <p>AgenX SRE — Auto-triaged by AI</p>
      </div>
      <div class="body">
        <p style="color:#374151; font-size:14px; margin-top:0">
          A new incident has been automatically triaged and assigned to your team. Please review and take action.
        </p>

        <div class="field-label">Ticket ID</div>
        <div class="field-value" style="font-family:monospace; font-size:15px; font-weight:700; color:#dc2626">${ticket.jiraKey}</div>

        <div class="field-label">Summary</div>
        <div class="field-value">${ticket.summary}</div>

        <div class="info-row">
          <div class="info-cell">
            <div class="field-label">Category</div>
            <div class="field-value" style="text-transform:capitalize">${ticket.category}</div>
          </div>
          <div class="info-cell">
            <div class="field-label">Priority</div>
            <div class="field-value"><span class="badge">${badge.label}</span></div>
          </div>
        </div>

        <div class="field-label">Reporter</div>
        <div class="field-value" style="color:#4f46e5">${reporterEmail}</div>

        <div class="field-label">Incident Report</div>
        <div class="description-box">${ticket.description}</div>

        <a class="btn" href="${ticket.jiraUrl}" target="_blank">Open in Jira →</a>
      </div>
      <div class="footer">
        Once resolved, mark the ticket as Done in Jira and the reporter will be notified automatically. &nbsp;|&nbsp; AgenX SRE Bot
      </div>
    </div>
  </body>
  </html>
  `;

  const text = `
NEW INCIDENT — Action Required

A new incident was auto-triaged and created.
  Ticket ID : ${ticket.jiraKey}
  Summary   : ${ticket.summary}
  Category  : ${ticket.category}
  Priority  : ${ticket.priority}
  Reporter  : ${reporterEmail}
  Jira URL  : ${ticket.jiraUrl}

Incident report:
"${ticket.description}"

Once resolved, mark as Done in Jira. The reporter will be notified.
  `.trim();

  return { html, text };
}

function templateUserResolution({ ticket, resolution }) {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 24px; }
      .card { background: #fff; border-radius: 12px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
      .header { background: #14532d; padding: 28px 32px; }
      .header h1 { color: #fff; margin: 0; font-size: 20px; font-weight: 700; }
      .header p  { color: #86efac; margin: 4px 0 0; font-size: 13px; }
      .body { padding: 28px 32px; }
      .field-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; margin: 20px 0 4px; }
      .field-value { font-size: 14px; color: #111827; }
      .resolution-box { background: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 4px; padding: 12px 16px; font-size: 13px; color: #374151; margin-top: 4px; }
      .btn { display: inline-block; margin-top: 24px; padding: 10px 20px; background: #16a34a; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
      .footer { padding: 16px 32px; background: #f9fafb; font-size: 12px; color: #9ca3af; border-top: 1px solid #f0f0f0; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <h1>✅ Ticket Resolved</h1>
        <p>AgenX SRE — Incident closed</p>
      </div>
      <div class="body">
        <p style="color:#374151; font-size:14px; margin-top:0">
          Great news! Your incident report has been reviewed and resolved by our SRE team.
        </p>

        <div class="field-label">Ticket ID</div>
        <div class="field-value" style="font-family:monospace; font-size:15px; font-weight:700; color:#16a34a">${ticket.jiraKey || ticket.id}</div>

        <div class="field-label">Summary</div>
        <div class="field-value">${ticket.summary}</div>

        <div class="field-label">Resolution Notes</div>
        <div class="resolution-box">${resolution || 'The issue has been investigated and resolved by the engineering team.'}</div>

        <a class="btn" href="${ticket.jiraUrl || ticket.url}" target="_blank">View Full Details →</a>
      </div>
      <div class="footer">
        If the issue persists, please submit a new incident report. &nbsp;|&nbsp; AgenX SRE Bot
      </div>
    </div>
  </body>
  </html>
  `;

  const text = `
Your Ticket Has Been Resolved — AgenX SRE

  Ticket ID : ${ticket.jiraKey || ticket.id}
  Summary   : ${ticket.summary}

Resolution:
"${resolution || 'The issue has been investigated and resolved by the engineering team.'}"

If the issue persists, please submit a new report.
  `.trim();

  return { html, text };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Notify the original reporter that their ticket was received.
 * @param {Object} ticket      - The ticket returned by createTicket()
 * @param {string} reporterEmail - Email address of the user who submitted the report
 */
export async function notifyReporterTicketCreated({ ticket, reporterEmail }) {
  const { html, text } = templateUserConfirmation({ ticket, reporterEmail });
  return sendEmail({
    to: reporterEmail,
    subject: `[${ticket.jiraKey}] Your incident report has been received`,
    html,
    text,
  });
}

/**
 * Notify the SRE/engineering team about a new incident.
 * TEAM_EMAIL in .env can be a single address or a comma-separated list.
 * @param {Object} ticket      - The ticket returned by createTicket()
 * @param {string} reporterEmail - Email address of the reporter (shown in the alert)
 */
export async function notifyTeamNewTicket({ ticket, reporterEmail }) {
  const teamEmail = process.env.TEAM_EMAIL;
  if (!teamEmail) {
    console.warn('⚠️  TEAM_EMAIL not set — skipping team notification');
    return null;
  }

  const { html, text } = templateTeamAlert({ ticket, reporterEmail });
  return sendEmail({
    to: teamEmail,
    subject: `🚨 [${ticket.jiraKey}] New ${ticket.priority?.toUpperCase()} incident — ${ticket.category}`,
    html,
    text,
  });
}

/**
 * Notify the original reporter that their ticket has been resolved.
 * @param {Object} ticket      - Ticket object (needs jiraKey/id, summary, jiraUrl/url)
 * @param {string} reporterEmail - Email address of the reporter
 * @param {string} resolution  - Optional resolution message from the engineer
 */
export async function notifyReporterResolved({ ticket, reporterEmail, resolution }) {
  const { html, text } = templateUserResolution({ ticket, resolution });
  return sendEmail({
    to: reporterEmail,
    subject: `✅ [${ticket.jiraKey || ticket.id}] Your incident has been resolved`,
    html,
    text,
  });
}
