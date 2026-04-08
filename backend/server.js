import 'dotenv/config';
import express from 'express';
import { triageAndCreateTicket } from './modules/triage/triage.service.js';
import { getAllTickets, getTicketStats } from './modules/tickets/tickets.service.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

/**
 * POST /ingest
 * Submit user input for triage and ticket creation
 */
app.post('/ingest', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Text field is required and must be a non-empty string',
      });
    }

    // Triage and create ticket
    const ticket = await triageAndCreateTicket(text);

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      ticket,
    });
  } catch (error) {
    console.error('Error in /ingest:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /tickets
 * Get all tickets
 */
app.get('/tickets', async (req, res) => {
  try {
    const tickets = await getAllTickets();
    res.json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    console.error('Error in /tickets:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /tickets/stats
 * Get ticket statistics
 */
app.get('/tickets/stats', async (req, res) => {
  try {
    const stats = await getTicketStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error in /tickets/stats:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📝 POST /ingest - Submit a ticket for triage`);
  console.log(`📋 GET /tickets - Get all tickets`);
  console.log(`📊 GET /tickets/stats - Get ticket statistics`);
  console.log(`🔄 PUT /tickets/:id/status - Update ticket status`);
  console.log(`✅ GET /health - Health check`);
});
