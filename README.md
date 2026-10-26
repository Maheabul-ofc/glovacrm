# 🚀 GlovaCRM Enterprise

> **Modern Multi-Tenant Sales CRM with Automated Android SIM Call Duration Tracking, Telephony, WhatsApp Cloud API, and Pipeline Kanban.**

---

## 🌟 Key Highlights & Features

### 1. 📞 Automated Call Duration System
- **Android Companion App:** Places outbound calls via the native SIM card and automatically reads the carrier call log (`READ_CALL_LOG`) to record exact duration in seconds (e.g., `142s` -> `2m 22s`) without any manual user entry.
- **Web & iOS Stopwatch:** Interactive `CallTimerModal` with live stopwatch, dialing status, and one-click outcome confirmation.
- **Call History Tab:** Every lead detail page tracks previous calls with duration badges, timestamps, recording links, and agent notes.

### 2. 👥 Complete Lead & Pipeline Management
- **Smart Leads Table:** Filter by campaign, service, priority (`LOW`, `NORMAL`, `HIGH`, `URGENT`), and 5-star conversion rating.
- **Kanban Board:** Smooth drag-and-drop pipeline stages (`New`, `Contacted`, `In Discussion`, `Proposal Sent`, `Won`, `Lost`).
- **Lead Profile View (`/dashboard/leads/[id]`):** Contact information, activity timeline, deals, follow-up scheduler, and call logs.

### 3. 💬 WhatsApp Cloud API & Templates
- **Template Manager:** Create pre-approved WhatsApp templates with dynamic variables (`{{customer_name}}`, `{{business_name}}`, `{{telecaller_name}}`).
- **Direct WhatsApp Messaging:** Send 1-click WhatsApp messages to leads directly from their profile.

### 4. 📅 Tasks & Follow-Up Reminders
- **Smart Follow-ups:** Automated reminders for overdue and upcoming client follow-up calls.
- **One-Click Completion:** Mark follow-ups complete directly from the task list.

### 5. 👥 Team & Role-Based Access Control
- **Multi-Role Support:** `SUPER_ADMIN` (Platform), `TENANT_ADMIN` (Business Owner), `TEAM_MANAGER`, `TELECALLER`, and `SALES_REP`.
- **Team Management:** Invite new staff members, assign leads, and monitor agent closing metrics.

### 6. 📊 Analytics, Reports & Webhooks
- **Visual Analytics:** Conversion funnel, monthly revenue charts, campaign performance bar charts, and pie breakdowns.
- **Omnichannel Ingestion Webhooks:** Pre-configured endpoints for Facebook Lead Ads, Google Ads, IndiaMART, and JustDial.

### 7. 🏢 Super Admin & SaaS Billing
- **Platform Overview (`/admin`):** Monitor all registered companies, active trials, MRR, and total platform users.
- **Billing & Subscriptions:** Tiered plans (`Starter`, `Professional`, `Enterprise`) with simulated testing or Instamojo payment gateway.

---

## ⚡ 1-Click Quickstart (Web)

To launch the complete GlovaCRM platform (Database, Backend API, and Frontend Web App):

1. **Double-click:**
   ```
   D:\GlovaDev\CRM\start-crm.bat
   ```
2. The script will automatically:
   - Start Docker PostgreSQL and Redis containers (if Docker Desktop is running).
   - Push database schema and seed default data.
   - Launch Backend API on `http://localhost:5000`.
   - Launch Next.js Web Frontend on `http://localhost:3000`.
   - Open your browser to the CRM login screen.

---

## 🔑 Default Login Credentials

| Role | Email | Password | Access |
|---|---|---|---|
| **Super Admin** | `admin@glovacrm.com` | `password123` | Full SaaS Admin (`/admin`) + Dashboard |
| **Business Owner** | `owner@glovacrm.com` | `password123` | Organization Owner (`/dashboard`) |
| **Telecaller Agent** | `caller@glovacrm.com` | `password123` | Telecaller Workspace (`/dashboard/leads`) |

*(You can also click **"Register"** on the login screen to create a new trial workspace at any time).*

---

## 📱 Android Companion App (Full Mobile CRM)

Located in `D:\GlovaDev\CRM\mobile`:
- Renders the entire GlovaCRM application inside a native wrapper.
- Automatically captures SIM talk time from Android OS call logs and syncs back to the CRM database.
- Build APK:
  ```powershell
  cd D:\GlovaDev\CRM\mobile
  npx eas-cli build -p android --profile preview
  ```
  *(Or double-click `mobile/build-apk-cloud.bat`)*
