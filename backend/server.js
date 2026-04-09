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

    const enrichedTickets = tickets.map((ticket) => ({
      ...ticket,
      assignedTeam: assignmentMap[ticket.id] || null,
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
    const result = await generateDiagram({ category, priority, summary, possible_cause });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in /diagram:', error);
    res.status(500).json({ error: 'Failed to generate diagram', message: 'Please try again later.' });
  }
});

/**
 * POST /tickets/:id/resolve
 */
app.post('/tickets/:id/resolve', requireAuth, moderateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { reporterEmail, resolution } = req.body;

    const emailValidation = validateEmail(reporterEmail);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: 'Validation failed', messages: [emailValidation.error] });
    }

    const tickets = await getAllTickets();
    const ticket = tickets.find((t) => t.id === id || t.jiraId === id);
    if (!ticket) return res.status(404).json({ error: 'Not found', message: 'Ticket not found' });

    await notifyReporterResolved({
      ticket,
      reporterEmail,
      resolution: resolution || 'The issue has been investigated and resolved by the SRE team.',
    });

    res.json({ success: true, message: 'Resolution notification sent', ticketId: id });
  } catch (error) {
    console.error('Error in /tickets/:id/resolve:', error);
    res.status(500).json({ error: 'Failed to resolve ticket', message: 'Please try again later.' });
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
 * POST /saleor/enrich — enrich a ticket with Saleor data
 */
app.post('/saleor/enrich', requireAuth, async (req, res) => {
  try {
    const { incidentText, category, priority, summary } = req.body;
    if (!incidentText) return res.status(400).json({ error: 'incidentText is required' });
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