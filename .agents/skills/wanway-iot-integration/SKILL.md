---
name: wanway-iot-integration
description: |
  Comprehensive integration guide and technical API specification for WanWay / IOPGPS IoT tracking devices.
  Use when connecting physical WanWay GPS tracker hardware (e.g. GM06, EV02, S20, G19, etc.) to the Moveet/Duro EV fleet,
  calculating MD5 authentication signatures, fetching live GPS telemetry and battery status, binding IMEIs to scooters,
  and dispatching remote relay cut-off (immobilizer/anti-theft) instructions.
license: Proprietary
metadata:
  version: v1.0.0
  publisher: duro-ev
---

# WanWay / IOPGPS IoT Device Integration Skill

This skill documents the complete API specification, authentication mechanics, device correlation model, and administrative workflows for integrating **WanWay / IOPGPS IoT tracking hardware** into the Duro EV (Moveet) platform.

---

## 1. Vendor Overview & Key Credentials

- **Vendor / Platform:** WanWay GPS Open API / IOPGPS Platform
- **API Domain:** `https://www.iopgps.com` (Documentation: `https://docs.iopgps.com/doc/view?api=iop`)
- **App Key / App Secret (Login Secret Key):** `e0rwr41zkgw2sth3j8z5uasmvy97epl2`
- **Default Account / App ID:** Configured in environment variables (`WANWAY_APP_ID`, `WANWAY_APP_KEY`)
- **Encoding & Wire Format:** UTF-8, JSON (`Content-Type: application/json`)
- **Coordinate System:** WGS-84 (`wgs84ll` / EPSG:4326 standard GPS coordinates)
- **Time Representation:** Unix timestamp in seconds

---

## 2. Authentication & Dynamic Signature Algorithm

WanWay utilizes a two-tier MD5 hashing signature with a 2-hour token lifespan (`expiresIn: 7200000` ms).

### 2.1 Signature Formula
$$\text{signature} = \text{MD5}(\text{MD5}(\text{AppSecret}) + \text{timestampInSeconds})$$

Both MD5 operations MUST produce **32-character lowercase hexadecimal** strings.

### 2.2 NodeJS / JavaScript Implementation
```javascript
const crypto = require('crypto');

function md5(str) {
  return crypto.createHash('md5').update(str, 'utf8').digest('hex').toLowerCase();
}

function generateSignature(appSecret, timestampInSeconds) {
  const innerHash = md5(appSecret);
  return md5(innerHash + timestampInSeconds);
}
```

### 2.3 Token Acquisition Request
- **Endpoint:** `POST https://www.iopgps.com/auth`
- **Body:**
```json
{
  "appid": "YOUR_ACCOUNT_NAME",
  "time": 1773639233,
  "signature": "b4cf9cfde3b55b04e7e24b48a670e064"
}
```
- **Response:**
```json
{
  "code": 0,
  "expiresIn": 7200000,
  "accessToken": "228b79256f164e549b4b771900f59523"
}
```

---

## 3. Core API Endpoints Reference

### 3.1 Device Status & Real-time Telemetry
- **Endpoint:** `GET https://www.iopgps.com/device/status?accessToken={token}&imei={imeis}`
- **Parameters:**
  - `imei`: Comma-separated IMEIs (up to 50 devices per query batch)
- **Key Response Fields:**
  - `imei`: Device IMEI (e.g., `864296100067197`)
  - `lat`, `lng`: Latitude & Longitude in WGS-84
  - `speed`: Current speed in km/h
  - `course`: Heading (0 to 360 degrees clockwise from North)
  - `accStatus`: Ignition status (`true` = ACC ON, `false` = ACC OFF)
  - `status`: State description (`static`, `moving`, `sleep`, `inactive`, `offline`)
  - `chargePercentage`: Internal/battery power (0 to 100%)
  - `extVoltage`: External vehicle battery voltage in units of 0.1V (e.g., `750` = 75.0V)
  - `gpsTime`: Unix timestamp of GPS fix
  - `signalTime`: Unix timestamp of last communication

### 3.2 Single Device Real-time Location
- **Endpoint:** `GET https://www.iopgps.com/device/location?accessToken={token}&imei={imei}`

### 3.3 Remote Relay Control (Immobilizer / Anti-Theft Lock)
- **Endpoint:** `POST https://www.iopgps.com/instruction/relay?accessToken={token}`
- **Body:**
```json
{
  "parameter": "1", // "1": Restore electricity/fuel (UNLOCK), "2": Cut off electricity/fuel (LOCK/IMMOBILIZE), "3": Query relay status
  "imeis": ["864296100067197"]
}
```
- **Response:**
```json
{
  "code": 0,
  "details": [
    {
      "code": 0,
      "uuid": 263,
      "imei": "864296100067197"
    }
  ]
}
```

