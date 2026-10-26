---
Version: 1.0
Stage: Architecture Design
---

# Part F - Summary & Migration Guidelines

## 1. Complete Entity Relationship Summary
The architecture relies on a **Shared Database, Shared Schema** multi-tenancy model.
- **Root Node**: `tenants`
- **Identity**: `users` (bound to `tenants`)
- **Core Entity**: `leads`
- **Edges**: `lead_activities`, `calls`, `whatsapp_messages` connect `users` and `leads`.

All operational tables have a `tenant_id` foreign key. Querying MUST always include `where: { tenant_id: currentTenantId }` in Prisma.

## 2. Module-to-Table Mapping
| Module | Primary Tables |
|---|---|
| **Identity & Access** | `tenants`, `users`, `user_sessions`, `invitations` |
| **Lead Management** | `leads`, `lead_activities`, `lead_tags`, `lead_assignment_rules` |
| **Communication** | `calls`, `call_recordings`, `whatsapp_messages`, `email_logs` |
| **Integrations** | `campaigns`, `integrations`, `webhook_events` |
| **System** | `audit_logs`, `notifications`, `tenant_settings` |

## 3. Migration Guidelines (Prisma-specific)
- Use standard Prisma migrations (`npx prisma migrate dev`).
- For enum changes, PostgreSQL requires manual SQL if dropping values, but Prisma handles additions well.
- **RLS (Row Level Security)**: While Prisma doesn't natively enforce PostgreSQL RLS, we can optionally enable RLS on the DB level using `tenant_id` and passing the session via Prisma Client Extensions, but for MVP, application-level isolation (passing `tenantId` to every query) is sufficient and faster to implement.

## 4. Indexing Strategy Overview
- **Prefix Rule**: Every index on a tenant-specific table MUST start with `tenant_id`. 
  - Example: `@@index([tenant_id, email])`
- **Lookup Fields**: Index `phone`, `email`, `source_id` on `leads` to prevent slow deduplication queries.
- **Sorting**: Index `created_at` (DESC) on `lead_activities` and `audit_logs`.

## 5. Data Retention and Archival Policy
- **Webhook Events**: Delete `PROCESSED` events older than 30 days to save space.
- **Audit Logs**: Retain for 12 months, then export to S3 (Cold Storage) and purge from DB.
- **Lead Activities**: Keep indefinitely for active leads. For `LOST` leads older than 2 years, compress payload or move to cold storage if DB size exceeds thresholds.
- **Call Recordings**: Use S3 lifecycle policies to transition to Glacier after 90 days.
