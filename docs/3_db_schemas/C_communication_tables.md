---
Version: 1.0
Stage: Architecture Design
---

# Part C - Communication Tables

## Executive Summary
Stores interaction data for omni-channel outreach (Telephony, WhatsApp, SMS, Email). Designed to decouple from specific providers (Twilio, Exotel, Meta).

## Tables

### 1. `calls`
Detailed telephony logging.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK -> `tenants.id` | |
| `lead_id` | uuid | FK -> `leads.id` | |
| `user_id` | uuid | FK -> `users.id` | Telecaller |
| `provider` | varchar(50) | NOT NULL | `EXOTEL`, `TWILIO`, etc. |
| `provider_call_id`| varchar(100) | UNIQUE | ID from provider |
| `direction` | enum | NOT NULL | `INBOUND`, `OUTBOUND` |
| `status` | enum | NOT NULL | `INITIATED`, `RINGING`, `ANSWERED`, `MISSED`, `FAILED` |
| `duration_seconds`| integer | Default 0 | |
| `cost` | decimal | Default 0 | Cost of call |
| `started_at` | timestamptz | NULL | |
| `ended_at` | timestamptz | NULL | |
| `created_at` | timestamptz | NOT NULL | |

### 2. `call_recordings`
Stores recording metadata for answered calls.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `call_id` | uuid | FK -> `calls.id` | |
| `recording_url` | text | NOT NULL | S3 or provider URL |
| `duration_seconds`| integer | NOT NULL | |
| `file_size_bytes` | integer | NULL | |
| `created_at` | timestamptz | NOT NULL | |

### 3. `whatsapp_messages`
Full chat history for WhatsApp Cloud API.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK | |
| `lead_id` | uuid | FK | |
| `direction` | enum | NOT NULL | `INBOUND`, `OUTBOUND` |
| `message_type` | enum | NOT NULL | `TEXT`, `TEMPLATE`, `MEDIA` |
| `content` | text | NULL | Text body |
| `media_url` | text | NULL | For images/docs |
| `provider_msg_id`| varchar(150) | UNIQUE | WABA message ID |
| `status` | enum | NOT NULL | `SENT`, `DELIVERED`, `READ`, `FAILED` |
| `error_reason` | text | NULL | |
| `created_at` | timestamptz | NOT NULL | |

### 4. `whatsapp_templates`
Tenant's approved templates.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK | |
| `template_name` | varchar(100) | NOT NULL | |
| `language` | varchar(10) | NOT NULL | e.g. `en_US` |
| `category` | varchar(50) | NOT NULL | `MARKETING`, `UTILITY` |
| `body` | text | NOT NULL | |
| `variables` | jsonb | NULL | Mapping config |
| `provider_status` | enum | NOT NULL | `PENDING`, `APPROVED`, `REJECTED` |
| `created_at` | timestamptz | NOT NULL | |

### 5. `email_logs`

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK | |
| `lead_id` | uuid | FK | |
| `subject` | varchar(255) | NOT NULL | |
| `body_html` | text | NOT NULL | |
| `status` | enum | NOT NULL | `SENT`, `OPENED`, `BOUNCED` |
| `provider_id` | varchar(150) | NULL | SendGrid/SES ID |
| `created_at` | timestamptz | NOT NULL | |

### 6. `sms_logs`

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK | |
| `lead_id` | uuid | FK | |
| `phone_number` | varchar(20) | NOT NULL | |
| `message` | text | NOT NULL | |
| `status` | enum | NOT NULL | `SENT`, `DELIVERED`, `FAILED` |
| `created_at` | timestamptz | NOT NULL | |
