import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import helmet from 'helmet';
import { triageAndCreateTicket } from './modules/triage/triage.service.js';
import { getAllTickets, getTicketStats } from './modules/tickets/tickets.service.js';
import { initDb, getDbConnection } from './db/database.js';
import { assignTeam } from './modules/assignment/index.js';
import { generateDiagram } from './modules/diagram/index.js';
import { notifyReporterResolved } from './modules/gmail/index.js';
import { enrichIncident } from './modules/saleor/saleor.enrichment.js';
import { extractSaleorContext, formatContextForAI } from './modules/triage/saleor-context-extractor.js';
import {
  getTicketLogs,
  analyzeAndResolve,
  updateTicketResolution,
  getAllResolutions,
} from './modules/observability/index.js';
import {
  requireAuth,
  requireAdmin,
  register,
  login,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from './modules/auth/index.js';
import {
  sanitizeInput,
  validateIngestRequest,
  validateEmail,
  ingestLimiter,
  generalLimiter,
  moderateLimiter,
} from './modules/security/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'text/plain'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type ${file.mimetype} not allowed`));
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(generalLimiter);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ─── Public routes ────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to AgenX Ticketing System API.' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

/**
 * POST /auth/register
 * Body: { name, email, password }
 */
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Validation failed', message: 'name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Validation failed', message: 'Password must be at least 6 characters' });
    }

    const result = await register({ name, email, password });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /auth/login
 * Body: { email, password }
 */
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Validation failed', message: 'email and password are required' });
    }
    const result = await login({ email, password });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ─── Protected routes (require valid JWT) ─────────────────────────────────────

/**
 * POST /ingest
 */
app.post(
  '/ingest',
  requireAuth,
  ingestLimiter,
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'logs', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const validation = validateIngestRequest(req);
      if (!validation.valid) {
        return res.status(400).json({ error: 'Validation failed', messages: validation.errors });
      }

      const sanitizedText = sanitizeInput(req.body.text);
      if (sanitizedText.length === 0) {
        return res.status(400).json({ error: 'Bad request', message: 'Text appears empty after sanitization' });
      }

      const ticketData = {
        text: sanitizedText,
        hasPhoto: !!req.files?.photo?.[0],
        hasLogs: !!req.files?.logs?.[0],
        photoMime: req.files?.photo?.[0]?.mimetype,
        logsMime: req.files?.logs?.[0]?.mimetype,
        photoSize: req.files?.photo?.[0]?.size,
        logsSize: req.files?.logs?.[0]?.size,
        // Use authenticated user's email as reporterEmail
        reporterEmail: req.user.email,
        reporterName: req.user.name,
      };

      const ticket = await triageAndCreateTicket(sanitizedText, ticketData);

      // Persist uploaded logs file so the observability module can use real logs
      if (req.files?.logs?.[0]) {
        try {
          const logsContent = req.files.logs[0].buffer.toString('utf-8');
          const db = await getDbConnection();
          await db.run(
            'INSERT OR REPLACE INTO ticket_logs (ticket_id, logs) VALUES (?, ?)',
            [ticket.jiraKey, logsContent]
          );
          console.log(`📄 Logs saved for ticket ${ticket.jiraKey} (${logsContent.length} chars)`);
        } catch (logErr) {
          console.warn('⚠️  Failed to save logs file:', logErr.message);
        }
      }

      res.status(201).json({
        success: true,
        message: 'Ticket created successfully',
        emailSent: true,
        ticket,
      });
    } catch (error) {
      console.error('Error in /ingest:', error);
      res.status(500).json({ error: 'Failed to create ticket', message: 'Please try again later.' });
    }
  }
);

/**
 * GET /tickets
 */
