---
version: 1.0.0
stage: Planning
title: GlovaCRM Implementation Plan
author: Senior Architect
date: 2026-08-08
---

# GlovaCRM Implementation Plan

## Executive Summary
This document outlines the comprehensive, phased implementation plan for **GlovaCRM**, a multi-tenant SaaS CRM tailored for the Indian market. The project relies on a modular monolith backend architecture using Node.js, Express, TypeScript, and Prisma with PostgreSQL, accompanied by a Next.js frontend. The plan spans 12 weeks, structured into 6 logical phases designed to incrementally deliver value, minimize integration risk, and establish a robust foundation for multi-tenancy and data isolation.

## 0. IN/OUT Scope

### IN Scope
- **Architecture**: Shared DB, shared schema multi-tenancy with `tenant_id` discrimination (RLS at application layer via Prisma middleware/extensions).
- **Core Entities**: Tenants, Users, Leads, Activities, Calls, Messages, Integrations, Webhooks, Campaigns, Roles, Permissions.
- **Integrations**: Meta Graph API, Google Ads API, WhatsApp Business Cloud API, Telephony (Twilio/Exotel), IndiaMART, JustDial, 99acres, MagicBricks, Sulekha.
- **Background Processing**: Redis + BullMQ for webhook ingestion, deduplication, scoring, and routing.
- **Frontend**: Next.js App Router, TailwindCSS, specialized Kanban and Analytics views.

### OUT Scope
- **Billing & Subscription Management**: Deferred to post-launch (Phase 7+). Tenants are provisioned manually by Super Admin for Phase 1-6.
- **Database-per-tenant Architecture**: Rejected due to operational complexity.
- **Custom App Development**: Mobile apps are OUT. Responsive PWA is IN.
- **Custom Machine Learning**: Native LLM-based sentiment analysis is OUT. Hardcoded heuristic scoring is IN.

## Engineering Decision Rationale
1.  **Modular Monolith**: We are opting for a modular monolith over microservices. A single Express server with distinct domain directories reduces deployment complexity while maintaining clear boundaries.
2.  **Prisma over Raw SQL/Knex**: Prisma provides type-safety and rapid schema iteration. We will implement tenant isolation via Prisma Client Extensions to ensure `tenant_id` is automatically appended to queries and mutations.
3.  **BullMQ for Webhooks**: Indian marketplace webhooks (JustDial, IndiaMart) can spike unexpectedly. A robust queuing mechanism with idempotency checks is strictly required to prevent lead duplication and API limits.

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Overview
The objective of Phase 1 is to establish the development environment, CI/CD pipeline, database schema for core entities, and robust tenant isolation mechanisms. This sets the stage for all future domain logic.

### 1.2 Tasks & Estimated Effort

| Task ID | Description | Complexity | Effort (Days) | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **1.2.1** | Initialize Monorepo (Turborepo or PNPM Workspaces) with `frontend/` (Next.js) and `backend/` (Express + TS) | Low | 1 | None |
| **1.2.2** | Setup Docker Compose (PostgreSQL, Redis) | Low | 0.5 | 1.2.1 |
| **1.2.3** | Define Prisma schema (Tenants, Users, Sessions, Audit Logs) | Medium | 1.5 | 1.2.2 |
| **1.2.4** | Implement Prisma Client Extensions for Tenant Isolation | High | 2 | 1.2.3 |
| **1.2.5** | Core Auth Module: Register, Login, JWT + Refresh tokens | High | 3 | 1.2.4 |
| **1.2.6** | RBAC Middleware (Super Admin, Tenant Admin, User) | Medium | 2 | 1.2.5 |
| **1.2.7** | Super Admin Panel APIs: Tenant CRUD | Low | 1 | 1.2.6 |
| **1.2.8** | Frontend scaffolding: Auth pages, Base Layouts, State Management | Medium | 2 | 1.2.1 |
| **1.2.9** | CI/CD Pipeline (GitHub Actions) for Lint, Test, Build | Low | 1 | 1.2.1 |

### 1.3 Deliverables
- Fully functional monorepo structure.
- Local development environment achievable via `docker-compose up` and `pnpm dev`.
- Migrated database with foundational tables.
- Working authentication system with secure cookies/JWT.
- Boilerplate frontend connected to backend auth.

### 1.4 Definition of Done (DoD)
- Code passes all linting rules and TypeScript checks.
- Unit tests for Auth service and Prisma Tenant extension pass (Coverage > 80%).
- Developer can log in as a Super Admin and create a new Tenant via API.
- CI pipeline successfully builds both apps.

---

## Phase 2: Core Lead Management (Week 3-4)

