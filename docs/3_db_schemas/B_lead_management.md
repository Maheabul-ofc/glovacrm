---
Version: 1.0
Stage: Architecture Design
---

# Part B - Lead Management Tables

## Executive Summary
Core CRM tables for managing leads, their activities, assignments, and deduplication. Designed for high volume inserts from various integrations.

## Partitioning Strategy for High-Volume Tenants
For scaling `leads` and `lead_activities` to millions of rows, we recommend **Range Partitioning by Date** (e.g., monthly partitions) combined with tenant-based sharding if a single tenant exceeds 10M+ leads. For MVP (Prisma), we rely on robust indexing (always prefixing with `tenant_id`). Native PostgreSQL partitioning can be applied to `lead_activities` by `created_at` month since it is append-heavy.

## Tables

### 1. `leads`
Main leads table.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK -> `tenants.id` | |
| `assigned_to` | uuid | FK -> `users.id` | Nullable |
| `first_name` | varchar(100) | NOT NULL | |
| `last_name` | varchar(100) | NULL | |
| `phone` | varchar(20) | NULL | Indexed |
| `alt_phone` | varchar(20) | NULL | |
| `email` | varchar(255) | NULL | Indexed |
| `company_name` | varchar(150) | NULL | |
| `designation` | varchar(100) | NULL | |
| `source` | enum | NOT NULL | `FACEBOOK`, `GOOGLE`, `WHATSAPP`, `INDIAMART`, `MANUAL`, etc. |
| `source_id` | varchar(255) | NULL | ID from external system |
| `campaign_id` | uuid | FK -> `campaigns.id` | NULL |
| `status` | enum | NOT NULL | `NEW`, `CONTACTED`, `QUALIFIED`, `LOST`, `WON` |
| `score` | integer | Default 0 | Lead scoring |
| `priority` | enum | NOT NULL | `HIGH`, `MEDIUM`, `LOW` |
| `custom_fields` | jsonb | Default {} | Dynamic data |
| `tags` | text[] | Default [] | Array of tags |
| `address` | text | NULL | |
| `city` | varchar(100) | NULL | |
| `state` | varchar(100) | NULL | |
| `pincode` | varchar(20) | NULL | |
| `notes` | text | NULL | |
| `last_contacted_at`| timestamptz | NULL | |
| `next_follow_up_at`| timestamptz | NULL | |
| `created_at` | timestamptz | NOT NULL | |
| `updated_at` | timestamptz | NOT NULL | |

**Indexes**:
- `idx_leads_tenant_phone` (`tenant_id`, `phone`)
- `idx_leads_tenant_email` (`tenant_id`, `email`)
- `idx_leads_tenant_status` (`tenant_id`, `status`)
- `idx_leads_tenant_assigned` (`tenant_id`, `assigned_to`)
- `uq_leads_tenant_source_id` UNIQUE (`tenant_id`, `source`, `source_id`)

### 2. `lead_activities`
Timeline of actions (calls, emails, status changes).

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK -> `tenants.id` | |
| `lead_id` | uuid | FK -> `leads.id` | |
| `user_id` | uuid | FK -> `users.id` | Actor (nullable for system) |
| `type` | enum | NOT NULL | `CALL`, `NOTE`, `STATUS_CHANGE`, `WHATSAPP` |
| `description` | text | NOT NULL | |
| `metadata` | jsonb | NULL | E.g. call duration, old/new status |
| `created_at` | timestamptz | NOT NULL | |

**Indexes**:
- `idx_activities_tenant_lead` (`tenant_id`, `lead_id`, `created_at` DESC)

### 3. `lead_custom_fields_config`
Defines available custom fields per tenant.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK -> `tenants.id` | |
| `field_name` | varchar(100) | NOT NULL | UI Label |
| `field_key` | varchar(100) | NOT NULL | JSON key |
| `field_type` | enum | NOT NULL | `TEXT`, `NUMBER`, `DATE`, `DROPDOWN` |
| `options` | jsonb | NULL | For dropdowns |
| `created_at` | timestamptz | NOT NULL | |

### 4. `lead_tags`
Predefined tags for a tenant.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK -> `tenants.id` | |
| `name` | varchar(50) | NOT NULL | |
| `color_hex` | varchar(7) | NULL | UI styling |

### 5. `lead_duplicates`
Tracks potential merged/duplicate leads.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK | |
| `primary_lead_id`| uuid | FK -> `leads.id` | The kept lead |
| `duplicate_lead_id`| uuid | FK -> `leads.id` | The merged/deleted lead |
| `merge_reason` | text | NULL | |
| `created_at` | timestamptz | NOT NULL | |

### 6. `lead_assignment_rules`
Rules for auto-assigning incoming leads.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK | |
| `name` | varchar(100) | NOT NULL | |
| `conditions` | jsonb | NOT NULL | Evaluation logic |
| `assign_to_type` | enum | NOT NULL | `USER`, `ROUND_ROBIN` |
| `assign_targets` | jsonb | NOT NULL | Array of user IDs |
| `priority` | integer | NOT NULL | Evaluation order |
| `is_active` | boolean | Default true| |

### 7. `lead_assignment_history`

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK | |
| `lead_id` | uuid | FK | |
| `rule_id` | uuid | FK | Applied rule |
| `assigned_to` | uuid | FK | Assigned user |
| `created_at` | timestamptz | NOT NULL | |
