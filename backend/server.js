import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import helmet from 'helmet';
import { triageAndCreateTicket } from './modules/triage/triage.service.js';
import { enrichIncident, extractEntities } from './modules/saleor/index.js';
import { getAllTickets, getTicketStats } from './modules/tickets/tickets.service.js';
import { initDb, getDbConnection } from './db/database.js';
import { assignTeam } from './modules/assignment/index.js';
import { generateDiagram } from './modules/diagram/index.js';
import { notifyReporterResolved } from './modules/gmail/index.js';
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

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file (stricter than before)
  },
  fileFilter: (req, file, cb) => {
    // Allowed MIME types
    const allowed = ['image/png', 'image/jpeg', 'text/plain'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Security Middleware ─────────────────────────────────────────────────
// Helmet: Set secure HTTP headers
app.use(helmet());

// Rate limiting: General limiter (100 requests per 15 minutes per IP)
app.use(generalLimiter);

// CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to AgenX Ticketing System API. Check /health for status.' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

/**
 * POST /ingest
 * Submit user input for triage and ticket creation
 * Rate limited: 30 requests per 15 minutes per reporter email or IP
 */
app.post(
  '/ingest',
  ingestLimiter, // Apply strict rate limiting
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'logs', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // ─── Validation ──────────────────────────────────────────────
      const validation = validateIngestRequest(req);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Validation failed',
          messages: validation.errors,
        });
      }

      // ─── Sanitization ────────────────────────────────────────────
      const sanitizedText = sanitizeInput(req.body.text);

      if (sanitizedText.length === 0) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Text appears to be malicious or empty after sanitization',
        });
      }

      // ─── Build ticket data ───────────────────────────────────────
      const ticketData = {
        text: sanitizedText,
        hasPhoto: !!req.files?.photo?.[0],
        hasLogs: !!req.files?.logs?.[0],
        photoMime: req.files?.photo?.[0]?.mimetype,
        logsMime: req.files?.logs?.[0]?.mimetype,
        photoSize: req.files?.photo?.[0]?.size,
        logsSize: req.files?.logs?.[0]?.size,
      };

      // ─── Create ticket ───────────────────────────────────────────
      const ticket = await triageAndCreateTicket(sanitizedText, ticketData);

      // ─── Success response ────────────────────────────────────────
      res.status(201).json({
        success: true,
        message: 'Ticket created successfully',
        emailSent: !!req.body?.reporterEmail,
        ticket,
      });
    } catch (error) {
      console.error('Error in /ingest:', error); // Log full error internally
      // Return generic error to client (don't expose internals)
      res.status(500).json({
        error: 'Failed to create ticket',
        message: 'An error occurred while processing your request. Please try again later.',
      });
    }
  }
);

/**
 * GET /tickets
 * Rate limited: 60 requests per 15 minutes per IP
 */
app.get('/tickets', moderateLimiter, async (req, res) => {
  try {
    const tickets = await getAllTickets();

    // Enrich with assigned teams from SQLite
    const db = await getDbConnection();
    const assignments = await db.all('SELECT incident_id, assigned_team FROM incident_assignments');

    const assignmentMap = assignments.reduce((acc, row) => {
      try {
        acc[row.incident_id] = JSON.parse(row.assigned_team);
      } catch {
        acc[row.incident_id] = row.assigned_team;
      }
      return acc;
    }, {});

    const enrichedTickets = tickets.map((ticket) => ({
      ...ticket,
      assignedTeam: assignmentMap[ticket.id] || null,
    }));

    res.json({
      success: true,
      count: enrichedTickets.length,
      tickets: enrichedTickets,
    });
  } catch (error) {
    console.error('Error in /tickets:', error); // Log full error internally
    res.status(500).json({
      error: 'Failed to fetch tickets',
      message: 'An error occurred while retrieving tickets. Please try again later.',
    });
  }
});

/**
 * GET /tickets/stats
 * Rate limited: 60 requests per 15 minutes per IP
 */
app.get('/tickets/stats', moderateLimiter, async (req, res) => {
  try {
    const stats = await getTicketStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error in /tickets/stats:', error); // Log full error internally
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: 'An error occurred while retrieving statistics. Please try again later.',
    });
  }
});

/**
 * POST /assign
 * Assign team to a ticket
 * Rate limited: 60 requests per 15 minutes per IP
 */
