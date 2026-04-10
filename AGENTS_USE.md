# Agent Usage Documentation (AGENTS_USE.md)

## Overview
This document outlines the specialized agents implemented in the AgenX platform. Our architecture leverages discrete, purpose-built agents to handle intelligent routing, natural language interactions, and specific domain workflows.

## Agents and Use Cases

### 1. Triage Agent (`triage.chain.js`, `triage.service.js`)
* **Use Case:** Analyzes incoming user requests/tickets and routes them to the appropriate specialized agent or processing flow.
* **Implementation Details:** Uses an LLM to classify intentions. Extracts context recursively (e.g., Saleor context extraction) to enrich the request before routing.

### 2. Assignment Agent (`assignment.agent.js`)
* **Use Case:** Automatically assigns tickets or tasks to the best-suited human operator or system queue based on workload and expertise.
* **Implementation Details:** Evaluates ticket severity and context against the available pool of operators.

### 3. Diagram Agent (`diagram.agent.js`)
* **Use Case:** Generates architectural or workflow diagrams based on natural language descriptions or system state.
* **Implementation Details:** Translates conceptual data into structured diagram formats (e.g., Mermaid.js) for rendering on the front end.

### 4. Observability Agent (`observability.agent.js`)
* **Use Case:** Monitors system state, analyzes logs, and detects anomalous patterns proactively.
* **Implementation Details:** Interfaces with the system's observability hooks. Synthesizes metrics into readable diagnostic reports and automated alerts.

### 5. Saleor Enrichment Agent (`saleor.enrichment.js`)
* **Use Case:** Contextualizes commerce-related tickets by fetching underlying order, product, or customer data from the Saleor GraphQL API.

## Observability Evidence
* Every agent execution is wrapped in tracing spans via the observability module.
* Logs capture the input prompts, token usage, latency, and tool-call selections.
* Dashboard metrics can display agent success rates versus fallback to human operators.

## Safety Measures
Safety is paramount in agent execution to prevent prompt injection and resource exhaustion:
1. **Input Sanitization:** All incoming requests are processed through `sanitizeInput.js` before reaching the LLMs.
2. **Schema Validation:** Agent responses and requests are validated using `validateRequest.js` to ensure they conform to expected outputs.
3. **Rate Limiting:** Network-level and agent-level rate limiting (`rateLimiter.js`) prevents abuse and API quota exhaustion.
4. **Least Privilege:** Agents are granted only the necessary tool subsets. For instance, the Triage agent cannot execute database mutations.
