# GlovaCRM — Lead Management Module LLD / API Design

**Version:** 1.0  
**Module:** Lead Management  
**Backend:** Node.js + Express + TypeScript + PostgreSQL  
**Architecture:** Modular Monolith  
**API Base Path:** `/api/leads`

---

## 1. Purpose

The Lead Management module is the core of the CRM. It allows for creating, viewing, managing, and tracking the lifecycle of sales prospects.

Key features include:
- Lead CRUD operations.
- Bulk import via CSV.
- Assigning leads to telecallers (Round-Robin or Manual).
- Tracking lead activities and notes.
- Tagging and categorizing leads.
- Deduplication and lead scoring.

---

## 2. Endpoint Summary

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/leads` | Create a single lead. |
| POST | `/api/leads/bulk` | Bulk import via CSV. |
| GET | `/api/leads` | List leads (paginated, filtered, searchable). |
| GET | `/api/leads/:id` | Get lead details and activity history. |
| PATCH | `/api/leads/:id` | Update lead fields (including custom fields). |
| PATCH | `/api/leads/:id/status` | Change lead stage/status. Creates an audit activity. |
| POST | `/api/leads/:id/assign` | Manually assign lead to a specific user. |
| POST | `/api/leads/:id/notes` | Add a note to the lead timeline. |
| GET | `/api/leads/:id/activities`| Fetch lead activity timeline. |
| POST | `/api/leads/:id/tags` | Add tag(s) to a lead. |
| DELETE | `/api/leads/:id/tags/:tagId` | Remove a tag. |
| POST | `/api/leads/merge` | Merge duplicate leads. |
| GET | `/api/leads/export` | Export leads as CSV. |
| GET | `/api/leads/stats` | Retrieve lead statistics (count by status, etc.). |

---

## 3. Algorithms & Strategies

### 3.1 Lead Assignment Algorithm
- **Round-Robin Assignment**: Active telecallers are placed in a queue. New incoming leads from integrations/webhooks are assigned to the next telecaller in the sequence. A Redis counter per tenant can be used to track the last assigned user index.
- **Load-Based Assignment**: Future enhancement to assign leads to the telecaller with the fewest open leads.

### 3.2 Lead Scoring Rules
- Leads are scored (0-100) based on configuration.
- Triggers: Valid email (+10), Valid phone (+10), Responded to call (+20).

### 3.3 Duplicate Detection Strategy
- Lookups based on exact match of `phone` or `email` within the same `tenant_id`.
- Duplicate leads can optionally be auto-merged or flagged for manual review based on tenant settings.

---

## 4. Example API

### `GET /api/leads`

#### Request Query
- `status`: "NEW"
- `assignedTo`: "user_123"
- `search`: "John"
- `page`: 1
- `limit`: 20

#### Response
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "id": "lead_99",
        "name": "John Smith",
        "phone": "+919876543210",
        "email": "john.s@example.com",
        "status": "NEW",
        "assignedTo": { "id": "user_123", "name": "Alice" },
        "createdAt": "2026-08-08T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 500,
      "page": 1,
      "limit": 20
    }
  }
}
```