app.get('/tickets', requireAuth, moderateLimiter, async (req, res) => {
  try {
    const tickets = await getAllTickets();
    const db = await getDbConnection();
    const assignments = await db.all('SELECT incident_id, assigned_team FROM incident_assignments');

    const assignmentMap = assignments.reduce((acc, row) => {
      try { acc[row.incident_id] = JSON.parse(row.assigned_team); }
      catch { acc[row.incident_id] = row.assigned_team; }
      return acc;
    }, {});

    const resolutions = await getAllResolutions();
    const resolutionMap = resolutions.reduce((acc, row) => {
      acc[row.ticket_id] = row.resolved === 1 ? 'RESOLVED' : 'UNRESOLVED';
      return acc;
    }, {});

    const enrichedTickets = tickets.map((ticket) => ({
      ...ticket,
      assignedTeam: assignmentMap[ticket.id] || null,
      resolutionStatus: resolutionMap[ticket.id] || null,
    }));

    res.json({ success: true, count: enrichedTickets.length, tickets: enrichedTickets });
  } catch (error) {
    console.error('Error in /tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets', message: 'Please try again later.' });
  }
});

/**
 * GET /tickets/stats
 */
app.get('/tickets/stats', requireAuth, moderateLimiter, async (req, res) => {
  try {
    const stats = await getTicketStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error in /tickets/stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics', message: 'Please try again later.' });
  }
});

/**
 * POST /assign
 */
app.post('/assign', requireAuth, moderateLimiter, async (req, res) => {
  try {
    const { category, priority, summary, ticketId } = req.body;
    if (!category || !priority || !summary) {
      return res.status(400).json({ error: 'Validation failed', messages: ['Fields category, priority, and summary are required'] });
    }

    const result = await assignTeam({ category, priority, summary });

    if (ticketId) {
      const db = await getDbConnection();
      await db.run(
        `INSERT INTO incident_assignments (incident_id, assigned_team) VALUES (?, ?) ON CONFLICT(incident_id) DO UPDATE SET assigned_team = excluded.assigned_team`,
        [ticketId, JSON.stringify(result.team)]
      );
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in /assign:', error);
    res.status(500).json({ error: 'Failed to assign team', message: 'Please try again later.' });
  }
});

/**
 * POST /diagram
 */
app.post('/diagram', requireAuth, moderateLimiter, async (req, res) => {
  try {
    const { category, priority, summary, possible_cause } = req.body;
    if (!category || !priority || !summary || !possible_cause) {
      return res.status(400).json({ error: 'Validation failed', messages: ['Fields category, priority, summary, and possible_cause are required'] });
    }

    // Extract Saleor context from incident data
    const incidentText = `${category} - ${summary} - ${possible_cause}`;
    const saleorContext = await extractSaleorContext(incidentText);

    const result = await generateDiagram({ category, priority, summary, possible_cause }, saleorContext);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in /diagram:', error);
    res.status(500).json({ error: 'Failed to generate diagram', message: 'Please try again later.' });
  }
});

/**
 * GET /tickets/:id/logs
 * Returns system logs associated with a ticket (generates sample logs if none exist).
 */
app.get('/tickets/:id/logs', requireAuth, moderateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const tickets = await getAllTickets();
    const ticket = tickets.find((t) => t.id === id || t.jiraId === id);
    if (!ticket) return res.status(404).json({ error: 'Not found', message: 'Ticket not found' });

    const logs = await getTicketLogs(id, { category: ticket.category });
    res.json({ ticket_id: id, logs });
  } catch (error) {
    console.error('Error in GET /tickets/:id/logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs', message: 'Please try again later.' });
  }
});

/**
 * GET /tickets/:id
 * Returns full ticket data for timeline display
 */
app.get('/tickets/:id', requireAuth, moderateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const tickets = await getAllTickets();
    const ticket = tickets.find((t) => t.id === id || t.jiraId === id);
    if (!ticket) return res.status(404).json({ error: 'Not found', message: 'Ticket not found' });

    // Extract Saleor context dynamically if needed (for timeline display)
    let saleorCodeContext = null;
    try {
      saleorCodeContext = await extractSaleorContext(ticket.text || ticket.summary || '');
    } catch (err) {
      console.warn('⚠️  Failed to extract Saleor context on fetch:', err.message);
    }

    // Enrich with resolution status
    const db = await getDbConnection();
    const resolution = await db.get('SELECT * FROM resolutions WHERE ticket_id = ?', [id]);
    
    // Flatten resolution data into ticket object (for timeline component)
    const enrichedTicket = {
      ...ticket,
      saleorCodeContext,  // Add Saleor context for timeline display
      // Flatten resolution fields
      root_cause: resolution?.root_cause || null,
      affected_component: resolution?.affected_component || null,
      solution: resolution?.solution || null,
      action: resolution?.action || null,
      auto_fix: resolution?.auto_fix === 1,
      validation_resolved: resolution?.resolved === 1,
      // Timeline timestamps
      triage_started_at: ticket.created_at,
      triage_completed_at: resolution?.created_at || null,
      analysis_started_at: resolution?.created_at || null,
      solution_timestamp: resolution?.created_at || null,
      fixed_at: resolution?.resolved === 1 ? new Date().toISOString() : null,
      resolved_at: resolution?.resolved === 1 ? new Date().toISOString() : null,
    };

    res.json({ success: true, ticket: enrichedTicket });
  } catch (error) {
    console.error('Error in GET /tickets/:id:', error);
    res.status(500).json({ error: 'Failed to fetch ticket', message: 'Please try again later.' });
  }
});

