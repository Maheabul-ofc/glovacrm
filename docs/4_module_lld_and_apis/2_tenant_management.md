# GlovaCRM — Tenant & Super Admin Module LLD / API Design

**Version:** 1.0  
**Module:** Tenant & Super Admin Management  
**Backend:** Node.js + Express + TypeScript + PostgreSQL  
**Architecture:** Modular Monolith  
**API Base Paths:** `/api/super-admin`, `/api/tenant`

---

## 1. Purpose

This module handles platform-wide management (Super Admin) and organizational configuration (Tenant Admin).
- **Super Admin APIs** are used by the platform owners to manage onboarded businesses, view global metrics, and control billing/suspensions.
- **Tenant APIs** are used by a business owner (Tenant Admin) to configure their CRM, manage their team (Telecallers), and customize pipelines and lead fields.

---

## 2. Super Admin Endpoints

| Method | Endpoint | Auth Required | Description |
|---|---|---:|---|
| GET | `/api/super-admin/tenants` | Super Admin | List all tenants with filters (status, creation date). |
| POST | `/api/super-admin/tenants` | Super Admin | Manually create a tenant. |
| PATCH | `/api/super-admin/tenants/:id` | Super Admin | Update tenant status (e.g., suspend). |
| GET | `/api/super-admin/tenants/:id/stats` | Super Admin | View specific tenant usage stats. |
| GET | `/api/super-admin/dashboard` | Super Admin | Platform-wide metrics. |

### Super Admin Example: `GET /api/super-admin/tenants`

#### Response
```json
{
  "success": true,
  "data": {
    "tenants": [
      {
        "id": "tenant_1",
        "name": "Acme Corp",
        "status": "ACTIVE",
        "createdAt": "2026-08-01T10:00:00Z",
        "userCount": 5
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 10 }
  }
}
```

---

## 3. Tenant Admin Endpoints

| Method | Endpoint | Auth Required | Description |
|---|---|---:|---|
| GET | `/api/tenant/settings` | Tenant Admin | View tenant organization profile. |
| PATCH | `/api/tenant/settings` | Tenant Admin | Update profile, logo, timezone. |
| GET | `/api/tenant/team` | Tenant Admin | List all team members. |
| POST | `/api/tenant/team/invite` | Tenant Admin | Invite a new telecaller. |
| PATCH | `/api/tenant/team/:id/role` | Tenant Admin | Change team member role. |
| DELETE | `/api/tenant/team/:id` | Tenant Admin | Remove team member. |
| GET | `/api/tenant/pipeline-stages` | Tenant Admin | List configured sales pipeline stages. |
| POST | `/api/tenant/pipeline-stages` | Tenant Admin | Create a new pipeline stage. |
| PATCH | `/api/tenant/pipeline-stages/:id`| Tenant Admin | Reorder or rename pipeline stage. |
| GET | `/api/tenant/custom-fields` | Tenant Admin | List custom fields for leads. |
| POST | `/api/tenant/custom-fields` | Tenant Admin | Add a custom field to the CRM. |

### Tenant Example: `POST /api/tenant/team/invite`

#### Request Body
```json
{
  "email": "caller1@acme.com",
  "role": "TELECALLER",
  "firstName": "Alice"
}
```

#### Response
```json
{
  "success": true,
  "message": "Invite sent successfully."
}
```

---

## 4. Multi-tenancy Design

All tenant data in the PostgreSQL database contains a `tenant_id` column. Prisma middlewares or service layer functions MUST append `where: { tenantId: req.user.tenantId }` to every query to ensure strict data isolation.