### 2.1 Overview
Build the central business logic: handling Leads. This phase covers manual data entry, bulk operations, and the UI required to track the sales pipeline.

### 2.2 Tasks & Estimated Effort

| Task ID | Description | Complexity | Effort (Days) | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **2.2.1** | Define Prisma schema for Leads, Tags, Custom Fields, Statuses | Medium | 1 | Phase 1 |
| **2.2.2** | Implement Lead CRUD APIs (with robust validation) | Medium | 2 | 2.2.1 |
| **2.2.3** | Custom Fields Engine (EAV pattern or JSONB column indexing) | High | 3 | 2.2.1 |
| **2.2.4** | API: Lead list with keyset pagination, filtering, full-text search | High | 2 | 2.2.2 |
| **2.2.5** | Frontend: Lead list view (Data Table) & Search | Medium | 2 | 2.2.4 |
| **2.2.6** | Frontend: Lead Status Management (Kanban Board UI) | High | 3 | 2.2.5 |
| **2.2.7** | API & Frontend: CSV Import/Export with validation mapping | Medium | 2 | 2.2.2 |
| **2.2.8** | API: Basic Lead Assignment Engine (Manual & Round-robin) | Medium | 2 | 2.2.1 |
| **2.2.9** | Frontend: Lead detail page with basic activity timeline | Medium | 2 | 2.2.4 |

### 2.3 Deliverables
- Robust API endpoints for Lead management.
- Dynamic custom field capability supporting String, Number, Boolean, and Date types.
- A functional Kanban board for visualizing the sales pipeline.
- CSV ingestion capability mapped to Tenant schema.

### 2.4 Definition of Done (DoD)
- Round-robin assignment is thoroughly tested for edge cases (e.g., users on leave).
- Search API performs efficiently on a dataset of 100k mocked leads (Response time < 200ms).
- Kanban board drag-and-drop seamlessly updates the backend state.
- CSV import gracefully handles errors and provides a feedback file for failed rows.

---

## Phase 3: Communication Layer (Week 5-6)

### 3.1 Overview
Integrate essential communication channels to enable sales reps to interact with leads directly from the CRM, capturing all context in the activity timeline.

### 3.2 Tasks & Estimated Effort

| Task ID | Description | Complexity | Effort (Days) | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **3.2.1** | Telephony Abstraction Layer (Interface definition for Twilio/Exotel) | Medium | 1.5 | Phase 2 |
| **3.2.2** | Telephony Implementation: Click-to-dial integration & Call bridging | High | 3 | 3.2.1 |
| **3.2.3** | API: Call logging, status webhooks, and recording URL retrieval | Medium | 2 | 3.2.2 |
| **3.2.4** | WhatsApp Cloud API Integration: Setup and Provider Abstraction | Medium | 1.5 | Phase 2 |
| **3.2.5** | API: Send Template Messages & Session Messages | Medium | 2 | 3.2.4 |
| **3.2.6** | API: Handle incoming WhatsApp Webhooks & Chat routing | High | 2.5 | 3.2.4 |
| **3.2.7** | Frontend: 2-way WhatsApp Chat UI embedded in Lead Detail | High | 3 | 3.2.5, 3.2.6|
| **3.2.8** | Frontend: In-app dialer UI and Call log timeline rendering | Medium | 2.5 | 3.2.3 |

### 3.3 Deliverables
- Pluggable telephony integration.
- Ability to initiate calls from the CRM and automatically log call duration and disposition.
- WhatsApp Business API integration supporting approved templates and free-form 24h window messages.
- Real-time or near-real-time chat interface on the frontend.

### 3.4 Definition of Done (DoD)
- Click-to-dial successfully bridges a call between an agent's phone and a lead.
- Webhooks from communication providers are secured (signature verification) and logged.
- Incoming WhatsApp messages automatically map to the correct Lead and trigger a real-time event (Socket.io/SSE) to the frontend.

---

## Phase 4: Integrations & Webhooks (Week 7-8)

### 4.1 Overview
Implement automated lead capture from various top-of-funnel sources. This phase utilizes Redis and BullMQ heavily to ensure stability under load and prevent data duplication.

### 4.2 Tasks & Estimated Effort