app.post('/assign', moderateLimiter, async (req, res) => {
  try {
    const { category, priority, summary, ticketId } = req.body;

    if (!category || !priority || !summary) {
      return res.status(400).json({
        error: 'Validation failed',
        messages: ['Fields category, priority, and summary are required'],
      });
    }

    const result = await assignTeam({ category, priority, summary });

    if (ticketId) {
      const db = await getDbConnection();
      await db.run(
        `INSERT INTO incident_assignments (incident_id, assigned_team) 
         VALUES (?, ?) 
         ON CONFLICT(incident_id) DO UPDATE SET assigned_team = excluded.assigned_team`,
        [ticketId, JSON.stringify(result.team)]
      );
    }

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error in /assign:', error); // Log full error internally
    res.status(500).json({
      error: 'Failed to assign team',
      message: 'An error occurred while assigning the team. Please try again later.',
    });
  }
});

/**
 * POST /diagram
 * Generate a system architecture diagram prompt from incident data
 * Rate limited: 60 requests per 15 minutes per IP
 */
app.post('/diagram', moderateLimiter, async (req, res) => {
  try {
    const { category, priority, summary, possible_cause } = req.body;

    if (!category || !priority || !summary || !possible_cause) {
      return res.status(400).json({
        error: 'Validation failed',
        messages: ['Fields category, priority, summary, and possible_cause are required'],
      });
    }

    const result = await generateDiagram({ category, priority, summary, possible_cause });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in /diagram:', error);
    res.status(500).json({
      error: 'Failed to generate diagram',
      message: 'An error occurred while generating the diagram. Please try again later.',
    });
  }
});

/**
 * POST /tickets/:id/resolve
 * Mark ticket as resolved and notify reporter
 * Rate limited: 60 requests per 15 minutes per IP
 */
app.post('/tickets/:id/resolve', moderateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { reporterEmail, resolution } = req.body;

    // Validate email
    const emailValidation = validateEmail(reporterEmail);
    if (!emailValidation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        messages: [emailValidation.error],
      });
    }

    const tickets = await getAllTickets();
    const ticket = tickets.find((t) => t.id === id || t.jiraId === id);

    if (!ticket) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Ticket not found',
      });
    }

    await notifyReporterResolved({
      ticket,
      reporterEmail,
      resolution:
        resolution ||
        'The issue has been investigated and resolved by the SRE team.',
    });

    console.log(`✅ Resolution email sent for ticket ${id} to ${reporterEmail}`);

    res.json({
      success: true,
      message: 'Resolution notification sent',
      ticketId: id,
    });
  } catch (error) {
    console.error('Error in /tickets/:id/resolve:', error); // Log full error internally
    res.status(500).json({
      error: 'Failed to resolve ticket',
      message: 'An error occurred while resolving the ticket. Please try again later.',
    });
  }
});

/**
 * POST /saleor/enrich
 * On-demand Saleor enrichment for an incident text + triage result.
 * Useful for manual investigation or re-enrichment of existing tickets.
 * Rate limited: 60 requests per 15 minutes per IP
 */
app.post('/saleor/enrich', moderateLimiter, async (req, res) => {
  try {
    const { text, category, priority, summary } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation failed',
        messages: ['Field "text" is required and must be a non-empty string'],
      });
    }

    const sanitizedText = sanitizeInput(text);

    // Accept a pre-computed triage result or fall back to defaults
    const triageResult = {
      category: category || 'other',
      priority: priority || 'medium',
      summary: summary || sanitizedText.substring(0, 100),
    };

    const entities = extractEntities(sanitizedText);
    const enrichment = await enrichIncident(sanitizedText, triageResult);

    res.json({ success: true, entities, ...enrichment });
  } catch (error) {
    console.error('Error in /saleor/enrich:', error);
    res.status(500).json({
      error: 'Enrichment failed',
      message: 'An error occurred while enriching the incident with Saleor data.',
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err); // Log full error internally

  // Handle multer file upload errors
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: 'File upload failed',
      message: 'The uploaded file is invalid or too large',
    });
  }

  // Handle rate limit errors (shouldn't reach here due to middleware)
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
    });
  }

  // Generic error response (don't expose internals)
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred. Please try again later.',
  });
});

// Init DB and start server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`POST /ingest - Submit a ticket for triage`);
      console.log(`GET /tickets - Get all tickets`);
      console.log(`GET /tickets/stats - Get ticket statistics`);
      console.log(`POST /assign - Assign team`);
      console.log(`POST /tickets/:id/resolve - Send resolution email`);
      console.log(`POST /diagram - Generate system diagram prompt`);
      console.log(`GET /health - Health check`);
      console.log(`POST /saleor/enrich - Enrich incident with Saleor e-commerce data`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });