# Multi-Tenant SaaS CRM (GlovaCRM) — MVP Scope Finalization and System Boundary

**Version:** v1  
**Stage:** Step 3B — MVP Scope Finalization and System Boundary  
**Project:** GlovaCRM (Multi-Tenant SaaS CRM for Indian SMBs)
**Purpose:** Freeze the MVP scope, product boundaries, system responsibilities, and high-level module ownership before moving to HLD, DB schema, LLD, and API design.

---

## 1. Executive Summary

GlovaCRM is a multi-tenant SaaS Customer Relationship Management (CRM) platform tailored specifically for Indian small-to-medium businesses (SMBs). The MVP focuses on solving the core lead ingestion, distribution, and follow-up challenges faced by sales teams in India, specifically integrating with regional platforms, WhatsApp, and telephony providers. 

The MVP will allow Super Admins to provision tenants (businesses). Tenant Admins can configure their lead sources (Meta, Google Ads), invite telecallers, and monitor performance. Telecallers will use a streamlined interface to receive leads, make calls, log activities, send WhatsApp messages, and schedule follow-ups.

The MVP is not a full-scale enterprise ERP or a complex marketing automation suite. It is a highly optimized, high-throughput sales engine where:
1. Leads flow into the system automatically via Webhooks (Meta, Google).
2. The assignment engine distributes leads to telecallers based on simple round-robin or manual assignment.
3. Telecallers execute follow-ups via integrated Telephony and WhatsApp.
4. Managers track metrics, lead statuses, and conversions in real-time.
5. All data is isolated per tenant using a shared-database, shared-schema architecture with a strict `tenant_id` discriminator.

---

## 2. MVP Goal

The goal of the MVP is to launch a working version that proves the core business flow for small-scale Indian businesses:

> A business (Tenant) can sign up, configure their Meta/Google lead sources, auto-assign incoming leads to telecallers, allow telecallers to efficiently call and WhatsApp leads, track all interactions, and provide real-time visibility to business owners on sales performance.

The MVP should prioritize multi-tenant data security, high availability for webhook ingestion, low latency for the telecaller interface, and accurate reporting. Advanced automation and Indian-specific portal integrations (IndiaMART, JustDial) are pushed to Phase 2 to ensure a timely MVP launch.

---

## 3. Primary System Users

| User Type | Included in MVP | Description |
|---|---:|---|
| Super Admin | Yes | Manages the GlovaCRM platform, provisions tenants, manages global subscriptions, handles system-wide configurations and audits. |
| Tenant Admin | Yes | Business owner or sales manager. Configures integrations, manages telecallers, creates campaigns, views dashboards, and handles billing. |
| Telecaller | Yes | Sales representative. Logs in to view assigned leads, makes calls (via integrated dialer), sends WhatsApp messages, updates lead statuses, sets reminders. |
| System Worker | Yes | Background processes handling webhook ingestion, lead assignment, reminder dispatch, scheduled campaigns, and notification delivery. |
| External Lead | No (Passive) | The end customer whose data is captured. They do not log into the system but receive calls and WhatsApp messages. |

---

## 4. Application Surfaces in MVP

| Surface | MVP Responsibility |
|---|---|
| Super Admin Panel | Platform health monitoring, tenant CRUD, global subscription management, feature toggles, super audit logs. |
| Tenant Admin Dashboard | Telecaller CRUD, lead source configuration, campaign management, reporting & analytics, custom field definitions, billing view. |
| Telecaller Interface | High-speed lead execution view, integrated dialer popup, quick-action buttons for WhatsApp/status update, task/reminder list. |
| Backend API | Core business logic, multi-tenant data isolation, REST endpoints for frontend, Webhook receivers for Meta/Google. |
| Background Workers | Asynchronous processing: BullMQ queues for lead ingestion, assignment engine, webhook retries, bulk campaign execution. |

---

## 5. Core MVP Domain Boundaries

The MVP must keep the following domain concepts separate to ensure a scalable and maintainable architecture.

