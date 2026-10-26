# GlovaCRM — Webhook & Integration Module LLD / API Design

**Version:** 1.0  
**Module:** Webhook Ingestion & Integrations  
**Backend:** Node.js + Express + BullMQ + Redis  
**API Base Paths:** `/api/webhooks`, `/api/integrations`

---

## 1. Purpose

The Webhook module ingests leads from various external sources, standardizes the payload, and pushes them into the main CRM Lead pipeline. It features background workers for reliable, idempotent processing.

Integrations supported: Meta Lead Ads, Google Ads, IndiaMART, JustDial, 99acres, MagicBricks, Sulekha, and Generic Webhooks.

---

## 2. Ingestion Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/webhooks/meta` | Webhook verification challenge for Meta Graph API. |
| POST | `/api/webhooks/meta` | Receive lead payloads from Facebook/Instagram. |
| POST | `/api/webhooks/google-ads` | Receive lead forms from Google Ads. |
| POST | `/api/webhooks/indiamart` | IndiaMART push API listener. |
| POST | `/api/webhooks/justdial` | JustDial listener. |
| POST | `/api/webhooks/generic/:integrationId` | Generic webhook listener for custom tools (Zapier, Make). |

---

## 3. Integration Management Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/integrations` | Tenant Admin | List connected integrations. |
| POST | `/api/integrations` | Tenant Admin | Connect new integration (generate keys/OAuth). |
| PATCH | `/api/integrations/:id`| Tenant Admin | Update credentials or settings. |
| DELETE | `/api/integrations/:id`| Tenant Admin | Disconnect integration. |
| POST | `/api/integrations/:id/test`| Tenant Admin | Send a test payload to verify setup. |

---

## 4. Worker Pipeline LLD

Since webhook ingestion needs to be highly reliable and fast:
1. **API Layer**: Receives payload, validates signature (e.g., Meta App Secret proof), pushes raw payload to a Redis/BullMQ queue `incoming_webhooks`, and responds `200 OK` immediately.
2. **Worker Layer**:
   - **Idempotency Check**: Uses external lead ID (e.g., Meta `leadgen_id`) to ensure the lead isn't processed twice.
   - **Normalization**: Maps diverse vendor payloads (e.g., Meta's field data arrays vs IndiaMART's flat JSON) into a standard GlovaCRM Lead schema.
   - **Deduplication**: Checks DB for existing phone/email.
   - **Assignment**: Triggers Round-Robin assignment logic.
   - **Persistence**: Saves to database and triggers "New Lead" notifications.

---

## 5. Security & Verification

- **Meta Signature Verification**: Payload is verified using `x-hub-signature-256` header comparing HMAC-SHA256 hash using the App Secret.
- **Generic Webhook Security**: Path parameter `integrationId` acts as a unique, unguessable token (e.g., UUIDv4) mapped to a specific tenant and source.
