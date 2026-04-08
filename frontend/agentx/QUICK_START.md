# 🚀 Quick Start Guide

## Installation & Running

```bash
# 1. Navigate to frontend directory
cd frontend/agentx

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Then open your browser to `http://localhost:5173`

## Make Sure Backend is Running

The frontend expects the backend at `http://localhost:3000`

```bash
# From the project root, start the backend (example)
cd backend
# Start your backend server on port 3000
```

## What You Can Do

### 1. Upload a Ticket
- Go to the "Upload" tab
- Type your ticket description
- Click "Submit"
- See the backend response

### 2. View All Tickets
- Go to the "Tickets" tab
- See all submitted tickets
- Click "Refresh" to reload

### 3. View Dashboard Metrics
- Go to the "Dashboard" tab
- See statistics about your tickets
- Metrics auto-calculate from ticket data

## File Structure Created

```
src/
├── components/
│   └── Navigation.jsx        # Navigation between pages
├── pages/
│   ├── UploadPage.jsx       # Submit tickets form
│   ├── TicketsPage.jsx      # View all tickets
│   └── DashboardPage.jsx    # System metrics
├── services/
│   └── api.js               # Backend API calls
├── App.jsx                  # Main app with page routing
├── App.css                  # Component styles
├── index.css                # Global styles
└── main.jsx                 # Entry point
```

## Environment

- React 19.2.4
- Vite 8.0.4
- No external UI libraries
- Pure CSS styling
- Fetch API for HTTP requests

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Check code with ESLint |

## API Responses Expected

The frontend expects these endpoints:

**POST /ingest** - Submit a ticket
- Input: `{ text: "..." }`
- Output: `{ id, text, status, category, priority, ... }`

**GET /tickets** - Get all tickets
- Output: `[{ id, category, priority, status, ... }, ...]`

## Customization

### Change Backend URL
Edit `src/services/api.js` line 1:
```javascript
const API_BASE_URL = 'http://localhost:3000';
```

### Change Port
Edit `vite.config.js` to set a different port for the dev server.

### Colors & Styling
Edit `src/index.css` to customize the color scheme:
```css
:root {
  --accent: #aa3bff;  /* Change this color */
  --bg: #fff;         /* Change background */
  /* ... */
}
```

---

**That's it!** Your AgenX ticketing system frontend is ready to go! 🎉