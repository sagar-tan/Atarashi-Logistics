# CLAUDE.md

Guidance for working in this repository. Read `README.md` for setup; this file holds the context that is not obvious from the code.

## What this project is

Atarashi Logistics is an India-first parcel delivery platform, modeled on a ride-hailing flow: a customer books a parcel pickup and delivery, a nearby driver accepts it, and the booking moves through a lifecycle until completion. Money is stored in paise (integer), and vehicle types are bike, auto, car, and pickup.

## Workspace layout

| Path | What it is | State |
| --- | --- | --- |
| `apps/customer` | Expo / React Native customer app (Expo SDK 58, Expo Router) | Home screen UI only, static |
| `apps/driver` | Expo / React Native driver app (Expo SDK 58, Expo Router) | Home screen UI only, online/offline toggle is local state |
| `apps/admin` | React 19 + Vite operations console | Static dashboard mockup with zero-value stats |
| `apps/api` | Fastify 5 TypeScript API, Docker image deployed to Render | `/health` and `/v1` only |
| `packages/domain` | Shared zod schemas and types (`@atarashi/domain`) | Enums, coordinates, health schema |
| `supabase/` | Supabase config and SQL migrations | One migration: initial schema |

npm workspaces at the root (`apps/*`, `packages/*`). Node 22.11+ is required (`engines`, `engine-strict=true`).

## Commands

```bash
npm install                 # from repo root
npm run dev:customer        # Expo dev server for the customer app
npm run dev:driver          # Expo dev server for the driver app
npm run dev:admin           # Vite dev server for the admin panel
npm run dev:api             # tsx watch on apps/api/src/server.ts
npm run build:admin
npm run build:api
npm run typecheck           # typecheck every workspace (admin, api, customer, driver)
npm test                    # run automated unit & API test suites (domain, api)
npm run lint                # oxlint across apps and packages
```

Per-app lint: `npx expo lint` (mobile), `npm run lint -w @atarashi/admin` (oxlint).
For Expo packages, always use `npx expo install <pkg>` so versions match SDK 58. Do not use `npm install <pkg>` for native Expo deps.

## Current implementation

**Database (`supabase/migrations/20261102000000_initial_platform_schema.sql`)**
- Extensions: PostGIS and pgcrypto, both in the `extensions` schema. Private helper schema `app_private`.
- Trigger `on_auth_user_created` copies new `auth.users` rows into `public.profiles`.
- Enums: `app_role` (customer, driver, admin, moderator), `vehicle_type`, `parcel_size`, `booking_status` (pending, assigned, picked_up, in_transit, completed, cancelled, timed_out), `payment_method` (cash, online, wallet), `payment_status`.
- Tables: `profiles`, `user_roles`, `vehicles`, `driver_status` (GiST index on live location), `vehicle_pricing` (per vehicle type; commission in basis points), `bookings` (pickup and dropoff geography points, fare fields in paise), `booking_events` (status audit trail), `wallet_ledger` (idempotency key, unique).
- RLS is enabled on every public table. Policies scope reads to the owning customer or driver. Customers can see assigned driver profiles and live location only while a booking is `assigned`, `picked_up`, or `in_transit`.
- Grants: authenticated users can only update `profiles.full_name` and `profiles.email`. Writes to bookings, wallet, and pricing have no client grant, so they belong in the API with the service key.
- `supabase/config.toml`: local stack, Postgres 17, auth site URL `http://localhost:8081`, phone (SMS) signup with confirmations enabled.