| Task ID | Description | Complexity | Effort (Days) | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **4.2.1** | BullMQ setup: Ingestion, Normalization, and Router queues | Low | 1 | Phase 1 |
| **4.2.2** | Meta Graph API (Facebook/Instagram Lead Ads) integration | High | 3 | 4.2.1 |
| **4.2.3** | Google Ads Lead Form webhook integration | Medium | 2 | 4.2.1 |
| **4.2.4** | Indian Portals: IndiaMART Push API integration | Medium | 1.5 | 4.2.1 |
| **4.2.5** | Indian Portals: JustDial webhook parser | Medium | 1.5 | 4.2.1 |
| **4.2.6** | Generic Webhook Endpoint (for Zapier/Make) with mapping UI | High | 3 | 4.2.1 |
| **4.2.7** | Worker logic: Idempotency keys, Duplicate detection, Lead Scoring | High | 3 | 4.2.1 |
| **4.2.8** | Frontend: Integration Management UI (Connect/Disconnect/Logs) | Medium | 3 | 4.2.2-4.2.6 |

### 4.3 Deliverables
- A robust background pipeline capable of ingesting thousands of leads per minute.
- Standardized normalization layer converting disparate payload formats into the internal Lead schema.
- Native OAuth flows and webhook subscriptions for Meta and Google.

### 4.4 Definition of Done (DoD)
- Duplicate leads from the same source within a configurable time window are merged or rejected based on tenant rules.
- Complete audit trail of incoming webhook payloads.
- Meta webhook subscription verifies correctly and responds to challenge requests.
- Failed webhook jobs are automatically retried with exponential backoff.

---

## Phase 5: Campaigns, Analytics & Polish (Week 9-10)

### 5.1 Overview
Provide tools to act on leads in bulk and measure the performance of the sales team. Address technical debt and prepare the application for real-world usage.

### 5.2 Tasks & Estimated Effort

| Task ID | Description | Complexity | Effort (Days) | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **5.2.1** | API & UI: Campaign management (Link sources to campaigns) | Medium | 2.5 | Phase 4 |
| **5.2.2** | Automated Follow-up System (Cron-based triggers & queues) | High | 3 | Phase 3 |
| **5.2.3** | Analytics APIs: Lead Funnel, Call Metrics, User Leaderboard | High | 3.5 | Phase 2, 3 |
| **5.2.4** | Frontend: Analytics Dashboard (Recharts/Chart.js) | Medium | 3 | 5.2.3 |
| **5.2.5** | Notification System (In-app Bell + Push/Email) | Medium | 2 | Phase 1 |
| **5.2.6** | Team Management UI & Hierarchical Views | Medium | 2 | Phase 1 |
| **5.2.7** | Security Hardening (Rate limiting, Helmet, CORS review) | Low | 1 | None |
| **5.2.8** | Performance Optimization (DB indexes, Query optimization, Caching) | Medium | 2 | All |

### 5.3 Deliverables
- Visual dashboard showing conversion rates, average response time, and team performance.
- Automated system for assigning leads from specific campaigns to specific teams.
- Follow-up reminders triggering notifications to agents.
- Optimized database queries for complex aggregations.

### 5.4 Definition of Done (DoD)
- Analytics queries leverage materialized views or optimized aggregate queries (Execution time < 500ms).
- Agent hierarchy prevents users from seeing leads assigned to peers, while managers see their team's leads.
- API is protected against brute-force and DDoS attempts via rate limiting.

---

## Phase 6: Testing & Launch (Week 11-12)

### 6.1 Overview
Final verification, load testing, documentation, and deployment to staging and production environments.

### 6.2 Tasks & Estimated Effort

| Task ID | Description | Complexity | Effort (Days) | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **6.2.1** | Comprehensive E2E Testing (Playwright/Cypress) for critical flows | High | 4 | All |
| **6.2.2** | Load Testing (k6) on webhook ingestion and list APIs | Medium | 2 | Phase 4 |
| **6.2.3** | Security Audit & Penetration Testing | Medium | 2 | All |
| **6.2.4** | API Documentation (Swagger/OpenAPI finalization) | Low | 1.5 | All |
| **6.2.5** | Infrastructure as Code (Terraform/Pulumi for AWS) | High | 3 | None |
| **6.2.6** | Staging Environment Deployment & UAT | Medium | 2 | 6.2.5 |
| **6.2.7** | Production Deployment & Data Seeding | Medium | 1.5 | 6.2.6 |
| **6.2.8** | Monitoring & Alerting Setup (Datadog/Sentry/Prometheus) | Medium | 2 | 6.2.7 |

### 6.3 Deliverables
- Fully deployed Staging and Production environments.
- Comprehensive test reports (E2E and Load).
- Configured observability stack for proactive error tracking.
- Runbooks for common operational tasks (e.g., clearing dead letter queues).

### 6.4 Definition of Done (DoD)
- System handles sustained 500 requests/second on webhook endpoints without dropping messages.
- 0 critical or high severity vulnerabilities found in the security audit.
- Sentry captures all unhandled exceptions with full stack traces.
- All 6 phases signed off by engineering and product stakeholders.
