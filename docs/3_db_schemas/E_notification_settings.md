---
Version: 1.0
Stage: Architecture Design
---

# Part E - Notifications & Settings

## Executive Summary
Manages system notifications, user preferences, and tenant-level configurations such as pipeline stages.

## Tables

### 1. `notifications`
In-app alerts for users.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK | |
| `user_id` | uuid | FK | Target user |
| `type` | varchar(50) | NOT NULL | `LEAD_ASSIGNED`, `CALL_MISSED` |
| `title` | varchar(200) | NOT NULL | |
| `body` | text | NULL | |
| `is_read` | boolean | Default false| |
| `action_url` | text | NULL | Deep link |
| `created_at` | timestamptz | NOT NULL | |

### 2. `notification_preferences`
User-level toggle for alerts.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `user_id` | uuid | FK -> `users.id` | UNIQUE |
| `email_alerts` | boolean | Default true | |
| `push_alerts` | boolean | Default true | |
| `config` | jsonb | NULL | Granular toggles per event type |
| `updated_at` | timestamptz | NOT NULL | |

### 3. `tenant_settings`
Global configuration for a workspace.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK -> `tenants.id` | UNIQUE |
| `timezone` | varchar(50) | NOT NULL | e.g. `Asia/Kolkata` |
| `working_hours` | jsonb | NULL | For routing leads only during shifts |
| `auto_assign_leads`| boolean | Default false| |
| `assignment_logic` | enum | NULL | `ROUND_ROBIN`, `WEIGHTED` |
| `updated_at` | timestamptz | NOT NULL | |

### 4. `pipeline_stages`
Customizable kanban stages per tenant.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK | |
| `name` | varchar(100) | NOT NULL | e.g. `First Contact`, `Demo Scheduled` |
| `color` | varchar(7) | NULL | Hex code |
| `order_index` | integer | NOT NULL | Sorting order |
| `is_system` | boolean | Default false| Cannot be deleted if true |
| `created_at` | timestamptz | NOT NULL | |
