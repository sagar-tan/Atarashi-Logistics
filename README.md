# Atarashi Logistics

India-first parcel delivery platform: customer and driver mobile apps, an operations admin panel, and a TypeScript API.

## Workspace

- `apps/customer` — Expo / React Native customer app
- `apps/driver` — Expo / React Native driver app
- `apps/admin` — React + Vite operations panel
- `apps/api` — Fastify API, deployable as a container to Render and later Cloud Run
- `packages/domain` — shared domain types and validation
- `supabase/migrations` — versioned database schema and access policies

## Getting started

1. Install Node.js 22.11 or newer.
2. Copy `.env.example` to `.env` and fill in the local Supabase project values.
3. Run `npm install` at the repository root.
4. Start an app with `npm run dev:customer`, `npm run dev:driver`, `npm run dev:admin`, or `npm run dev:api`.
5. Run tests and typechecks with `npm test`, `npm run typecheck`, and `npm run lint`.

Expo apps use Expo SDK 58 and Expo Router. Use development builds for native features such as maps and background location.

## Supabase

Apply migrations with the Supabase CLI after linking or starting a local project. Exposed tables have RLS enabled. Booking lifecycle mutations and privileged integrations belong in the API; never put the Supabase secret key in a mobile or web client.

## Deployment

The API listens on `0.0.0.0:$PORT` and exposes `/health` for Render and Cloud Run health checks. Configure server secrets in the hosting provider, not in committed files.