### 3.4 Check Relay Command Execution Status
- **Endpoint:** `GET https://www.iopgps.com/instruction/relay?accessToken={token}&uuid={uuid}`
- **Response:**
```json
{
  "code": 0,
  "details": [
    {
      "code": 0,
      "uuid": "263",
      "status": 1, // 1: Executed successfully, 0: No response / Pending
      "response": "Cut off the fuel supply: Success! Speed:0 km/h"
    }
  ]
}
```

### 3.5 Device Alarms & Geofence Notifications
- **Endpoint:** `GET https://www.iopgps.com/device/alarm?accessToken={token}&imei={imei}&startTime={start}&endTime={end}`
- **Alarms Supported:**
  - `REMOVE`: Tamper / light sensor / power disconnected / unplugged
  - `LOWVOT`: Low battery voltage
  - `FENCEIN` / `FENCEOUT`: Geofence ingress / egress
  - `CRASH`: Collision detected
  - `SHAKE`: Vibration / shock detected while parked
  - `OVERSPEED`: Vehicle exceeded speed limit
  - `SOS`: Emergency SOS button triggered

---

## 4. Platform Architecture & Data Correlation Model

### 4.1 How IoT Devices Correlate to Scooters and Users

```
+---------------+           +---------------+           +---------------+
|   IoT Device  |           |    Scooter    |           |     User      |
|  (WanWay GPS) |           |  (Moveet DB)  |           |  (Customer)   |
+---------------+           +---------------+           +---------------+
| imei (Unique) | <=======> | iotImei       |           | id            |
| simCardNo     |           | id (UUID)     |           | phone         |
| protocol      |           | qrCode        |           | kycStatus     |
| status        |           | status        | <=======> | activePlanId  |
| battery, lat  |           | assignedRide  |  (Active  | depositPaid   |
+---------------+           +---------------+   Ride)   +---------------+
```

1. **Physical Device to Vehicle Binding (1:1):**
   - The IoT device's 15-digit **`imei`** is stored on the `Scooter` table as a unique column `iotImei`.
   - The physical scooter also has a QR code (and/or VIN/Chassis number) stuck on its handlebar and battery bay.
   - At warehouse commissioning, the depot technician scans the scooter QR code and inputs/scans the WanWay GPS tracker's IMEI barcode.

2. **Vehicle to Customer Allocation (1:1 during active rental):**
   - The customer requests an allocation via mobile app.
   - The depot operator approves the handover in the Admin Portal.
   - Duro EV backend creates an active `Ride` linking `userId` to `scooterId`.
   - The backend sends an unlock instruction:
     - In **Simulator Mode**: calls `iot-backend /command/:id/unlock`.
     - In **Live Hardware Mode**: calls WanWay API `POST /instruction/relay` with `parameter: "1"` (power-on).

3. **Telemetry Ingestion & Sync Pipeline:**
   - A scheduled background cron or worker in `moveet-backend` polls WanWay `GET /device/status` every 10–15 seconds for all active IMEIs.
   - It updates `scooter.latitude`, `scooter.longitude`, `scooter.battery`, and last heartbeat in Supabase PostgreSQL.
   - If an alarm is reported (`REMOVE`, `CRASH`, `LOWVOT`), an automated security alert is pushed to the Admin dashboard and operations WhatsApp/SMS.

---

## 5. Admin Panel Management UX

To manage IoT device connections effortlessly without manual DB queries:

1. **Fleet Management Table / Add Scooter Modal:**
   - Add an **IoT Device IMEI** field in the *Add Scooter* and *Edit Scooter* modals.
   - Add an **IoT Hardware Status Badge** in the scooter table (`Simulated` vs `Hardware Online` vs `Hardware Offline`).
2. **Device Diagnostic Drawer:**
   - Displays real-time satellite fix (`GPS` / `LBS` / `WiFi`), external voltage, GSM signal strength, and relay state.
   - One-click diagnostic buttons: **"Ping Hardware"**, **"Immobilize (Cut Power)"**, and **"Restore Power"**.
3. **QR / Barcode Scanner Support:**
   - Enable camera scanning in the admin mobile/web view to scan both the vehicle QR code and the IoT tracker IMEI barcode in succession for instant 5-second pairing.

---

## 6. Adapter Pattern Implementation Strategy

To allow seamless switching between the Render simulator and the live WanWay hardware without code breakage, the backend uses an **IoT Adapter Interface**:

```
                       +-------------------+
                       |   IotClient.js    |
                       +-------------------+
                                 |
                 +---------------+---------------+
                 |                               |
                 v                               v
    +-------------------------+     +-------------------------+
    |    SimulatorAdapter     |     |      WanWayAdapter      |
    |  (Render / Local Mock)  |     |   (IOPGPS Open API v3)  |
    +-------------------------+     +-------------------------+
```

Toggle controlled via environment variable:
```env
IOT_PROVIDER=wanway          # or 'simulator'
WANWAY_BASE_URL=https://www.iopgps.com
WANWAY_APP_ID=YOUR_APP_ID
WANWAY_APP_KEY=e0rwr41zkgw2sth3j8z5uasmvy97epl2
```
