# Scaling the Application (SCALING.md)

## Overview
The AgenX platform is designed with a microservices-inspired architecture, separating the front-end interface, the agent/orchestration backend, and the core commerce layer (Saleor).

## Technical Decisions & Assumptions

### 1. Containerization
**Decision:** Using Docker and Docker Compose (`docker-compose.yml`) for deployment.
**Reasoning:** Ensures parity between development, testing, and production environments. It allows each service (Frontend, Backend, Saleor) to be scaled independently in a Kubernetes or ECS environment.

### 2. Stateless Backend
**Decision:** The Node.js Express backend (`server.js`) is stateless.
**Reasoning:** Agent sessions and ticketing states are stored in the database or passed via the client. This allows horizontal scaling of the backend application behind a traditional load balancer without worrying about sticky sessions.

### 3. Asynchronous Task Processing
**Decision:** Leveraging decoupled services for heavy agent processing.
**Reasoning:** LLM calls can be synchronous and slow (taking several seconds). By offloading heavy tasks (like generating diagrams or running deep Saleor enrichment queries) from the main request thread, the application remains responsive. (Future iteration includes Redis/Celery queueing, as seen in the Saleor core).

### 4. Database Connection Pooling
**Decision:** Centralized database connection management (`db/database.js`).
**Reasoning:** Prevents connection exhaustion when the platform scales horizontally, managing the overhead caused by frequent small queries across multiple backend instances.

### 5. Security & Load Management
**Decision:** Implementing rate limiting (`security/rateLimiter.js`).
**Reasoning:** Protects the backend from traffic spikes, DDoS attacks, and abusive agent prompting which could rapidly drain LLM API credits.

## Future Scaling Considerations
* **Caching:** Introducing Redis to cache frequent Saleor database queries (e.g., product catalogs) and repeated identical agent prompts.
* **Vector Database:** For massive historic ticket retrieval, implementing a dedicated vector database (like Pinecone or Milvus) rather than relying on standard DB text searches.