**API (`apps/api`)**
- `buildApp()` in `src/app.ts` returns a Fastify instance with `trustProxy: true`.
- Routes: `GET /health` (returns `{status: "ok", service: "atarashi-api"}`, validated with zod) and `GET /v1` (name and version).
- `src/server.ts` listens on `0.0.0.0:$PORT` (default 8080) and closes on SIGINT/SIGTERM.
- No booking, pricing, auth, or Supabase calls exist yet. `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are documented in `.env.example` but unused.
- Docker: multi-stage `apps/api/Dockerfile` on `node:22-alpine`. Render blueprint in `render.yaml` (`atarashi-api`, health check `/health`, auto-deploy).

**Mobile apps (`apps/customer`, `apps/driver`)**
- Root layout is a plain Expo Router `Stack`, headers hidden, background `#f7f8f5`.
- `src/lib/supabase.ts` creates a Supabase client with AsyncStorage session persistence and auto-refresh tied to app foreground state. It throws at startup if `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is missing.
- Both apps only render their home screen. No sign-in, booking flow, maps, or location yet. The customer home shows "Send a parcel" with no handler.
- Native features such as maps and background location need a development build, not Expo Go.
- Both apps have a shared `src/components` and `src/hooks` set copied from the Expo template, including a web variant of several files.

**Admin (`apps/admin`)**
- Single `App.tsx` with a static layout: sidebar, stat cards, activity and dispatch panels, and empty bookings table. All values are hard-coded zeros or placeholders.
- `src/lib/supabase.ts` creates a client only when `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set, otherwise exports `null`.

**Shared domain (`packages/domain`)**
- Zod enums for vehicle type, booking status, and parcel size, plus `coordinatesSchema` and `healthResponseSchema`.
- Hand-written `index.js` and `index.d.ts` side by side. Keep them in sync when changing schemas.

## Design and brand

- **Logo and identity:** from the Atarashi website (`C:\Users\tw_strat\Atarashi-Website`). Copies in `design/brand/`: `logo.png` (wordmark with "Group"), `emblem.png`, `app-icon-512.png`, `apple-icon-180.png`. The website is the Atarashi Group brand: primary red `#D9432B`, secondary amber `#F4A340`, dark `#111111`, light `#F4F1EC`, background `#FAF9F6`. Fonts are Manrope (body) and Plus Jakarta Sans (display).
- **App design direction:** the Atarashi EcoCharge mobile app (`C:\Users\tw_strat\Atarashi EcoCharge\ecocharge-frontend`). The full reference (tokens, shared components, screen patterns) is in `design/reference/ecocharge-mobile.md`. Summary: neomorphic light mode, canvas `#F4F7F4`, white cards, mint accent `#6EE787`, charcoal `#111813`, capsule buttons and floating tab bar, no glassmorphism. Its project-wide rules are in `design/reference/ecocharge/AGENTS.md`, and the emblem is in `design/reference/ecocharge/emblem.png`.
- **Applied in the mobile apps:** both home screens use the EcoCharge mint palette (tokens in `src/theme/theme.ts`, identical in `apps/customer` and `apps/driver`) with the Atarashi emblem in the header. Shared components: `src/components/ui/neomorph-card.tsx` and `pill-button.tsx`. Icons come from `lucide-react-native`. Keep the two copies in sync. The Atarashi Group red is not used in the apps.
- The Atarashi website's `atarashi-business-context` skill holds company facts. Use it for any copy and do not invent corporate details.

## Conventions and rules

- Never put the Supabase secret key (`SUPABASE_SECRET_KEY`) in a mobile or web client. Only publishable keys go in `EXPO_PUBLIC_*` and `VITE_*`.
- Booking lifecycle mutations and privileged integrations (payments, wallet, pricing changes) go through `apps/api`, not direct client writes.
- Every new public table needs RLS enabled and explicit policies. Use `(select auth.uid())` in policies for performance.
- Server secrets live in Render (and later Cloud Run), never in committed files. `.env` is gitignored; only `.env.example` is committed.
- Expo native config goes in `app.json` and config plugins. Never hand-edit `ios/` or `android/`.
- Expo docs: https://docs.expo.dev/llms.txt. Check the matching `expo` major version before using any Expo API, since SDK changes are frequent.
- Run lint and typecheck before calling a task done.
- **Change log (non-negotiable):** every step is recorded in `NEW_Features.md` at the repo root. Each entry has a timestamp (IST), the request, the goal, and the changes made. Append it as part of the step, never skip it.

## Known gaps and open questions

- The README mentions Cloud Run as a future target, but only Render is configured.
- `apps/admin` pins `typescript` `~7.0.2` while the mobile apps and root typecheck use `~6.0.3`. Confirm this is intended.
- `apps/customer` and `apps/driver` each have an `.claude/settings.json` that enables the `expo` plugin. Keep these in sync.
- The root is not a git repository yet.
