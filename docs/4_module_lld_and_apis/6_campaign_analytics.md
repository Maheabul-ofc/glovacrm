# GlovaCRM — Campaign & Analytics Module LLD / API Design

**Version:** 1.0  
**Module:** Campaign & Analytics  
**Backend:** Node.js + PostgreSQL (OLTP optimized queries)  
**API Base Paths:** `/api/campaigns`, `/api/analytics`

---

## 1. Purpose

This module handles proactive outreach efforts (Campaigns) and provides reporting and metrics (Analytics) for tenant admins to measure performance and ROI.

---

## 2. Campaign APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/campaigns` | Create a new manual or automated campaign. |
| GET | `/api/campaigns` | List campaigns with filters (status: draft, active, completed). |
| GET | `/api/campaigns/:id` | Campaign detail with aggregate lead stats. |
| PATCH | `/api/campaigns/:id` | Update campaign details or toggle status. |
| GET | `/api/campaigns/:id/leads` | Paginated list of leads associated with this campaign. |

---

## 3. Analytics APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/dashboard` | High-level metrics: total leads, conversions, open tasks. |
| GET | `/api/analytics/leads` | Lead pipeline funnel, lead status distribution, and source performance. |
| GET | `/api/analytics/calls` | Total talk time, connected vs missed calls, call volume over time. |
| GET | `/api/analytics/team` | Leaderboard: leads closed, calls made, talk time per telecaller. |
| GET | `/api/analytics/campaigns`| Campaign ROI, conversion rates per campaign. |

### Note on Analytics Queries

To prevent heavy analytical queries from slowing down the primary OLTP database, all endpoints accept robust `startDate` and `endDate` filters, and data is aggressively aggregated at the database level using SQL `GROUP BY` and window functions rather than in the Node.js process. In high-volume scenarios, a materialized view strategy or read-replica connection should be used.