| Domain Concept | Meaning | Why It Must Be Separate |
|---|---|---|
| Tenant | A business entity using the SaaS platform | Multi-tenancy requires strict isolation. All other domain entities (except Super Admin constructs) must belong to a Tenant. |
| User / Auth | Login identity, roles, and sessions | Auth handles credentials and JWTs. A user belongs to a tenant (except Super Admins). Roles govern permissions. |
| Lead | A prospective customer record | The central entity. It holds contact info, custom fields, and current status. Distinct from the activities performed on it. |
| Lead Activity | A record of an action taken on a lead | Tracks status changes, notes added, calls made. Forms the audit trail and timeline for a lead. |
| Call | A telephony event | Specific to voice interactions. Tracks duration, recording URL, and outcome. Linked to a lead and telecaller. |
| WhatsApp Message | A chat interaction via WA Business API | Specific to text/media messaging. Requires template approval workflows and delivery receipt tracking. |
| Campaign | A grouped outbound effort | Organizes leads for bulk actions or specific sales drives. Separates ad-hoc leads from structured outreach. |
| Integration Config | Credentials and settings for external APIs | Must be securely stored and isolated. Decouples the core engine from third-party specific Auth (e.g., Meta access tokens). |
| Webhook Event | Raw incoming payload from lead sources | Must be captured raw for idempotency, retry, and auditing before being parsed into a standard Lead. |
| Notification | Internal system alerts (in-app, push) | Alerts telecallers (e.g., "Reminder: Call Lead X") and admins. Decouples event triggers from user UI updates. |
| Audit Log | System and security events | Tracks who did what and when. Essential for compliance and debugging (e.g., "Admin deleted Lead Y"). |
| Custom Field | Tenant-defined dynamic data points | Allows businesses to store industry-specific data without altering the core database schema. |
| Tag | Lightweight categorization labels | Flexible filtering mechanism, distinct from formal status pipelines. |

---

## 6. MVP Module Scope

This section details the specific inclusions and exclusions for each major module in the MVP.

### M1: Platform & Tenant Management
**IN SCOPE:**
- Super Admin login and basic dashboard.
- Tenant creation, suspension, and deletion by Super Admin.
- Basic tenant profile (Name, Subdomain/Slug, Contact Info, Industry).
- Tenant status management (Active, Suspended, Trial).
- Global limits configuration (max users per tenant, max leads).

**OUT OF SCOPE:**
- Automated self-serve tenant sign-up and checkout (manual provisioning for MVP).
- Automated billing, invoicing, and payment gateway integration for SaaS subscriptions.
- Custom domain mapping for tenants.
- White-labeling (custom logos/colors per tenant).

### M2: Authentication & Authorization
**IN SCOPE:**
- JWT-based authentication with access and refresh tokens.
- Email and Password login for all users.
- Role-Based Access Control (RBAC) with predefined roles: Super Admin, Tenant Admin, Telecaller.
- Password reset flow via email link.
- Strict tenant isolation middleware (every request enforces `tenant_id` context).

**OUT OF SCOPE:**
- Single Sign-On (SSO) via Google, Microsoft, or SAML.
- Two-Factor Authentication (2FA/MFA).
- Custom role creation or granular permission editing by Tenant Admins.
- Social login.

### M3: Lead Management
**IN SCOPE:**
- Lead CRUD operations (Create, Read, Update, Delete) for Tenant Admins.
- Telecaller read/update access for assigned leads.
- Lead status pipeline (New, Contacted, Interested, Follow-up, Converted, Dead).
- Standard fields (Name, Phone, Email, Source, Status, Assigned To).
- Custom fields (Text, Number, Date, Dropdown) defined per tenant.
- Lead timeline view showing all activities, calls, and messages.
- Bulk import of leads via CSV/Excel.
- Basic list view with filtering (by status, source, assignee, date range) and pagination.

