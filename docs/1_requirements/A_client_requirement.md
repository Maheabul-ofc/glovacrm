---
title: GlovaCRM Client Requirements Document
version: 1.0.0
stage: Requirements Definition
status: Approved
date: 2026-08-08
---

# GlovaCRM Client Requirements Document

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Business Context & Market Position](#2-business-context--market-position)
3. [Primary System Users & Detailed Stories](#3-primary-system-users--detailed-stories)
4. [Core Platform Features (Detailed)](#4-core-platform-features-detailed)
5. [Lead Lifecycle State Machine](#5-lead-lifecycle-state-machine)
6. [External Integration Specifications](#6-external-integration-specifications)
7. [India-Specific Considerations](#7-india-specific-considerations)
8. [Data Architecture & Schema Overview](#8-data-architecture--schema-overview)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Target Audience Profile](#10-target-audience-profile)
11. [Competitor Feature Matrix](#11-competitor-feature-matrix)
12. [Deployment & DevOps Strategy](#12-deployment--devops-strategy)
13. [Engineering Decision Rationale](#13-engineering-decision-rationale)

---

## 1. Executive Summary

GlovaCRM is an ambitious Multi-Tenant Software-as-a-Service (SaaS) Customer Relationship Management (CRM) platform purpose-built for small to medium-scale Indian businesses. Designed to overcome the operational bottlenecks of generic CRMs, GlovaCRM focuses on high-volume telecalling, seamless multi-channel lead ingestion (especially from India-centric platforms like IndiaMART, JustDial, Sulekha, MagicBricks, and 99acres), and deep WhatsApp integration.

While solutions like TeleCRM and NeoDove have successfully paved the way for telecalling-focused CRMs in the Indian ecosystem, GlovaCRM introduces a higher degree of workspace customization, robust API extensibility, and sophisticated lead assignment algorithms (including skill-based and territory-based routing) within a highly scalable multi-tenant architecture. The platform empowers businesses to drastically reduce lead response times, eliminate manual data entry, optimize telecaller productivity, and gain actionable insights through comprehensive analytics—all while leveraging SIM-based dialing to mitigate the risk of numbers being marked as spam.

### 1.1 Project Vision and Mission
- **Vision:** To become the default operating system for Indian SMB sales teams, seamlessly bridging the gap between lead generation and revenue realization.
- **Mission:** Deliver a lightning-fast, intuitive, and highly customizable CRM that understands the unique nuances of Indian sales—specifically the reliance on WhatsApp, the necessity of mobile-first workflows, and the challenges of spam identification in telemarketing.

### 1.2 Key Differentiators
- **Hyper-Customization:** Unlike rigidly structured competitors, GlovaCRM offers dynamic schema generation per tenant, allowing completely custom fields and pipeline stages.
- **Deep Integration Ecosystem:** Native, out-of-the-box webhook listeners specifically tailored for Indian aggregators, requiring zero technical setup from the end-user.
- **Resilient Multi-Tenancy:** A shared-database, shared-schema architecture using Row-Level Security (RLS) to guarantee strict data isolation without the overhead of per-tenant infrastructure.

### 1.3 Success Metrics (KPIs)
- **User Adoption:** 90% Daily Active User (DAU) rate among provisioned telecaller accounts.
- **System Performance:** 99.99% uptime with API P95 response times under 200ms.
- **Ingestion Reliability:** Zero lead loss during high-volume ad campaigns, processing webhook payloads within 1 second.
- **Business Value:** A demonstrable 30% reduction in lead response time for our clients within the first month of adoption.

---

## 2. Business Context & Market Position

The Indian SMB (Small and Medium Business) sector requires a highly specific set of CRM capabilities that Western enterprise CRMs (like Salesforce, Microsoft Dynamics, or standard HubSpot) often fail to deliver cost-effectively.

### 2.1 The Indian SMB Sales Environment
Indian sales operations are heavily reliant on distinct operational modalities:
1. **High-volume outbound calling** using local mobile numbers. The reliance on cloud telephony (Virtual Numbers) has decreased due to users ignoring "company" numbers and telecom providers flagging high-volume SIP trunks as spam. A SIM-based routing mechanism via a companion Android app is non-negotiable.
2. **WhatsApp** as the primary medium for business-to-consumer (B2C) and even B2B communication. Email is largely ignored for initial outreach and follow-ups.
3. **Aggregator Portals** (IndiaMART, JustDial, TradeIndia, Sulekha) as primary lead sources, alongside Meta/Google digital ads.

### 2.2 Market Gap Analysis
- **Zoho CRM / Salesforce:** These platforms are incredibly powerful but are considered too complex, have a steep learning curve, and are cost-prohibitive for high-headcount operations (like 50-100 telecallers). Crucially, they lack native, one-click integration with local Indian B2B/B2C portals, forcing businesses to rely on expensive middleware like Zapier or custom SI (System Integrator) work.
- **TeleCRM:** An excellent tool that popularized the SIM-based dialer concept in India. However, it often lacks deep workflow customization, advanced hierarchical access controls, and custom entity relationships required as a business scales beyond a simple call center model.
- **NeoDove:** A very strong direct competitor. NeoDove handles the basics well, but GlovaCRM aims to outcompete it by offering infinitely customizable pipeline stages per tenant, a more open API ecosystem for custom integrations, and superior real-time analytics with predictive conversion modeling.

### 2.3 Product Positioning
GlovaCRM positions itself as the "Customizable Telecalling Command Center." It offers the out-of-the-box simplicity required for a 5-person real estate agency, while maintaining the architectural depth (custom fields, webhooks, granular RBAC, audit logs) needed for a 500-person EdTech telemarketing operation.

---

## 3. Primary System Users & Detailed Stories

The system relies on a strict Role-Based Access Control (RBAC) model. The system must support five primary archetypes, with permissions configurable down to the field level.

### 3.1 Super Admin (Platform Owner)
- **Scope:** Cross-tenant, Platform level. (Internal GlovaCRM Staff).
- **Responsibilities:** 
  - Provisioning and de-provisioning tenant workspaces.
  - Monitoring global infrastructure health, database utilization, and platform-wide analytics.
  - Managing global integrations (e.g., central WhatsApp ISV configuration).
  - Billing, subscription management, and quota enforcement.
- **Key User Stories:**
  - As a Super Admin, I need to see a dashboard of all active tenants so I can monitor platform usage.
  - As a Super Admin, I need to be able to temporarily impersonate a Tenant Admin to troubleshoot specific setup issues, with all actions strictly audited.
  - As a Super Admin, I need to set API rate limits per tenant to prevent noisy neighbor problems.

### 3.2 Tenant Admin (Business Owner)
- **Scope:** Tenant level (Single Workspace).
- **Responsibilities:**
  - Configuring tenant-specific settings.
  - Defining custom lead fields, tags, and custom sales pipeline stages.
  - Managing external integrations.
  - Creating, updating, and deactivating user accounts.
  - Setting up automated lead assignment rules and automated workflows.
- **Key User Stories:**
  - As a Tenant Admin, I need to add custom fields like "Budget" and "Property Type" so the CRM fits my real estate business.
  - As a Tenant Admin, I need to connect my IndiaMART account using a simple API key input so leads sync automatically.
  - As a Tenant Admin, I need to define a round-robin rule for my 10 telecallers so leads are distributed fairly.

### 3.3 Team Manager (Supervisor)
- **Scope:** Team/Group level within a specific Tenant.
- **Responsibilities:**
  - Monitoring real-time activity of assigned telecallers.
  - Re-assigning leads manually among team members.
  - Listening to call recordings for quality assurance.
  - Viewing team-specific analytics and conversion funnels.
- **Key User Stories:**
  - As a Team Manager, I need a live dashboard showing who is on a call and who is idle, so I can ensure productivity.
  - As a Team Manager, I need to listen to the call recording of a lost deal to coach the telecaller.
  - As a Team Manager, I need to reassign 50 leads from an absent employee to active ones.

### 3.4 Telecaller / Sales Representative
- **Scope:** Individual level.
- **Responsibilities:**
  - Executing assigned daily call lists.
  - Updating lead statuses and adding notes.
  - Sending WhatsApp templates or chatting via the CRM.
  - Managing personal follow-ups.
- **Key User Stories:**
  - As a Telecaller, I need a "Click to Dial" button that routes the call through my Android phone automatically so I save time.
  - As a Telecaller, I must be forced to enter a call outcome (disposition) after hanging up so no data is lost.
  - As a Telecaller, I need to see my overdue follow-ups clearly marked in red so I don't miss any meetings.

### 3.5 System (Automated Processes)
- **Responsibilities:**
  - Listening to incoming webhooks.
  - Executing CRON jobs for scheduled reminders.
  - Running round-robin routing continuously.
  - Firing workflow automations.

---

## 4. Core Platform Features (Detailed)

### 4.1 Multi-Tenant Workspace Management
- **Architecture:** Shared DB, Shared Schema.
- **Tenant ID Context:** Every table in the system MUST have a `tenant_id` UUID column.
- **Data Isolation:** Prisma Middleware MUST enforce `tenant_id` filtering on every query. If a developer forgets to add a `where` clause, the middleware must inject it based on the logged-in user's token context.
- **Storage Limits:** Tenant file uploads (audio recordings, PDFs) must be stored in S3 under `s3://bucket-name/tenant_id/user_id/...`. Total size must be calculated and capped based on subscription.

### 4.2 Authentication & Authorization
- **Token Strategy:**
  - Access Token: JWT, 15-minute expiry, signed with RS256. Contains `user_id`, `tenant_id`, and `role`.
  - Refresh Token: Stored in DB, 7-day expiry, securely stored in HttpOnly, Secure, SameSite=Strict cookie.
- **RBAC Matrix:**
  - Permissions are mapped to Roles. Roles are mapped to Users.
  - Example permissions: `leads:create`, `leads:read:all`, `leads:read:team`, `leads:read:own`, `leads:delete`.
- **Audit Logging:** Every login attempt (success/failure) must be logged with IP, User-Agent, and Timestamp.

### 4.3 Lead Management Core
- **CRUD Operations:** Standard Create, Read, Update, Delete for leads.
- **Bulk CSV Import:**
  - Must use `papaparse` on frontend to preview.
  - Backend must process via BullMQ queue to avoid timeout.
  - Must report exact row numbers for failed validations.
- **Deduplication Engine:**
  - Configurable strictness: Match by exact phone, or exact phone + email.
  - Conflict resolution: "Reject New", "Overwrite Old", or "Merge (append notes)".

### 4.4 Lead Ingestion (The Integration Layer)
This is the lifeblood of GlovaCRM.
- **Meta Graph API (Facebook/Instagram Lead Ads):**
  - Must implement the standard webhook challenge/verify protocol.
  - Must parse the standard JSON payload and map generic field names (`full_name`, `phone_number`) to system fields.
- **Google Ads Lead Forms:** Webhook receiver expecting Google's specific JSON schema.
- **IndiaMART CRM Push API:**
  - Native listener for IndiaMART's payload.
  - Requires parsing of `GLUSR_USR_COMPANYNAME`, `SENDER_MOB`, `ENQ_MESSAGE`.
- **JustDial / Sulekha / 99acres:** Polling mechanisms or email parsers as appropriate.

### 4.5 Lead Processing Pipeline
- **Pipeline Stages:**
  - 1. Ingestion Endpoint receives raw payload.
  - 2. Validation Schema (Zod/Joi) ensures required data.
  - 3. Normalizer cleans phone numbers (`+91` standard).
  - 4. Deduplicator checks existing records.
  - 5. Tag Engine applies `#source:facebook` etc.
  - 6. Routing Engine assigns user.
  - 7. Database Insert.
  - 8. WebSockets fire to notify assigned user.

### 4.6 Lead Assignment Rules (Routing Engine)
- **Engine Execution:** Runs as an isolated worker process.
- **Rulesets:**
  - **Round-Robin:** Maintains a Redis counter for the last assigned user in a group to ensure perfectly even distribution.
  - **Load-Based:** Queries the DB for `COUNT(leads) WHERE status != 'Closed' GROUP BY user_id` and assigns to the lowest count.
  - **Skill-Based:** Matches lead tags (e.g., `#tamil`) to user skills (e.g., `skill:tamil`).

### 4.7 Sales Pipeline & Kanban Views
- **Dynamic Board:** The UI must fetch the tenant's custom stage definitions and render columns dynamically.
- **Drag & Drop:** Implement react-beautiful-dnd or dnd-kit.
- **Restrictions:** Tenant Admin can configure rules like "Cannot move to 'Closed Won' without uploading an 'Invoice Document'".

### 4.8 Built-in Dialer Engine (Crucial)
- **Android Companion App:**
  - Built with React Native or Kotlin.
  - Uses `ACTION_CALL` intent.
  - Web UI sends signal via Firebase Cloud Messaging (FCM) to the phone.
  - Phone dials.
  - App uses `TelephonyManager` to listen for call state changes (Ringing, Offhook, Idle).
  - App sends state back to Web UI via WebSockets.
- **Call Recordings:** Android app requests accessibility permissions to record audio (if legal/compliant), or relies on cloud telephony providers.

### 4.9 Call Management & Logging
- **Post-Call Screen (Disposition):**
  - A modal that cannot be closed until a selection is made.
  - Standard options: Answered, Busy, Not Reachable, Invalid Number.
  - Custom outcomes can be added by Admin.
  - Text area for call notes.

### 4.10 WhatsApp Integration
- **Official Meta API:**
  - Requires Embedded Signup flow for tenants to connect their own numbers.
  - UI for submitting templates to Meta for approval.
  - Webhook listener for incoming messages and delivery status (Sent, Delivered, Read).
- **Omnichannel Inbox:** Real-time chat interface.

### 4.11 Campaign Management & Workflow Automation
- **Triggers:** "When Lead is Created", "When Lead Stage Changes", "When Tag Added".
- **Conditions:** "If Source is X", "If Budget > Y".
- **Actions:** "Send WhatsApp Template", "Assign to User Z", "Create Task".
- **Drip logic:** Must support "Wait 2 Days" utilizing BullMQ delayed jobs.

### 4.12 Follow-up & Reminder System
- **Tasks:** Associated polymorphically with Leads.
- **Notifications:** Push and In-app notifications 15 minutes prior to task time.

### 4.13 Analytics & Reporting
- **Data Warehousing:** For MVP, queries run on the primary Postgres DB with optimized indexes. For scaling, read-replicas must be used.
- **Standard Reports:**
  - Call Count by User.
  - Average Handling Time.
  - Conversion Rate by Source.
  - Pipeline Velocity.

### 4.14 Custom Fields & Tags
- **Implementation:** Utilize a `JSONB` column named `custom_data` on the `leads` table.
- **Schema Registry:** A separate table `tenant_schemas` defines the structure (e.g., `field_name: "budget", type: "number"`). The frontend uses this to render forms dynamically.

---

## 5. Lead Lifecycle State Machine

1.  **UNASSIGNED:** System default state.
2.  **ASSIGNED:** SLA timer begins.
3.  **ATTEMPTED:** Micro-states: Line Busy, No Answer.
4.  **CONNECTED:** Micro-states: Custom stages defined by tenant.
5.  **IN PROGRESS:** Ongoing nurturing.
6.  **CONVERTED (WON):** Terminal success.
7.  **DEAD / LOST:** Terminal failure.

> [!CAUTION]
> Funnel Integrity: A lead cannot revert from Converted/Dead to Unassigned without Manager approval.

---

## 6. External Integration Specifications

### 6.1 IndiaMART Integration
- **Endpoint:** `POST /api/v1/webhooks/indiamart/{tenant_uuid}`
- **Security:** IndiaMART IP whitelisting or secret key validation.
- **Payload Mapping:**
  - `SENDER_NAME` -> `first_name`, `last_name`
  - `SENDER_MOB` -> `phone`
  - `ENQ_MESSAGE` -> `notes`

### 6.2 Facebook Lead Ads
- **Endpoint:** `GET /api/v1/webhooks/meta` (Verification) & `POST /api/v1/webhooks/meta` (Event payload)
- **Security:** HMAC SHA-256 signature verification using the App Secret.

---

## 7. India-Specific Considerations

*   **SIM-Based Dialing Preference:** Cloud telephony numbers (Virtual Numbers) are frequently community-marked as spam on Truecaller. GlovaCRM MUST prioritize the Android companion app architecture.
*   **WhatsApp Dominance:** Email is dead for Indian SMB B2C. WhatsApp is P0.
*   **Vernacular Support:** UTF-8 support for regional languages (Hindi, Tamil, etc.) in text fields and WhatsApp templates.
*   **Data Locality:** AWS `ap-south-1` (Mumbai) region mandatory.

---

## 8. Data Architecture & Schema Overview

Core Tables (PostgreSQL):
- `tenants`: id, name, created_at
- `users`: id, tenant_id, role, email, password_hash
- `leads`: id, tenant_id, phone, status, custom_data (JSONB), assigned_to
- `calls`: id, tenant_id, lead_id, user_id, duration, recording_url
- `tasks`: id, tenant_id, lead_id, due_date, status
- `audit_logs`: id, tenant_id, user_id, action, target_table, previous_state, new_state

---

## 9. Non-Functional Requirements

### 9.1 Performance
- **Active Users:** Support 5,000 concurrent active users.
- **Webhook Processing:** DB insertion < 1s.
- **API Response:** P95 < 200ms.

### 9.2 Security
- **Isolation:** Prisma RLS/Middleware.
- **Encryption:** AES-256 at rest, TLS 1.3 in transit.
- **Rate Limiting:** Redis-backed.

---

## 10. Target Audience Profile

- **Verticals:** Real Estate, EdTech, Financial Services, B2B Manufacturers.
- **Size:** 5-200 employees.
- **Technical Skill:** Low. UI must be forgiving and wizard-driven.

---

## 11. Competitor Feature Matrix

| Feature | GlovaCRM | TeleCRM | NeoDove | Zoho CRM |
| :--- | :--- | :--- | :--- | :--- |
| Focus | High-Volume Telecalling | Outbound Telecalling | Outbound Telecalling | Enterprise Workflow |
| Multi-Tenant | Native SaaS | Yes | Yes | Yes |
| IndiaMART Native | **Yes** | Yes | Yes | Requires Middleware |
| Pipeline Custom | **Infinite** | Limited | Limited | High |
| Advanced Routing | **Skill/Territory/Load** | Basic | Limited | Yes (Complex) |
| SIM Dialer App | **Yes** | Yes | Yes | Third-party |
| WhatsApp Native | **Deep Integration** | Yes | Yes | Yes |

---

## 12. Deployment & DevOps Strategy

- **Cloud Provider:** AWS (Mumbai Region).
- **Compute:** ECS Fargate for Node.js API and Worker containers. Auto-scaling based on CPU > 70%.
- **Database:** RDS PostgreSQL Multi-AZ.
- **Cache & Queue:** ElastiCache (Redis) for BullMQ and Rate Limiting.
- **Storage:** S3 for documents and audio recordings.
- **CI/CD:** GitHub Actions to build Docker images and push to ECR, triggering ECS rolling updates.

---

## 13. Engineering Decision Rationale

*   **Database: PostgreSQL:** `JSONB` support is critical for custom fields without EAV anti-patterns.
*   **Backend: Express + Node.js + TypeScript:** Rapid iteration, great async I/O for webhooks, type safety for complex logic.
*   **Queue: Redis + BullMQ:** Decouples heavy blocking operations (CSV imports, WhatsApp broadcasts) from API threads.
*   **Frontend: Next.js + Tailwind CSS:** Fast SPA feel, component reusability, easy styling.
*   **ORM: Prisma:** Type-safe query building and intuitive migration management.

---
> [!NOTE] 
> This document is the foundational requirements specification. Changes post-approval require a formal change request.
