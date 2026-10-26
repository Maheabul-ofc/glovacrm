# GlovaCRM — Communication Module LLD / API Design

**Version:** 1.0  
**Module:** Communication (Telephony & WhatsApp)  
**Backend:** Node.js + Express + Third-party SDKs  
**API Base Paths:** `/api/calls`, `/api/whatsapp`

---

## 1. Purpose

The Communication module abstracts the interactions with Telephony providers (Exotel, Twilio) and WhatsApp Cloud API, allowing telecallers to initiate communications directly from the CRM and tracking conversation history.

---

## 2. Telephony APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/calls/initiate` | Click-to-dial. Instructs provider to bridge a call between telecaller and lead. |
| POST | `/api/calls/:id/log` | Manual fallback to log a call if integration fails or is not used. |
| GET | `/api/calls` | Call history with filters (missed, connected, date range). |
| GET | `/api/calls/:id/recording` | Stream or redirect to call recording audio file. |
| POST | `/api/webhooks/calls/status` | Webhook from provider (ringing, answered, completed) to update DB. |

### Telephony Provider Abstraction

An Interface pattern is used to support multiple providers (critical for India market vs Global market):
```typescript
interface ITelephonyProvider {
  initiateCall(agentNumber: string, customerNumber: string): Promise<CallResult>;
  fetchRecording(callId: string): Promise<string>;
}
// Implementations: ExotelAdapter, TwilioAdapter
```

---

## 3. WhatsApp APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/whatsapp/send` | Send an approved template message. |
| POST | `/api/whatsapp/send-text` | Send a free-form text message (requires active 24-hr session window). |
| GET | `/api/whatsapp/conversations/:leadId`| Fetch chat history for a specific lead. |
| GET | `/api/whatsapp/templates` | Fetch approved Meta WhatsApp templates. |
| POST | `/api/webhooks/whatsapp` | Meta Webhook for incoming messages and message delivery status. |

### WhatsApp Cloud Integration Notes
- Sent and received messages are stored in a `whatsapp_messages` table.
- Incoming webhook events are pushed to BullMQ for asynchronous processing to prevent timeout.
- Notification module is triggered on incoming user replies.
