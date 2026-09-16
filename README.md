# ESP32 Biometric Door Lock Backend & Admin Web Console

High-performance Node.js/Express and PostgreSQL backend with a modern, responsive Dark Cyber Admin Console for ESP32-based biometric door locks (R307/AS608 optical fingerprint sensors).

---

## 🚀 Live System Architecture

- **Backend**: Express + Node.js (with built-in rate-limiting, secure HTTP-only session JWT cookies, PostgreSQL connection pool).
- **Database**: PostgreSQL (Render Postgres, Neon, or Supabase). Automatically executes schema migrations and seeds default room `FUN_LAB`.
- **Frontend**: React + Vite single-page dashboard built into `client/dist` and served statically by Express under a single deployable Render Web Service.

---

## 📡 Device-Facing Contract (Firmware Unchanged)

### 1) Fingerprint Log Scan
When a valid fingerprint scan occurs, your ESP32 issues:
```http
GET /log?id=17&date=2026-09-15&time=14:32:07&dir=FUN_LAB&key=YOUR_DEVICE_SECRET
```
- **Auth**: Validates `key` against `devices.secret_key`.
- **Response**: HTTP `200 OK` with text body `OK`.
- **Effect**: Records event in `access_logs` and links to enrolled users automatically.

### 2) Remote Unlock Polling
ESP32 polls every 0.5s – 2.0s:
```http
GET /check-unlock?key=YOUR_DEVICE_SECRET
```
- **Auth**: Validates `key` against `devices.secret_key`.
- **Response**:
  - If unlock command pending: HTTP `200 OK`, `Content-Type: text/plain`, payload: **`true`**
  - If no command: HTTP `200 OK`, `Content-Type: text/plain`, payload: **`false`**
- **Firmware Safety**:
  - The response payload is pure plain text `"true"` or `"false"`.
  - Your firmware checks `payload.indexOf("true") >= 0`. Since `"false"` does not contain `"true"`, it only triggers when an unlock command was dispatched.
  - The pending command row in `unlock_commands` is **consumed atomically** using `FOR UPDATE SKIP LOCKED`, so the lock only triggers once.

---

## 💻 Arduino / ESP32 Firmware Constants

In your ESP32 Arduino sketch, update the server constants:

```cpp
// Replace with your Render URL (or http://192.168.x.x:5000 if testing on local LAN):
const char* server_base = "https://your-service.onrender.com";
const char* device_key  = "dev_secret_funlab_12345";
const char* room_name   = "FUN_LAB";

// 1) On Fingerprint Scan:
String logUrl = String(server_base) + "/log?id=" + String(fingerprintID) +
                "&date=" + dateStr + "&time=" + timeStr +
                "&dir=" + room_name + "&key=" + device_key;
// http.begin(logUrl);
// int httpCode = http.GET();

// 2) On Unlock Polling (every 0.5 - 2s):
String pollUrl = String(server_base) + "/check-unlock?key=" + device_key;
// http.begin(pollUrl);
// int httpCode = http.GET();
// String payload = http.getString();
// if (payload.indexOf("true") >= 0) {
//     unlockDoor();
// }
```

---

## 🛠️ Local Development & Running

1. **Install dependencies**:
   ```bash
   npm install
   npm run build
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

3. **Open Console in Browser**:
   Navigate to [http://localhost:5000](http://localhost:5000)
   - **Default Username**: `admin`
   - **Default Password**: `admin123`

4. **Run Automated Test Suite**:
   ```bash
   npm test
   ```

---

## ☁️ Deploying on Render

### Option A: Using `render.yaml` (Blueprint)
1. Push this repository to GitHub.
2. Go to **Render Dashboard** -> **Blueprints** -> **New Blueprint Instance**.
3. Connect your repository. Render will automatically provision both the Web Service and PostgreSQL database.

### Option B: Free Tier with Neon Postgres
1. Create a free serverless database on [neon.tech](https://neon.tech) and copy the connection string.
2. In Render, create a **New Web Service**:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment Variables:
     - `DATABASE_URL`: Your Neon connection string (with `?sslmode=require`)
     - `ADMIN_USERNAME`: `admin`
     - `ADMIN_PASSWORD`: Your secure password
     - `JWT_SECRET`: Random 32+ character string
