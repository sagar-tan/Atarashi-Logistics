---
trigger: always_on
---

# Atarashi Logistics - Agent Rules & Architecture Protocol

## 1. Non-Negotiable Step Logging
Every step you do MUST BE COMMITTED IN AN MD FILE:
- What was the user request
- What was the specific goal
- What were the exact changes done with timestamps (IST)
**Log each entry into `NEW_Features.md` in the root folder.** Never skip this under any circumstances.

---

## 2. Project Architecture & Workspace Layout
Atarashi Logistics is an India-first parcel delivery platform modeled on a ride-hailing dispatch flow (customer books pickup & delivery, nearby driver accepts, tracked through delivery lifecycle).

| Path | Description | Tech Stack |
| --- | --- | --- |
| `apps/customer` | Customer mobile app | Expo SDK 58, Expo Router, React Native 0.88 (`com.atarashi.customer`) |
| `apps/driver` | Driver mobile app | Expo SDK 58, Expo Router, React Native 0.88 (`com.atarashi.driver`) |
| `apps/admin` | Operations console | React 19 + Vite |
| `apps/api` | Backend API | Fastify 5, TypeScript |
| `packages/domain` | Shared validation & types | Zod (`@atarashi/domain`) |
| `supabase/` | Database & migrations | PostgreSQL 17 + PostGIS (4326), RLS enabled |

---

## 3. Financial & Domain Invariants
1. **Strict Currency Rule**:
   - **All monetary values MUST be stored as integer PAISE** (`100 paise = ₹1.00`).
   - Never store or calculate money as raw floating-point rupees in database columns or API payloads (`price_per_km_paise`, `minimum_fare_paise`, `fare_paise`, `amount_paise`).
2. **Vehicle Types**:
   - Strictly `bike`, `auto`, `car`, `pickup`.
3. **Booking Lifecycle**:
   - `pending` -> `assigned` -> `picked_up` -> `in_transit` -> `completed` (or `cancelled` / `timed_out`).
4. **Payment Options**:
   - `cash`, `online`, `wallet`.

---

## 4. Security & Privilege Boundaries
1. **Server-Authoritative Mutations**:
   - Booking state transitions, pricing calculations, driver assignments, and wallet balance credits belong exclusively in `apps/api` using the Supabase Service Role Key.
   - Client applications (`apps/customer`, `apps/driver`, `apps/admin`) have read grants via RLS but must never directly write to sensitive tables like `bookings` or `wallet_ledger`.
2. **Secret Management**:
   - `SUPABASE_SECRET_KEY` and payment provider secrets must NEVER be placed in mobile or web client bundles.
   - Mobile and admin apps use `EXPO_PUBLIC_*` or `VITE_*` publishable keys only.

---

## 5. Mobile Native & Emulator Testing Protocol
1. **Continuous Native Generation**:
   - Never hand-edit files in `apps/*/android/` or `apps/*/ios/` directly unless strictly necessary. Configure native behavior via `app.json` and Expo config plugins.
   - Native dependencies must be installed with `npx expo install <package>` to guarantee compatibility with Expo SDK 58.
2. **Android Studio Emulator & Physical Device Testing**:
   - Test execution is conducted via ADB (`adb devices`, `adb reverse tcp:8081 tcp:8081`).
   - Interact with the app autonomously using `adb shell input tap/swipe/text/keyevent` and UI layout inspection using `adb shell uiautomator dump`.
   - Visually verify screen rendering using `adb exec-out screencap -p > screen.png` and multimodal inspection.
3. **Verification**:
   - Always run `npm run typecheck` across workspaces before declaring a task complete.

---

## 6. Design System Protocol
- Strict **Neomorphic Light Mode**:
  - Canvas: Chalk `#F4F7F4`
  - Cards: Elevated pure white `#FFFFFF` with dual soft drop-shadows
  - Accent: Vibrant light mint green (`#6EE787` / `#5EDB79`)
  - Typography: High-contrast rich charcoal (`#111813`)
  - Geometry: Continuous capsule pill buttons (`borderRadius: 9999`)
  - Zero glassmorphism (`GlassView`, translucent blur backdrops are strictly prohibited).
