# AGENTS.md - Atarashi EcoCharge

## Purpose
- This file guides coding agents working on **Atarashi EcoCharge** (EV Charging Station Management Platform).
- Maintain repository conventions, design system, and error-handling standards across the mobile app, backend, and station IoT/OCPP integrations.

## Tech Stack
- **Backend**: Node.js / Express with Prisma ORM + PostgreSQL (Supabase with connection pooling, hosted on Render) and Socket.IO for live station telemetry.
- **Mobile**: React Native / Expo with TypeScript, Zustand state management, and Expo Router.
- **Protocol & IoT**: OCPP 1.6-J / 2.0.1 for EVSE (Electric Vehicle Supply Equipment) charger communication, plus WanWay / GPS tracker support for mobile EV service vans.
- **Visual Direction**: Strictly **Neomorphic Light Mode**. Primary palette is clean white (`#FFFFFF`), soft chalk canvas (`#F4F7F4`), and vibrant light mint green (`#6EE787` / `#5EDB79`) with high-contrast rich charcoal text (`#111813`). All glassmorphism (`GlassView`, blur, dark transparency) is strictly eliminated in favor of soft-extruded neomorphic shadows, capsule pill buttons, floating circular shapes, and clear tactile visual hierarchy.

## Repository Layout
- `ecocharge-frontend/`: Expo React Native EV driver app (station discovery, QR scan to charge, live kWh meter, wallet billing).
- `ecocharge-backend/`: Node.js/Express production backend (Prisma, PostgreSQL, station registry, OCPP transaction engine, Razorpay payments, MSG91 OTP).
- `admin-panel/website/`: React + TypeScript Neomorphic Admin Web Portal for CPO / Society RWA / Station Hosts (live fleet telemetry, dynamic charger onboarding, remote OCPP controls, revenue analytics).
- `admin-panel/mobile/`: Expo React Native Admin & Field Technician App (mobile charger diagnostics, on-site QR provisioning, live socket health inspection).
- `.agents/rules/`: Agent behavioral rules and mandatory step-logging protocols.
- `.agents/skills/`: Domain skills suite (EV Charging hardware, OCPP 1.6-J, WanWay GPS, React Native architecture, Neomorphic UI, Node.js backend, PostgreSQL, and Antigravity Skills Manager).
- `scripts/skills_cli.py`: Unified skills discovery, search, installation, and update CLI manager with local catalog (`scripts/catalog.json`).

## Engineering Rules & Standards
1. **API Envelope**: All responses MUST follow the standard envelope:
   `{ success: boolean, data?: any, message?: string }` via `ApiResponse.js`.
2. **Database Singletons**: Always import the shared Prisma client from `src/utils/prisma.js` (never create `new PrismaClient()` inside request routes).
3. **Mobile Resilience**: Use `AppState` listeners to pause polling when the app is backgrounded to protect client battery and cloud infrastructure quotas.
4. **Sound Typing**: Frontend TypeScript runs in `strict` mode. Use explicit interfaces for stations, connectors, and charging sessions.
5. **Mandatory Step Logging**: Every agent step, request, goal, and changes done must be logged with timestamps in `NEW_Features.md` in the root folder.
6. **Self-Documenting Code & Persistent Comments**:
   - Every source code file MUST begin with a structured header describing: File Purpose, Architecture Context, Key Exports, and Upstream/Downstream Dependencies.
   - Core functional blocks, state mutations, and API requests MUST have concise inline comments explaining the *rationale* and edge cases.
   - Any agent performing modifications or refactoring MUST preserve and update these comments so subsequent agents have complete architectural clarity.
7. **Single-Endpoint OCPP WebSocket Architecture**:
   - All physical field chargers connect to one central CSMS WebSocket endpoint (`/steve/websocket/CentralSystemService` or `/ocpp`).
   - Chargers are dynamically multiplexed by their serial numbers / `chargePointId` in memory and PostgreSQL. Never generate per-charger webhook routes.
8. **Neomorphic Design Uniformity**:
   - Both driver and admin platforms adhere strictly to Neomorphic Light Mode (`#FFFFFF` surfaces, `#F4F7F4` canvas, `#6EE787` mint accents, dual soft shadows). Zero glassmorphism.
9. **Infrastructure Change Synchronization**:
   - If backend endpoints, cloud database URLs, or WebSocket routes change, coding agents MUST synchronously update `AGENTS.md`, `ecocharge-frontend/.env.example`, and `.agents/skills/mobile-dev-and-deployment/SKILL.md`.

## Canonical Cloud Infrastructure & Endpoints
- **Live Production Backend URL**: `https://atarashi-ecocharge.onrender.com`
- **OCPP 1.6-J CSMS WebSocket Server URL**:
  - Primary Steve URL: `wss://atarashi-ecocharge.onrender.com/steve/websocket/CentralSystemService`
  - Secondary OCPP Route: `wss://atarashi-ecocharge.onrender.com/ocpp`
  *(Both routes dynamically multiplex all field chargers via serial number handshake; no per-charger URLs required).*
- **Database**: Supabase PostgreSQL (`ap-south-1`, pooled connection on Render).
- **Live Telemetry Socket.IO**: `https://atarashi-ecocharge.onrender.com`

## Operating Runbook: Physical Android Device Workflow
When running or testing the app on a USB-connected phone (including Hotspot setups):
1. **Verify ADB**: `adb devices` (confirm device authorized).
2. **Setup Reverse Socket**: `adb reverse tcp:8081 tcp:8081`.
3. **One-Command Build & Run**: From repository root run `.\mobile.bat run` (or `.\build.bat run`), or from `ecocharge-frontend/`:
   ```powershell
   npm run android:device
   ```
   *(This embeds the bundle into `android/app/src/main/assets/index.android.bundle` to prevent hotspot firewall dropouts, runs `gradlew installDebug`, sets up adb reverse, and launches MainActivity).*
4. **Interactive CLI Menu**: From root run `.\mobile.bat` for building release APKs, app bundles (`.aab`), clean builds, or device commands.
5. **Inspect Screen**: `npm run android:screencap` or `.\mobile.bat screencap` (pulls `screen.png` for instant verification).
6. **Open In-App Dev Menu**: `npm run android:menu` (sends Keyevent 82).
7. **Detailed SOP Reference**: See [`.agents/skills/mobile-dev-and-deployment/SKILL.md`](file:///c:/Users/tw_strat/Atarashi%20EcoCharge/.agents/skills/mobile-dev-and-deployment/SKILL.md).