**OUT OF SCOPE:**
- Advanced lead scoring algorithms.
- Custom status pipeline creation (hardcoded statuses for MVP).
- Automated deduplication merging (basic duplicate prevention on phone number only).
- Kanban board view for leads.
- Bulk export of leads (admin only, restricted in MVP).

### M4: Lead Ingestion & Webhooks
**IN SCOPE:**
- Webhook receiver endpoints for external lead sources.
- Meta (Facebook/Instagram) Lead Ads webhook integration.
- Google Ads Lead Form webhook integration.
- Raw payload storage in DB for audit and retry purposes.
- Background worker to parse incoming webhooks and create Lead records.
- Idempotency checks to prevent duplicate lead creation from webhook retries.

**OUT OF SCOPE:**
- India-specific portals (IndiaMART Push API, JustDial, 99acres, MagicBricks, Sulekha) — Pushed to Phase 2.
- Custom generic webhook builder.
- Email parsing for lead creation.
- Zapier / Make.com native app (webhooks can be used instead).

### M5: Lead Assignment Engine
**IN SCOPE:**
- Manual assignment by Tenant Admin.
- Basic Round-Robin auto-assignment to active telecallers.
- Assignment based on lead source.
- Re-assignment capabilities for admins.
- Notification to telecaller upon new assignment.

**OUT OF SCOPE:**
- Weighted round-robin or skill-based routing.
- Location-based or language-based routing.
- Auto-reassignment if a lead is not contacted within X hours.
- Shift-based assignment (checking if telecaller is currently clocked in).

### M6: Telephony / Dialer
**IN SCOPE:**
- Abstracted telephony interface allowing integration with providers.
- Single provider integration for MVP (e.g., Exotel or Twilio, configurable per tenant).
- Click-to-call functionality from the Telecaller interface.
- Call logging (start time, end time, duration, status: answered/missed).
- Call recording URL storage and playback in the lead timeline.
- Incoming call webhook to pop up lead info if caller exists in DB.

**OUT OF SCOPE:**
- Predictive dialing or auto-dialing (one-by-one click-to-call only).
- IVR (Interactive Voice Response) setup and management.
- Live call barging/whispering for managers.
- SIP softphone embedded in browser (using cloud telephony click-to-call bridge instead: calls agent phone, then bridges to customer).

### M7: WhatsApp Messaging
**IN SCOPE:**
- Integration with WhatsApp Business Cloud API.
- Sending pre-approved template messages from the CRM.
- Logging sent messages in the lead timeline.
- Webhook for delivery receipts (Sent, Delivered, Read).
- Basic fallback to WhatsApp Web link (wa.me) if Cloud API is not configured.

**OUT OF SCOPE:**
- Two-way chat interface for receiving and replying to free-form messages.
- Automated chatbot workflows.
- Template creation and approval management within the CRM (must be done in Meta Business Manager).
- Bulk WhatsApp blasting (rate limits and ban risks are too high for MVP).

### M8: Campaign Management
**IN SCOPE:**
- Creation of static campaigns (a grouped list of leads).
- Assigning a campaign to specific telecallers.
- Campaign progress tracking (X out of Y leads contacted).
- Basic campaign metrics (conversion rate for the campaign).

**OUT OF SCOPE:**
- Dynamic campaigns (auto-updating lists based on filters).
- Multi-step drip campaigns or automated sequences.
- Email campaigns.
- A/B testing.

### M9: Follow-up & Reminders
**IN SCOPE:**
- Scheduling follow-up tasks on a lead (Date, Time, Note).
- Task list view for telecallers (Today, Overdue, Upcoming).
- In-app notification when a reminder is due.
- Linking tasks to specific lead statuses (e.g., automatically prompt for reminder when status is "Follow-up").

**OUT OF SCOPE:**
- Calendar sync (Google Calendar / Outlook integration).
- Recurring reminders.
- SMS reminders to the external lead.

### M10: Analytics & Dashboard
**IN SCOPE:**
- Tenant Admin Dashboard showing:
  - Total leads ingested today/week/month.
  - Leads by status (funnel view).
  - Telecaller performance table (Calls made, Leads converted).
