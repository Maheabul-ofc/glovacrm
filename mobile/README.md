# 📱 GlovaCRM Android Dialer & Auto-Duration Sync

Production-ready Android companion application for **GlovaCRM** with automatic call duration tracking, SIM telephony, and real-time Web-to-Phone calling sync (like TeleCRM).

---

## 🚀 How Automatic Duration Works (Android vs iOS)

| Feature | Android | iOS |
|---|---|---|
| **Mechanism** | Native Android OS Call Log API (`READ_CALL_LOG`) | Web/App Timer + Manual Confirmation |
| **Duration Source** | Telecom provider / OS call connection timestamp | Stopwatch timer / agent manual input |
| **User Input Needed** | **None (100% Automatic)** | Confirms duration on call end |
| **Cost** | **₹0 / $0 (Uses mobile SIM minutes)** | **₹0 / $0** |

---

## ⚡ Two Operating Modes

### 1. Direct In-App Calling (Telecaller on Mobile)
1. Telecaller logs into the GlovaCRM Dialer app on their Android phone.
2. Selects a lead and taps **"Call"**.
3. The app opens the native Android dialer and initiates the SIM call.
4. When the call ends and the agent returns to the app, the app immediately reads the Android Call Log.
5. The **exact duration** (e.g. 142 seconds) and status (`COMPLETED` or `MISSED`) are automatically recorded and synced to the CRM database.

### 2. Web Companion Mode (Telecaller on Laptop/PC)
1. Telecaller opens GlovaCRM on their desktop browser.
2. They click **"Call"** next to a lead.
3. The backend queues an initiated call with `provider: "ANDROID_APP"`.
4. The Android phone (running this app) detects the queued call via background sync.
5. The phone automatically prompts/opens the dialer for that lead.
6. Once the call finishes, the phone retrieves the exact duration from the call log and syncs it back to the backend.
7. The Web CRM UI immediately updates with the duration and call status!

---

## 📋 Required Android Permissions

The app configures the following permissions in `app.json`:
- `android.permission.READ_CALL_LOG`: To query call duration, status, and timestamp.
- `android.permission.READ_PHONE_STATE`: To detect incoming/outgoing call lifecycle changes.
- `android.permission.CALL_PHONE`: To trigger direct calls to leads.
- `android.permission.INTERNET`: To communicate with GlovaCRM backend API.

---

## 🛠️ Setup & Running

### Prerequisites
- Node.js 18+
- Android Device (or Android Studio Emulator)
- GlovaCRM Backend running on `http://<your-ip>:5000`

### Step 1: Install Dependencies
```bash
cd mobile
npm install
```

### Step 2: Configure Server URL
In `src/services/api.ts` or in the app's **Login / Settings** screen, point to your backend:
```typescript
const DEFAULT_BASE_URL = 'http://192.168.200.1:8090/api';
```
*(Tip: On Android physical devices, use your computer's local Wi-Fi IP e.g. `192.168.x.x`, not `localhost`)*.

### Step 3: Run the App
```bash
# Start Expo development server
npx expo start

# Run on connected Android device / emulator
npx expo run:android
```

### Step 4: Build Release APK
To create a standalone APK for telecallers:
```bash
npx eas build --platform android --profile preview
```
