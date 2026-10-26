---
Version: 1.0
Stage: Architecture Design
---

# Part A - Foundation Tables (Multi-Tenant SaaS)

## Executive Summary
This document outlines the foundation tables for the GlovaCRM project. The architecture uses a shared database, shared schema approach for multi-tenancy, using a `tenant_id` discriminator column on all tenant-specific data.

## 1. General Database Rules
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Primary Keys**: UUID (v4)
- **Multi-tenancy**: Discriminator column `tenant_id` on all tenant-specific tables.
- **Timestamps**: `created_at`, `updated_at` (timestamptz)

## 2. Tables

### 2.1 `tenants`
Stores the workspace/organization data.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | Primary Key |
| `name` | varchar(150) | NOT NULL | Tenant Name |
| `slug` | varchar(100) | UNIQUE | Used for URL |
| `subdomain` | varchar(100) | UNIQUE | Optional custom subdomain |
| `logo_url` | text | NULL | S3 link |
| `status` | enum | NOT NULL | `ACTIVE`, `SUSPENDED`, `CANCELLED` |
| `settings` | jsonb | NULL | Tenant-wide configuration |
| `plan` | enum | NOT NULL | `FREE`, `PRO`, `ENTERPRISE` |
| `created_at` | timestamptz | NOT NULL | Default now() |
| `updated_at` | timestamptz | NOT NULL | Default now() |

**Indexes**:
- `idx_tenants_slug` (`slug`)
- `idx_tenants_status` (`status`)

### 2.2 `users`
Stores all system users. Bound to a tenant.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | Primary Key |
| `tenant_id` | uuid | FK -> `tenants.id` | Multi-tenant separator |
| `email` | varchar(255) | NOT NULL, UNIQUE(tenant_id, email) | Login email |
| `password_hash` | text | NOT NULL | Bcrypt hash |
| `first_name` | varchar(100) | NOT NULL | |
| `last_name` | varchar(100) | NULL | |
| `phone` | varchar(20) | NULL | E.164 format |
| `avatar_url` | text | NULL | S3 link |
| `role` | enum | NOT NULL | `OWNER`, `ADMIN`, `MANAGER`, `AGENT` |
| `status` | enum | NOT NULL | `ACTIVE`, `INACTIVE`, `INVITED` |
| `last_login_at` | timestamptz | NULL | |
| `invited_by` | uuid | FK -> `users.id` | Nullable |
| `created_at` | timestamptz | NOT NULL | |
| `updated_at` | timestamptz | NOT NULL | |

**Decision on Enum-Based RBAC**:
We chose Enum-based RBAC (`role` column) instead of dynamic `roles` and `permissions` tables. For a standard SaaS CRM, standard roles (`OWNER`, `ADMIN`, `MANAGER`, `AGENT`) cover 95% of use cases. This approach greatly simplifies queries, avoids complex joins during authentication, and integrates natively with Prisma enums. Granular permissions can be managed application-side based on these roles, or via a `permissions` JSONB column if minor tweaks are needed per user.

**Indexes**:
- `idx_users_tenant_email` (`tenant_id`, `email`)
- `idx_users_tenant_role` (`tenant_id`, `role`)

### 2.3 `user_sessions`
Manages refresh tokens.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | Primary Key |
| `user_id` | uuid | FK -> `users.id` | |
| `refresh_token` | text | UNIQUE | Hashed refresh token |
| `ip_address` | inet | NULL | |
| `user_agent` | text | NULL | |
| `expires_at` | timestamptz | NOT NULL | |
| `created_at` | timestamptz | NOT NULL | |

### 2.4 `invitations`
For inviting telecallers/agents to a tenant workspace.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK -> `tenants.id` | |
| `email` | varchar(255) | NOT NULL | Invited email |
| `role` | enum | NOT NULL | Intended role |
| `token` | text | UNIQUE | Invitation link token |
| `expires_at` | timestamptz | NOT NULL | |
| `status` | enum | NOT NULL | `PENDING`, `ACCEPTED`, `EXPIRED` |
| `invited_by` | uuid | FK -> `users.id` | |
| `created_at` | timestamptz | NOT NULL | |

### 2.5 `audit_logs`
Tracks critical actions per tenant.

| Column | Type | Constraints | Remarks |
|---|---|---|---|
| `id` | uuid | PK | |
| `tenant_id` | uuid | FK -> `tenants.id` | |
| `user_id` | uuid | FK -> `users.id` | Nullable for system actions |
| `action` | varchar(100) | NOT NULL | e.g. `lead.deleted`, `settings.updated` |
| `entity_type` | varchar(50) | NOT NULL | `lead`, `user`, etc. |
| `entity_id` | uuid | NOT NULL | ID of affected entity |
| `old_values` | jsonb | NULL | |
| `new_values` | jsonb | NULL | |
| `ip_address` | inet | NULL | |
| `user_agent` | text | NULL | |
| `created_at` | timestamptz | NOT NULL | |

**Indexes**:
- `idx_audit_tenant_entity` (`tenant_id`, `entity_type`, `entity_id`)
- `idx_audit_tenant_action` (`tenant_id`, `action`)