- Telecaller Dashboard showing:
  - My leads today.
  - My upcoming tasks/reminders.
  - My conversion count.

**OUT OF SCOPE:**
- Custom report builder.
- Scheduled email reports.
- Advanced cohort analysis or conversion time metrics.
- Exporting reports to PDF.

### M11: Notifications
**IN SCOPE:**
- In-app notification center (bell icon).
- Real-time updates via WebSockets/Server-Sent Events for new lead assignments.
- Real-time alerts for incoming calls (if matching a lead).

**OUT OF SCOPE:**
- Browser push notifications.
- Email notifications for every lead event (too noisy).
- Slack / Microsoft Teams integration.

### M12: Settings & Configuration
**IN SCOPE:**
- Tenant profile management.
- Telecaller management (Invite, Suspend, Delete).
- Custom fields configuration.
- Integration credentials setup (Meta, Google, Telephony provider, WA Cloud API).

**OUT OF SCOPE:**
- Audit log viewing UI (admin settings only).
- API key generation for external access to GlovaCRM.
- Complex hierarchical teams or territory management.

### M13: Audit & Logging
**IN SCOPE:**
- System-level request logging (Morgan/Winston).
- Application-level audit trail for critical actions (Login, Lead Deletion, Bulk Import, User creation).
- Storage of audit events in a separate DB table with `tenant_id`, `user_id`, `action`, `resource`, `timestamp`.

**OUT OF SCOPE:**
- UI for Tenant Admins to search complex audit logs (basic activity timeline on leads is sufficient).
- Automated log archiving to cold storage (handled manually by Super Admin/DevOps).

---

## 7. MVP Workflow Definitions

### 7.1 Webhook Lead Ingestion Workflow
1. External platform (Meta) receives a lead form submission.
2. Meta sends a POST request to GlovaCRM's webhook endpoint `POST /api/v1/webhooks/meta/{tenant_id}`.
3. API Gateway receives the payload, authenticates the webhook (signature validation), and pushes the raw event to a Redis queue.
4. Background Worker picks up the job.
5. Worker parses the Meta payload, mapping fields to the Tenant's Custom Fields.
6. Worker checks for duplicates (Phone Number match within the Tenant).
7. If new, a `Lead` record is created.
8. Assignment Engine is triggered.
9. Lead is assigned to Telecaller A via Round-Robin.
10. System emits a real-time WebSocket event to Telecaller A.
11. Telecaller A sees a notification: "New Lead Assigned: John Doe".

### 7.2 Telecaller Call Execution Workflow
1. Telecaller logs in and navigates to "My Tasks" or "Assigned Leads".
2. Telecaller clicks on a lead to view details.
3. Telecaller clicks the "Call" button next to the phone number.
4. GlovaCRM backend makes an API call to the Telephony Provider (e.g., Exotel).
5. Exotel initiates a call to the Telecaller's mobile phone.
6. Telecaller answers, and Exotel then dials the Lead's phone number.
7. Call connects. Telecaller speaks with the Lead.
8. Call ends. Exotel sends a webhook to GlovaCRM with call duration and recording URL.
9. GlovaCRM updates the `LeadActivity` timeline with the call details.
10. Telecaller manually updates the Lead Status (e.g., to "Interested") and logs a note.

### 7.3 WhatsApp Template Sending Workflow
1. Telecaller views a Lead in the CRM.
2. Telecaller clicks the "WhatsApp" button.
3. UI presents a dropdown of pre-approved Meta WhatsApp templates.
4. Telecaller selects a template (e.g., "Introductory Brochure").
5. System populates template variables automatically (e.g., `{{name}}` -> Lead Name).
6. Telecaller clicks "Send".
7. Backend dispatches the message via WA Business Cloud API.
8. A `LeadActivity` record is created indicating the message was sent.
9. Meta sends delivery status webhooks asynchronously.
10. GlovaCRM updates the message status in the timeline (Sent -> Delivered -> Read).