/**
 * POST /tickets/:id/resolve
 * AI-powered observability pipeline: analyze logs → propose fix → execute action → validate.
 */
app.post('/tickets/:id/resolve', requireAuth, moderateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const tickets = await getAllTickets();
    const ticket = tickets.find((t) => t.id === id || t.jiraId === id);
    if (!ticket) return res.status(404).json({ error: 'Not found', message: 'Ticket not found' });

    // Pass Saleor context if available from ticket
    const saleorContext = ticket.saleorCodeContext || null;
    const result = await analyzeAndResolve(id, ticket, saleorContext);

    // Non-blocking email notification if auto-resolved and reporterEmail provided
    const { reporterEmail } = req.body;
    if (reporterEmail && result.validation.resolved) {
      const emailValidation = validateEmail(reporterEmail);
      if (emailValidation.valid) {
        notifyReporterResolved({
          ticket,
          reporterEmail,
          resolution: result.solution,
        }).catch((err) => console.warn('⚠️  Resolution email failed:', err.message));
      }
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in POST /tickets/:id/resolve:', error);
    res.status(500).json({ error: 'Failed to resolve ticket', message: 'Please try again later.' });
  }
});

/**
 * PATCH /tickets/:id/status
 * User confirms whether the ticket was resolved or not.
 * Body: { resolved: true | false }
 */
app.patch('/tickets/:id/status', requireAuth, moderateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolved } = req.body;
    if (typeof resolved !== 'boolean') {
      return res.status(400).json({ error: 'Validation failed', message: '"resolved" must be a boolean' });
    }
    const result = await updateTicketResolution(id, resolved);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in PATCH /tickets/:id/status:', error);
    res.status(500).json({ error: 'Failed to update status', message: 'Please try again later.' });
  }
});

// ─── Admin-only routes ────────────────────────────────────────────────────────

/**
 * GET /admin/users — list all accounts
 */
