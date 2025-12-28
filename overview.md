# Project Handover & Technical Overview
**Project:** Dostan Marketplace Backend & Frontend
**Date:** December 27, 2025
**Version:** 1.0.0 (Hybrid Migration Phase)

---

## 1. Executive Summary
This document serves as the technical handover for the **Dostan Marketplace**. The system is a monolithic e-commerce platform built with **Node.js/Express** and **PostgreSQL**. The frontend is a **Vanilla JavaScript** application served statically by the backend.

**Current State**: The project is in a **Hybrid Migration Phase**.
- **Legacy**: Original endpoints (V1) are written in JavaScript.
- **Modern**: New endpoints (V2 - Orders, checkout, products) are rewritten in **TypeScript** using a cleaner, domain-driven architecture with Zod validation.
- **Critical Status**: Key e-commerce integrations (Payment, Shipping) are currently **MOCKED**. They must be implemented with real providers before going live.

---

## 2. System Architecture

### High-Level Architecture
```mermaid
graph TD
    Client[Browser (Vanilla JS Frontend)] -->|REST API| LB[Load Balancer / Nginx]
    LB --> Server[Node.js Express Server]
    Server -->|ORM (Sequelize)| DB[(PostgreSQL)]
    Server -->|Cache/Session| Redis[(Redis)]
    Server -->|Async Store| Context[AsyncLocalStorage (Guest ID)]
    Server -->|File System| LocalStorage[./uploads Directory]
```

### Module Interaction
The application follows a Service-Oriented structure within a monolith:
1.  **Presentation Layer**:
    - **V1 (JS)**: Standard Express Controllers (`controllers/*.js`).
    - **V2 (TS)**: Validated Handlers (`application/routes/*.routes.ts`) using **Zod** schemas.
2.  **Business Logic**:
    - Services (`services/*.js|ts`) encapsulate logic.
    - Modules interact directly (e.g., `OrderService` calls `PaymentService`).
    - **Events**: An event bus (custom or simple function calls) handles side effects (e.g., `OrderPaid` triggers `NotificationService`).
3.  **Data Access**:
    - **Sequelize ORM** models (`models/*.js`) handle database interactions.
    - **Migrations**: Managed via `sequelize-cli`.

### Frontend Structure
- **Technology**: Pure Vanilla JavaScript (ES6+), no framework (React/Vue).
- **Location**: Root directory (`/index.html`, `/pages`, `/assets`).
- **Assets**: Served via `express.static` from the backend.
- **Admin/Vendor Panels**: Separate HTML/JS sets in `admincss/` and `vendorcss/`.

---

## 3. Third-Party Integrations & Services

**CRITICAL WARNING**: This system is NOT production-ready regarding external services. Most are stubs.

| Service Category | Implementation Details | Status | Risk Level | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **Payment Gateway** | `models/PaymentService.ts` | **MOCKED** | 🔴 Critical | Replace stub with Stripe/Iyzico integration. Currently returns `succeeded` for everything. |
| **Shipping Provider** | `models/ShippingService.js` | **MOCKED** | 🔴 Critical | Replace "MockExpress" with a real shipping API (UPS, FedEx, Yurtiçi). |
| **Email/SMS** | `models/NotificationService.ts` | **STUB** | 🟠 High | Currently logs to console. Integrate SendGrid, AWS SES, or Twilio. |
| **File Storage** | `uploads/` directory | **LOCAL** | 🟠 Medium | Images are stored on the server disk. Will break in a multi-server setup. Migrate to AWS S3. |
| **Database** | PostgreSQL | **ACTIVE** | 🟢 Low | Production-ready (Standard SQL). |
| **Cache** | Redis | **ACTIVE** | 🟢 Low | Used for rate limiting and potential caching. |

---

## 4. Security & Vulnerability Audit

### 🚨 Critical Issues
1.  **Fake Payment/Shipping Implementations**:
    - **Issue**: The `PaymentService` auto-approves all transactions.
    - **Fix**: Integrate a real payment provider SDK immediately.

2.  **Weak Content Security Policy (CSP)**:
    - **Issue**: `helmet` is configured with `'unsafe-inline'` for scripts and styles in `app.js`.
    - **Risk**: High vulnerability to XSS (Cross-Site Scripting).
    - **Fix**: Implement a `nonce` based CSP or move inline scripts to external files.