### 7.4 Follow-up Reminder Workflow
1. After a call, Telecaller changes lead status to "Follow-up".
2. UI prompts to schedule a reminder.
3. Telecaller sets date/time for tomorrow at 10:00 AM and adds a note.
4. Reminder is saved in DB.
5. Next day at 10:00 AM, a cron job/worker identifies the due reminder.
6. System pushes an in-app notification to the Telecaller.
7. Telecaller clicks the notification, opening the Lead profile to execute the call.

---

## 8. Phase 2 Features (Clearly OUT of MVP)

The following features are explicitly deferred to Phase 2 to ensure a focused, high-quality MVP launch:

1. **India-Specific Portal Integrations:** Direct API/Webhook integrations with IndiaMART, JustDial, 99acres, MagicBricks, Sulekha.
2. **Two-Way WhatsApp Inbox:** A full chat interface for replying to incoming WhatsApp messages from leads.
3. **Automated Billing/SaaS Subscriptions:** Stripe/Razorpay integration for self-serve tenant sign-ups and monthly billing.
4. **Advanced Automation Builder:** Zapier-like internal workflows (e.g., "If lead is uncontacted for 2 hours, send WA message").
5. **Email Integration:** Sending and receiving emails via IMAP/SMTP within the CRM.
6. **Mobile Application:** Native iOS/Android apps for telecallers (MVP will be a responsive web app).
7. **Custom Dashboards:** Drag-and-drop report builders for Tenant Admins.
8. **Predictive Dialing:** Auto-dialers that call multiple numbers and connect answered calls to agents.
9. **Hierarchical Teams:** Complex territory management and multi-level manager views.
10. **Data Export Controls:** Fine-grained permissions on who can export data to Excel/CSV.

---

## 9. System Boundaries & Constraints

### 9.1 Data Isolation (Multi-Tenancy)
- **Constraint:** All data must be logically separated using a `tenant_id` column on every tenant-specific table.
- **Enforcement:** Application-level middleware must inject `tenant_id` into every database query. Row Level Security (RLS) in PostgreSQL is highly recommended as a defense-in-depth measure.

### 9.2 Rate Limiting & Throttling
- **Constraint:** External webhooks (Meta/Google) can burst during ad campaigns. The system must not drop leads.
- **Solution:** Webhooks hit an API endpoint that does minimal validation and immediately pushes to a Redis queue. Processing is done asynchronously.

### 9.3 Third-Party API Limits
- **Constraint:** WhatsApp Cloud API and Telephony providers have strict rate limits.
- **Solution:** Outbound API calls must be managed through task queues with rate-limiting and backoff retry logic.

### 9.4 Browser Compatibility
- **Constraint:** Telecaller interface must work flawlessly on modern desktop browsers (Chrome, Edge, Firefox, Safari).
- **Mobile Web:** While the UI should be responsive, the primary operating environment for telecallers is assumed to be desktop/laptop. Mobile web experience is a secondary priority for MVP.

---

## 10. Success Criteria for MVP Launch

The MVP will be considered successful and ready for launch when the following criteria are met:

1. **Ingestion Reliability:** The system successfully captures 100% of Meta/Google lead webhooks under simulated burst loads (e.g., 100 leads/minute) without data loss.
2. **Assignment Speed:** Incoming leads are parsed and assigned to an available telecaller within 5 seconds of payload receipt.
3. **Multi-Tenant Security:** Automated tests verify that Tenant A cannot access, query, or modify Tenant B's data under any API request context.
4. **Telephony Integration:** Click-to-call functions reliably bridge calls between the agent's phone and the lead's phone, logging the recording URL correctly.
5. **WhatsApp Delivery:** Pre-approved templates can be sent to leads, and status updates (Delivered/Read) reflect accurately in the lead timeline.
6. **System Stability:** The backend operates without memory leaks or crashes during a 48-hour soak test with simulated typical telecaller traffic.
7. **Usability:** A non-technical user (simulated telecaller) can log in, view a lead, make a call, and schedule a follow-up without needing external documentation.
