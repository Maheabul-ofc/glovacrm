---
Version: 1.0
Stage: Architecture Design
---

# Part D - Campaign & Integration Tables

## Executive Summary
Handles marketing campaigns, source attribution, and external integrations (Meta, IndiaMART, JustDial). 

## Integration Credential Encryption Strategy
Tokens and API keys stored in `integrations.credentials` must be encrypted at the application layer before writing to the database using AES-256-GCM. The decryption key should be securely stored in the environment variables (e.g., AWS KMS or Doppler). Never store raw OAuth tokens in plain text.

## Tables

### 1. `campaigns`
Tracks manual and automated outreach.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK -> `tenants.id` | |
| `name` | varchar(150) | NOT NULL | |
| `type` | enum | NOT NULL | `WHATSAPP`, `EMAIL`, `SMS` |
| `status` | enum | NOT NULL | `DRAFT`, `SCHEDULED`, `RUNNING`, `COMPLETED` |
| `audience_filter`| jsonb | NULL | JSON rule to match leads |
| `template_id` | uuid | NULL | Ref to template |
| `scheduled_at` | timestamptz | NULL | |
| `stats` | jsonb | NULL | {sent, delivered, opened} |
| `created_at` | timestamptz | NOT NULL | |

### 2. `integrations`
Tenant's connected platforms.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK | |
| `provider` | enum | NOT NULL | `FACEBOOK`, `INDIAMART`, `JUSTDIAL` |
| `status` | enum | NOT NULL | `ACTIVE`, `ERROR`, `DISCONNECTED` |
| `credentials` | text | NOT NULL | Encrypted JSON string |
| `config` | jsonb | NULL | Non-sensitive sync settings |
| `created_at` | timestamptz | NOT NULL | |
| `updated_at` | timestamptz | NOT NULL | |

### 3. `webhook_events`
Idempotency and payload storage for incoming webhooks.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK | Nullable if global webhook |
| `provider` | varchar(50) | NOT NULL | e.g. `FACEBOOK_LEADS` |
| `event_id` | varchar(150) | UNIQUE | Idempotency key from provider |
| `payload` | jsonb | NOT NULL | Raw request body |
| `status` | enum | NOT NULL | `PENDING`, `PROCESSED`, `FAILED` |
| `error_message` | text | NULL | |
| `created_at` | timestamptz | NOT NULL | |

### 4. `integration_sync_logs`
Logs manual or cron-based polling (e.g., IndiaMART Push API / Polling).

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `integration_id`| uuid | FK -> `integrations.id` | |
| `sync_type` | enum | NOT NULL | `MANUAL`, `SCHEDULED`, `WEBHOOK` |
| `records_fetched`| integer | NOT NULL | |
| `records_inserted`| integer | NOT NULL | |
| `status` | enum | NOT NULL | `SUCCESS`, `PARTIAL`, `FAILED` |
| `created_at` | timestamptz | NOT NULL | |