3.  **Local File Storage**:
    - **Issue**: User uploads go to the local file system.
    - **Risk**: Denial of Service (filling up disk), Malicious file upload execution (though `sharp` re-processing mitigates this partially), and inability to scale horizontally.
    - **Fix**: Implement an `S3Service` to offload storage.

4.  **CORS Configuration**:
    - **Issue**: `development` mode allows ALL origins.
    - **Risk**: Accidental exposure if deployed with `NODE_ENV=development`.
    - **Fix**: Enforce strict `ALLOWED_ORIGINS` in all environments.

### 🛡️ General Findings
-   **Hardcoded Secrets**: ✅ **PASSED**. No obvious hardcoded passwords/keys found in codebase (checked `.env.example` vs code).
-   **Rate Limiting**: ✅ **PASSED**. `express-rate-limit` is active.
-   **Input Validation**: ✅ **IMPROVING**. V1 uses `Joi` (or none), V2 uses `Zod` (Strict).
-   **Auth**: Uses JWT (Access + Refresh tokens). Ensure `JWT_SECRET` is strong (min 64 chars) in production.

---

## 5. Onboarding & Setup

### Prerequisites
-   **Node.js**: v18.0.0+
-   **PostgreSQL**: v14+
-   **Redis**: v6+
-   **Git**

### Installation Steps
1.  **Clone & Install**:
    ```bash
    git clone <repo>
    cd railvayk11/backend
    npm install
    ```

2.  **Environment Setup**:
    ```bash
    cp .env.example .env
    # Edit .env and set DB_HOST, DB_PASSWORD, REDIS_HOST etc.
    ```

3.  **Database Initialization**:
    ```bash
    # Create the database in Postgres first
    npm run migrate      # Run Sequelize migrations
    npm run seed         # Seed essential data (categories, admin user)
    # Optional: Mock data for development
    npm run seed:dev
    ```

4.  **Running the App**:
    ```bash
    # Development (legacy JS + TS)
    npm run dev:ts
    
    # The server starts at http://localhost:8080 (or PORT in .env)
    # Frontend is served at http://localhost:8080/
    ```

### Production Build
Since the backend is moving to TypeScript, a build step is required for the TS parts.
```bash
npm run typecheck       # Verify types
# Currently running via ts-node in dev. For prod, ensure TS is compiled or use ts-node-transpile-only.
```

---

## 6. Deployment & Infrastructure

### Infrastructure Requirements
-   **Compute**: VPS (DigitalOcean/AWS EC2) or PaaS (Railway/Heroku).
-   **Database**: Managed PostgreSQL instance.
-   **Cache**: Managed Redis instance.
-   **Storage**: AWS S3 Bucket (recommended improvement).

### Deployment Pipeline (Current - Manual)
There is **no** CI/CD pipeline currently. Deployment is manual:
1.  SSH into server.
2.  `git pull`.
3.  `npm install --production`.
4.  `npm run migrate`.
5.  Restart process (PM2 recommended: `pm2 start src/server.js`).

---

## 7. Next Steps & Roadmap

### 🔥 Priority 1: Must-Fix Before Launch
1.  **Implement Payments**: Write a real `StripePaymentGateway` or equivalent implementing the `PaymentGateway` interface in `payment.service.ts`.
2.  **Implement Shipping**: Connect to a shipping provider API in `shipping.service.js`.
3.  **Secure Headers**: Tighten CSP rules to block inline scripts.
4.  **Environment Audit**: Ensure production `.env` has strong, unique secrets.

### 📅 Short-Term Improvements (1-2 Months)
1.  **Complete TS Migration**: Finish migrating `shipping.service.js` and pure JS controllers to TypeScript.
2.  **CI/CD**: Set up GitHub Actions for:
    -   Linting & Typechecking.
    -   Automated Testing (`npm run test`).
    -   Deployment to staging.
3.  **Notifications**: Connect `NotificationService` to an email provider (e.g., SendGrid).

### 🔭 Long-Term Strategy
1.  **Frontend Framework**: The Vanilla JS frontend will become unmaintainable as complexity grows. Plan a migration to **Next.js** or **React**.
2.  **Search Engine**: Postgres `ILIKE` is sufficient for now, but integration with **Elasticsearch** or **Meilisearch** will be needed for advanced filtering/search.
