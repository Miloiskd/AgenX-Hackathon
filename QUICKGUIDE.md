# Quick Start Guide (QUICKGUIDE.md)

Welcome to the AgenX Hackathon project. Follow these step-by-step instructions to get the application running locally.

## Prerequisites
* Docker & Docker Compose
* Node.js (v18 or higher)
* NPM or Yarn
* Python (if running Saleor locally outside of Docker)

## Option 1: Running the Entire Stack via Docker (Recommended)
The easiest way to start the system is using the provided Docker Compose file.

1. Navigate to the root directory:
   ```bash
   cd AgenX-Hackathon
   ```

2. Make sure your `.env` variables are correctly configured in `backend/.env` and `frontend/agentx/.env`.

3. Build and start the containers:
   ```bash
   docker-compose up --build
   ```

4. The services will be available at:
   * **Frontend:** `http://localhost:5173` (or port specified in compose)
   * **Backend:** `http://localhost:3000` (or port specified in compose)
   * **Saleor GraphQL:** `http://localhost:8000/graphql/`

## Option 2: Running Services Manually

### Setting up the Backend
1. Open a new terminal and navigate to the backend folder:
   ```bash
   cd AgenX-Hackathon/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   # or
   node server.js
   ```

### Setting up the Frontend
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd AgenX-Hackathon/frontend/agentx
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the interface:
   ```bash
   npm run dev
   ```

## Testing the Application
1. **Access the UI:** Open a browser and go to the frontend URL (`http://localhost:5173`).
2. **Submit a test request:** Use the chat interface or ticket submission form to test the Triage Agent.
3. **Verify Agent Execution:** Watch the backend terminal logs to see the Observability Agent trace the decision-making process of assigning or classifying the request.
4. **Saleor Integration:** Submit a request related to a product or order to test the Saleor Enrichment Contextualizer.

## Troubleshooting
* **Database Errors:** Ensure your local database instances are running and properly seeded.
* **LLM API Errors:** Verify that your API keys inside `backend/.env` are valid and have not exceeded their quota.
