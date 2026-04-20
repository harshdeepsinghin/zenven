# ZenVen

ZenVen is a smart fan experience and crowd intelligence platform for live venues. This repo ships a React + Vite fan/admin client, an Express + Socket.io real-time server, a Supabase schema migration, and a hardcoded demo stadium for hackathon-ready demos.

## Stack

- `client/` React 18, Vite, Tailwind CSS v4, Zustand, Socket.io client
- `server/` Node.js, Express, Socket.io, optional Supabase service client
- `supabase/` SQL migration for core schema + RLS
- `venue-demo/` demo venue graph and POIs for routing

## Features

- Event join by 6-digit code or QR scan
- Live SVG venue map with crowd heatmap and wait badges
- Fastest and least-crowded route options
- Fixed SOS flow with admin alert feed
- Admin dashboard with heatmap, SOS list, announcements, gate controls
- Evacuation broadcast mode with nearest exit route
- Group create/join flow with live member positions
- Dev simulation endpoint for demo scenarios

## Prerequisites

- Node.js 18+
- npm 9+
- Supabase project for auth/database if you want persistence beyond demo mode

## Environment Setup

### Server

1. Copy `server/.env.example` to `server/.env`
2. Set `PORT=3001`
3. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` if using Supabase
4. Set `CLIENT_ORIGIN=http://localhost:5173` for local dev

### Client

1. Copy `client/.env.example` to `client/.env`
2. Set `VITE_API_BASE_URL=http://localhost:3001`
3. Set `VITE_SOCKET_SERVER_URL=http://localhost:3001`
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` if using Supabase auth

## Supabase Setup

1. Create a Supabase project
2. Open SQL editor
3. Run `supabase/migrations/001_initial_schema.sql`
4. Confirm tables, RLS policies, and cleanup function are created

## Install

### Server

```bash
cd server
npm install
```

### Client

```bash
cd client
npm install
```

## Run Dev

### Start server

```bash
cd server
npm run dev
```

### Start client

```bash
cd client
npm run dev
```

Client runs on `http://localhost:5173`. Server runs on `http://localhost:3001`.

Vite dev server proxies `/api`, `/events`, `/groups`, `/health`, and `/socket.io` to the backend, so blank `VITE_API_BASE_URL` and `VITE_SOCKET_SERVER_URL` work fine.

## Run With Docker

```bash
docker compose up --build
```

Client runs on `http://localhost:8080`. Server also remains exposed on `http://localhost:3001`.

Docker setup:

- `client/` builds static assets and serves them with Nginx
- Nginx proxies REST + Socket.io traffic to `server`
- `server/` runs the Express + Socket.io app directly
- Supabase env vars stay optional for demo mode

## Demo Flow

- Default seeded event code: `424242`
- Demo admin account is local fallback via landing page
- Open `/` in browser
- Join as fan with code `424242`
- Open admin dashboard from landing page

## Dev Simulation

POST `http://localhost:3001/api/dev/simulate`

```json
{
  "eventId": "00000000-0000-4000-8000-000000000001",
  "scenario": "surge_gate_b"
}
```

Supported scenarios:

- `surge_gate_b`
- `full_stadium`
- `clear`
- `sos_test`
- `evacuation_test`

Example:

```bash
curl -X POST http://localhost:3001/api/dev/simulate \
  -H "Content-Type: application/json" \
  -d '{"eventId":"00000000-0000-4000-8000-000000000001","scenario":"surge_gate_b"}'
```

## Important Endpoints

- `GET /health`
- `POST /events`
- `GET /events/:id`
- `POST /events/:code/join`
- `POST /events/:eventId/groups`
- `POST /groups/join`
- `GET /api/route?from=zoneId&to=zoneId&eventId=uuid`
- `POST /api/dev/simulate`

## Notes

- Venue rendering is pure SVG. No Google Maps, Mapbox, or Leaflet.
- Frontend shows aggregate heatmap only, plus current user and group dots.
- Supabase auth is optional in demo mode. Local fallback still supports join/admin flows.
- Venue data is loaded from `venue-demo/stadium.json` and mirrored into `client/public/venue-demo.json`.
