# GlovaCRM — Notification & Audit Module LLD / API Design

**Version:** 1.0  
**Module:** Notification & Audit Logging  
**Backend:** Node.js + PostgreSQL  
**API Base Paths:** `/api/notifications`, `/api/audit-logs`

---

## 1. Purpose

- **Notifications**: Delivers real-time and in-app alerts to users (e.g., Telecallers) about events requiring action.
- **Audit Logging**: Maintains an immutable trail of critical actions performed within the system for security and compliance.

---

## 2. Notification APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notifications` | List user's notifications (paginated). |
| PATCH | `/api/notifications/:id/read`| Mark specific notification as read. |
| PATCH | `/api/notifications/read-all`| Mark all notifications as read. |
| GET | `/api/notifications/preferences`| Get user settings for email/push/in-app alerts. |
| PATCH | `/api/notifications/preferences`| Update notification preferences. |

### Notification Triggers
- New lead assigned.
- Scheduled follow-up is due.
- Missed incoming call.
- Incoming WhatsApp reply.
- Lead status changed by another user.

---

## 3. Audit Log APIs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/audit-logs` | Tenant Admin | View audit logs with filters (actor, resource, action type). |

### Audited Actions
Audit logs record the `actor_id`, `action`, `resource_type`, `resource_id`, `timestamp`, and `ip_address`.
Examples of audited actions:
- User login / logout / failed login.
- Exporting leads (CSV export).
- Bulk deletion or modification of data.
- Changes to organizational settings or pipeline stages.
- Changes in user roles and permissions.

*Note: Regular lead updates are stored in the lead's activity timeline, whereas the audit log is intended for security and broad system changes.*
