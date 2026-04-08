import 'dotenv/config';
import express from 'express';
import { triageAndCreateTicket } from './modules/triage/triage.service.js';
import { getAllTickets, getTicketStats } from './modules/tickets/tickets.service.js';
import { notifyReporterResolved } from './modules/gmail/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

/**
 * POST /ingest
 * Body: { text: string, reporterEmail?: string }
 */
app.post('/ingest', async (req, res) => {
  try {
    const { text, reporterEmail } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Bad request', message: 'text field is required and must be a non-empty string' });
    }

    if (reporterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail)) {
      return res.status(400).json({ error: 'Bad request', message: 'reporterEmail must be a valid email address' });
    }

    const ticket = await triageAndCreateTicket(text, reporterEmail || null);

    res.status(201).json({ success: true, message: 'Ticket created successfully', emailSent: !!reporterEmail, ticket });
  } catch (error) {
    console.error('Error in /ingest:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /tickets
 */
app.get('/tickets', async (req, res) => {
  try {
    const tickets = await getAllTickets();
    res.json({ success: true, count: tickets.length, tickets });
  } catch (error) {
    console.error('Error in /tickets:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /tickets/stats
 */
app.get('/tickets/stats', async (req, res) => {
  try {
    const stats = await getTicketStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error in /tickets/stats:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * POST /tickets/:id/resolve
 * Body: { reporterEmail: string, resolution?: string }
 * Called by the engineering team when the issue is fixed.
 * Sends a resolution email to the original reporter.
 */
app.post('/tickets/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { reporterEmail, resolution } = req.body;

    if (!reporterEmail) {
      return res.status(400).json({ error: 'Bad request', message: 'reporterEmail is required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail)) {
      return res.status(400).json({ error: 'Bad request', message: 'reporterEmail must be a valid email address' });
    }

    const tickets = await getAllTickets();
    const ticket = tickets.find((t) => t.id === id || t.jiraId === id);

    if (!ticket) {
      return res.status(404).json({ error: 'Not found', message: `Ticket ${id} not found` });
    }

    await notifyReporterResolved({
      ticket,
      reporterEmail,
      resolution: resolution || 'The issue has been investigated and resolved by the SRE team.',
    });

    console.log(`✅ Resolution email sent for ticket ${id} to ${reporterEmail}`);
    res.json({ success: true, message: `Resolution notification sent to ${reporterEmail}`, ticketId: id });
  } catch (error) {
    console.error('Error in /tickets/:id/resolve:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', message: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📝 POST /ingest              — Submit incident (body: { text, reporterEmail? })`);
  console.log(`📋 GET  /tickets             — Get all tickets`);
  console.log(`📊 GET  /tickets/stats       — Get ticket statistics`);
  console.log(`✅ POST /tickets/:id/resolve — Notify reporter of resolution (body: { reporterEmail, resolution? })`);
  console.log(`❤️  GET  /health              — Health check`);
});