app.get('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/users — create a new user account
 * Body: { name, email, password }
 */
app.post('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    const result = await createUser({ name, email, password });
    res.status(201).json({ success: true, user: result.user });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * PATCH /admin/users/:id — update name/email of a user
 * Body: { name?, email? }
 */
app.patch('/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await updateUser(Number(req.params.id), { name, email });
    res.json({ success: true, user });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * DELETE /admin/users/:id — remove a user account
 */
app.delete('/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await deleteUser(Number(req.params.id));
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ─── Admin: Engineers ─────────────────────────────────────────────────────────

/**
 * GET /admin/engineers — list all engineers with their skills
 */
app.get('/admin/engineers', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = await getDbConnection();
    const engineers = await db.all(`
      SELECT
        u.id, u.name, u.email, u.role, u.experience_years,
        GROUP_CONCAT(s.name || ':' || us.level, '|') AS skills_raw
      FROM users u
      LEFT JOIN user_skills us ON us.user_id = u.id
      LEFT JOIN skills s ON s.id = us.skill_id
      GROUP BY u.id
      ORDER BY u.id ASC
    `);

    const skills = await db.all('SELECT * FROM skills ORDER BY name ASC');

    const result = engineers.map(e => ({
      id: e.id,
      name: e.name,
      email: e.email,
      role: e.role,
      experience_years: e.experience_years,
      skills: e.skills_raw
        ? e.skills_raw.split('|').map(s => {
            const [name, level] = s.split(':');
            return { name, level: Number(level) };
          })
        : [],
    }));

    res.json({ success: true, engineers: result, availableSkills: skills });
  } catch (err) {
    console.error('Error in GET /admin/engineers:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/engineers — create a new engineer
 */
app.post('/admin/engineers', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, role, experience_years } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'name, email and role are required' });
    }
    const db = await getDbConnection();
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const result = await db.run(
      'INSERT INTO users (name, email, role, experience_years) VALUES (?, ?, ?, ?)',
      [name, email, role, Number(experience_years) || 0]
    );
    const engineer = await db.get('SELECT * FROM users WHERE id = ?', [result.lastID]);
    res.status(201).json({ success: true, engineer });
  } catch (err) {
    console.error('Error in POST /admin/engineers:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /admin/engineers/:id — update engineer fields
 */
app.patch('/admin/engineers/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, role, experience_years } = req.body;
    const db = await getDbConnection();
    const existing = await db.get('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Engineer not found' });

    await db.run(
      `UPDATE users SET
        name             = COALESCE(?, name),
        email            = COALESCE(?, email),
        role             = COALESCE(?, role),
        experience_years = COALESCE(?, experience_years)
       WHERE id = ?`,
      [name ?? null, email ?? null, role ?? null, experience_years ?? null, req.params.id]
    );
    const engineer = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, engineer });
  } catch (err) {
    console.error('Error in PATCH /admin/engineers/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /admin/engineers/:id — remove an engineer
 */
app.delete('/admin/engineers/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = await getDbConnection();
    const existing = await db.get('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Engineer not found' });
    await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Engineer deleted' });
  } catch (err) {
    console.error('Error in DELETE /admin/engineers/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /saleor/auto-contextualize — automatically extract and contextualize with Saleor data
 * This is the main endpoint for automatic ticket contextualization
 */
app.post('/saleor/auto-contextualize', requireAuth, async (req, res) => {
  try {
    const { incidentText } = req.body;
    if (!incidentText) return res.status(400).json({ error: 'incidentText is required' });
    
    const { automaticContextualize, extractEntities } = await import('./modules/saleor/saleor.contextualizer.js');
    const entities = extractEntities(incidentText);
    const result = await automaticContextualize(incidentText, entities);
    
    res.json({
      success: true,
      context: result,
      message: 'Ticket automatically contextualized with Saleor data',
    });
  } catch (err) {
    console.error('Error in POST /saleor/auto-contextualize:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /saleor/enrich — (deprecated) use /saleor/auto-contextualize instead
 */
app.post('/saleor/enrich', requireAuth, async (req, res) => {
  try {
    const { incidentText, category, priority, summary } = req.body;
    if (!incidentText) return res.status(400).json({ error: 'incidentText is required' });
    const { enrichIncident } = await import('./modules/saleor/saleor.enrichment.js');
    const triageResult = { category, priority, summary };
    const result = await enrichIncident(incidentText, triageResult);
    res.json(result);
  } catch (err) {
    console.error('Error in POST /saleor/enrich:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Error handlers ───────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', message: 'The requested resource was not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'File upload failed', message: 'The uploaded file is invalid or too large' });
  }
  res.status(500).json({ error: 'Internal server error', message: 'An unexpected error occurred.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`🔐 POST /auth/register        — Register new user`);
      console.log(`🔐 POST /auth/login           — Login`);
      console.log(`📝 POST /ingest               — Submit ticket (auth required)`);
      console.log(`📋 GET  /tickets              — Get all tickets (auth required)`);
      console.log(`📊 GET  /tickets/stats        — Ticket statistics (auth required)`);
      console.log(`🤖 POST /assign               — Assign team (auth required)`);
      console.log(`✅ POST /tickets/:id/resolve  — Resolve ticket (auth required)`);
      console.log(`📊 POST /diagram              — Generate diagram (auth required)`);
      console.log(`👑 GET  /admin/users          — List users (admin only)`);
      console.log(`👑 POST /admin/users          — Create user (admin only)`);
      console.log(`👑 PATCH /admin/users/:id     — Update user (admin only)`);
      console.log(`👑 DELETE /admin/users/:id    — Delete user (admin only)`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });