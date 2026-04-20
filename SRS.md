# ZenVen — Software Requirements Specification

**Project:** ZenVen - A Smart Fan Experience & Crowd Intelligence Platform  
**Hackathon:** Hack2Skill  
**Version:** 1.0 (MVP)  
**Date:** April 2026  
**Methodology:** Vibe Coding (AI-Assisted)  
**Target Stack:** React + Node.js + Socket.io + Supabase

---

## Table of Contents

1. [Introduction](https://claude.ai/chat/93b1b89d-9bf2-4835-a957-f9624122ade0#1-introduction)
2. [System Overview](https://claude.ai/chat/93b1b89d-9bf2-4835-a957-f9624122ade0#2-system-overview)
3. [Functional Requirements](https://claude.ai/chat/93b1b89d-9bf2-4835-a957-f9624122ade0#3-functional-requirements)
4. [Non-Functional Requirements](https://claude.ai/chat/93b1b89d-9bf2-4835-a957-f9624122ade0#4-non-functional-requirements)
5. [Data Models](https://claude.ai/chat/93b1b89d-9bf2-4835-a957-f9624122ade0#5-data-models)
6. [System Design Notes](https://claude.ai/chat/93b1b89d-9bf2-4835-a957-f9624122ade0#6-system-design-notes)
7. [Deployment & Tech Stack](https://claude.ai/chat/93b1b89d-9bf2-4835-a957-f9624122ade0#7-deployment--tech-stack)
8. [MVP Scope & Hackathon Demo Plan](https://claude.ai/chat/93b1b89d-9bf2-4835-a957-f9624122ade0#8-mvp-scope--hackathon-demo-plan)
9. [Future Enhancements](https://claude.ai/chat/93b1b89d-9bf2-4835-a957-f9624122ade0#9-future-enhancements)
10. [Risk Register](https://claude.ai/chat/93b1b89d-9bf2-4835-a957-f9624122ade0#10-risk-register)
11. [Appendix: Judging Criteria Alignment](https://claude.ai/chat/93b1b89d-9bf2-4835-a957-f9624122ade0#appendix-judging-criteria-alignment)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the complete functional, non-functional, and architectural requirements for **ZenVen** — a real-time smart fan experience and crowd intelligence platform for large-scale sporting events such as cricket matches, football games, and athletics championships.

This document is the single source of truth for all development. It is optimized for AI-assisted (vibe coding) development using React, Node.js, Socket.io, and Supabase so that every feature can be built via well-defined prompt-to-component workflows.

---

### 1.2 Problem Statement

> Large-scale sporting venues (50,000–100,000+ fans) suffer from three compounding problems: dangerous crowd clustering at entry/exit chokepoints, unpredictable wait times at concessions and restrooms, and the total absence of real-time coordination between fans, staff, and organizers. These degrade both safety and experience simultaneously.

Specific pain points ZenVen addresses:

- Unmanaged crowd surges at gates cause injuries and stampede risk
- Fans spend 20–35% of event time in queues rather than watching
- Lost or separated groups lack any coordination tools inside the venue
- Event staff have no real-time dashboard to detect and respond to incidents
- Emergency evacuation routes are communicated too late or not at all

---

### 1.3 Scope

ZenVen is a web + mobile platform consisting of:

- A fan-facing **Progressive Web App (PWA)** for navigation, group sync, and alerts
- An **admin dashboard** for real-time crowd monitoring and event control
- A **backend real-time engine** for crowd density computation and smart routing
- An **AI-powered nudge engine** to distribute crowd load proactively

The MVP targets a single sporting venue with up to 10,000 concurrent users for hackathon demonstration, with architecture designed to scale to 100,000+.

---

### 1.4 Definitions & Terminology

|Term|Definition|
|---|---|
|Crowd Density|Number of people per square meter in a defined zone|
|Safe Threshold|≤ 4 people/m² — normal operations|
|Warning Threshold|4–5 people/m² — nudges activated|
|Danger Threshold|≥ 5 people/m² — alerts broadcast, gates throttled|
|Nudge|Proactive, non-intrusive behavioral suggestion sent to a fan|
|Heatmap|Color-coded real-time density visualization overlay on venue map|
|Zone|A named spatial segment of a venue (e.g., Gate A, Section 12, Food Court)|
|POI|Point of Interest — a labeled venue landmark (toilet, exit, first aid)|
|SOS|Emergency distress signal sent by a fan to security/admin|
|PWA|Progressive Web App — mobile-like experience via browser, no app store needed|
|Socket.io|Real-time bidirectional WebSocket library for live data push|
|Supabase|Open-source Firebase alternative (PostgreSQL + Auth + Realtime)|

---

### 1.5 Target Users

|User Class|Description|Primary Needs|
|---|---|---|
|Fan / Attendee|Event ticket holder, mobile/web user|Navigation, wait times, group tracking, SOS|
|Admin / Organizer|Event management staff with dashboard access|Crowd heatmap, incident response, announcements|
|Security Staff|Venue security assigned to zones|SOS alerts, zone density, evacuation routing|
|Vendor / Operator|Concession/restroom management staff|Queue load data, rebalancing instructions|

---

## 2. System Overview

### 2.1 Product Vision

> ZenVen transforms a chaotic 80,000-person stadium into a smoothly orchestrated experience where every fan gets a personalized, safe, and enjoyable event — navigating confidently, waiting less, and connecting effortlessly.

---

### 2.2 System Architecture

ZenVen uses a three-tier architecture optimized for real-time performance and vibe-coding maintainability:

|Layer|Technology|Responsibility|
|---|---|---|
|Frontend (Fan PWA)|React + Tailwind CSS + Socket.io Client|Fan UI, map, navigation, group tracking, SOS|
|Frontend (Admin Dashboard)|React + Recharts + Socket.io Client|Real-time heatmaps, crowd analytics, alerts|
|Backend API|Node.js + Express.js|REST endpoints, business logic, auth|
|Real-Time Engine|Socket.io (WebSocket Server)|Live location push, density events, nudges|
|Database|Supabase (PostgreSQL)|Users, events, zones, location history|
|Crowd Engine|Node.js spatial service|Density calculation, threshold detection|
|Nudge Engine|Rule-based + optional Claude API|Personalized route suggestions|
|Hosting (FE)|Vercel|One-click deploy, free tier, auto-SSL|
|Hosting (BE)|Railway or Render|Free tier supports WebSockets, Node.js|

---

### 2.3 Vibe Coding Build Order

Build in this sequence for maximum hackathon efficiency — each step is one focused AI session:

1. Auth + Event Join (QR code / event code)
2. Venue Map Renderer (SVG-based interactive map with hardcoded demo venue)
3. Real-Time Location Engine (Socket.io ping every 3s)
4. Crowd Density & Heatmap
5. Smart Navigation (shortest + least-crowded path)
6. SOS Alert System
7. Admin Dashboard (heatmap + alerts panel)
8. Group Tracking & Nudges _(stretch)_

---

## 3. Functional Requirements

> Each table includes a **Vibe Prompt Hint** — a direct cue for what to tell Lovable / Bolt.new / Cursor to build that feature.

---

### 3.1 Authentication & Event Management

**Description:** Users join a specific event instance. Admins create and configure events. All data is scoped to event context.

|ID|Requirement|Priority|Vibe Prompt Hint|
|---|---|---|---|
|FR-1.1|System shall support email/OTP or Google OAuth for fan login|High|`Supabase Auth with Google provider + email OTP`|
|FR-1.2|Admin shall create event with name, venue, date, capacity|High|`Form with Supabase insert`|
|FR-1.3|System shall generate unique 6-digit event code and QR code per event|High|`uuid shortcode + qrcode.react npm package`|
|FR-1.4|Fan shall join event by entering code or scanning QR|High|`QR scanner with react-qr-reader`|
|FR-1.5|System shall bind fan session to event context on join|High|`Supabase RLS + JWT session with eventId claim`|
|FR-1.6|Admin shall deactivate an event, ending active sessions|Medium|`Event status field + socket disconnect on status change`|

---

### 3.2 Venue Mapping & Wayfinding

**Description:** Interactive SVG venue maps with annotated zones, POIs, and navigation overlays. MVP ships with one hardcoded demo venue — the admin map builder is a post-hackathon feature.

|ID|Requirement|Priority|Vibe Prompt Hint|
|---|---|---|---|
|FR-2.1|System shall load venue map from a pre-configured JSON zone layout|High|`Import venue config JSON, render as SVG polygons`|
|FR-2.2|Map shall show annotated zones: gates, sections, toilets, food courts, first aid|High|`Zone type → icon/label overlay on SVG`|
|FR-2.3|System shall render interactive map with pan/zoom for fans|High|`react-svg-pan-zoom library`|
|FR-2.4|System shall display user's current position as a pulsing dot|High|`CSS keyframe pulse animation on SVG circle`|
|FR-2.5|System shall display shortest path as animated SVG polyline|High|`stroke-dashoffset CSS animation on SVG path`|
|FR-2.6|System shall display least-crowded path as alternate route option|High|`Second polyline in different color, toggle between routes`|
|FR-2.7|Map shall update routes in real-time as crowd conditions change|Medium|`Socket.io density event triggers pathfinding re-run`|

---

### 3.3 Real-Time Location Engine

**Description:** Collects fan positions every 3 seconds and transmits to the server for crowd computation. Built for efficiency in congested network conditions.

|ID|Requirement|Priority|Vibe Prompt Hint|
|---|---|---|---|
|FR-3.1|Client shall emit location update via Socket.io every 3 seconds|High|`setInterval + socket.emit('loc', {lat, lng, userId})`|
|FR-3.2|System shall accept GPS coordinates from browser Geolocation API|High|`navigator.geolocation.watchPosition with fallback`|
|FR-3.3|Server shall store last-known position per user in memory|High|`Server-side Map() keyed by userId — no DB write for hot path`|
|FR-3.4|System shall process location updates every 2 seconds for density calc|High|`setInterval server-side aggregation tick`|
|FR-3.5|System shall offer manual zone check-in if GPS is unavailable|Medium|`Zone list dropdown UI → socket.emit with zoneId`|
|FR-3.6|Location data shall be purged 24 hours after event ends|Medium|`Supabase scheduled function / cron job`|

---

### 3.4 Crowd Density & Heatmap Engine

**Description:** Core intelligence layer. Computes real-time density per zone and generates heatmap data for admin and fan views.

|ID|Requirement|Priority|Vibe Prompt Hint|
|---|---|---|---|
|FR-4.1|System shall count active users per zone every 2 seconds|High|`Point-in-polygon via @turf/boolean-point-in-polygon`|
|FR-4.2|System shall calculate density as users / zone_area_m2|High|`Simple division with zone metadata`|
|FR-4.3|System shall classify zones: Safe (green), Warning (yellow), Danger (red)|High|`Threshold config object → color string mapping`|
|FR-4.4|System shall broadcast heatmap state to all admin connections|High|`socket.to(adminRoom).emit('heatmap:update', data)`|
|FR-4.5|Fan map shall show zone shading based on density (opacity overlay)|High|`SVG fill opacity linearly mapped to density value`|
|FR-4.6|System shall persist density snapshots every 30 seconds|Medium|`Supabase insert on setInterval(30000)`|
|FR-4.7|Admin dashboard shall show density trend chart per zone (last 30 mins)|Medium|`Recharts LineChart with rolling 60-point buffer`|

---

### 3.5 Smart Navigation & Routing

**Description:** Turn-by-turn indoor navigation with two modes — fastest and least congested. Routes adapt dynamically.

|ID|Requirement|Priority|Vibe Prompt Hint|
|---|---|---|---|
|FR-5.1|Fan shall select destination from POI list|High|`Dropdown/search with zone POI data from Supabase`|
|FR-5.2|System shall compute shortest path using A* on venue zone graph|High|`npm install astar-typescript — pre-built, well-documented`|
|FR-5.3|System shall compute least-congested path using density-weighted Dijkstra|High|`Same graph, edge weight = base_dist + (density × PENALTY_FACTOR)`|
|FR-5.4|System shall display both route options with ETA and congestion level|High|`Route card component with two options and metrics`|
|FR-5.5|System shall auto-reroute if path density exceeds danger threshold|High|`Socket.io density event → trigger pathfinding re-run`|
|FR-5.6|Navigation shall display step-by-step text instructions|Medium|`Edge traversal → human-readable direction strings`|
|FR-5.7|System shall show estimated queue wait time at destination POI|Medium|`ETA = (queue_count / service_rate) in minutes — displayed on POI`|

> **Routing config:** `CROWD_PENALTY_FACTOR` default = 50 (equivalent meters per density unit). Adjust to tune how aggressively the algorithm avoids crowds.

---

### 3.6 Smart Nudge Engine

**Description:** The key differentiating feature. Proactively guides fan behavior through personalized, non-intrusive push suggestions before problems occur.

|ID|Requirement|Priority|Vibe Prompt Hint|
|---|---|---|---|
|FR-6.1|System shall detect zones approaching warning threshold (80% of danger)|High|`Density threshold check in engine loop per tick`|
|FR-6.2|System shall generate nudge message for fans near affected zone|High|`Template string: "Gate B is filling up — try Gate D (2 min walk)"`|
|FR-6.3|System shall push nudge as non-blocking toast on fan UI|High|`react-hot-toast on socket 'nudge:receive' event`|
|FR-6.4|System shall suggest nearest alternative POI with lower density|High|`Sort same-type POIs by density, return top 2`|
|FR-6.5|Nudges shall be rate-limited to max 1 per fan per 3 minutes|High|`Server-side per-user nudge timestamp Map()`|
|FR-6.6|Fan shall dismiss or act on nudge (navigate to suggestion)|Medium|`Toast with "Go There" action button`|
|FR-6.7|System may use Claude API to generate contextual nudge text|Optional|`Anthropic API call with zone + density context — stretch goal only`|

---

### 3.7 Queue & Wait Time Optimization

|ID|Requirement|Priority|Vibe Prompt Hint|
|---|---|---|---|
|FR-7.1|System shall monitor density at concession/toilet/gate zones|High|`Subset of density engine filtering service-type POIs`|
|FR-7.2|System shall estimate wait time per queue using density + service rate model|High|`ETA_minutes = queue_count / service_rate (configurable per POI type)`|
|FR-7.3|Fan shall see live wait-time badges on map POI labels|High|`SVG text overlay on POI icon, updated on heatmap tick`|
|FR-7.4|System shall auto-nudge when wait exceeds 10 minutes|Medium|`Nudge engine checks ETA threshold, same rate-limit rules`|
|FR-7.5|Admin shall see queue distribution across all service points|Medium|`Admin dashboard queue panel — table sorted by wait time`|

---

### 3.8 SOS & Emergency System

**Description:** Critical safety feature. One-tap SOS delivers precise location to security in under 2 seconds. Evacuation mode overrides all nudges.

|ID|Requirement|Priority|Vibe Prompt Hint|
|---|---|---|---|
|FR-8.1|Fan shall trigger SOS via prominent one-tap button on main nav|Critical|`Fixed bottom button, red, 2-second hold OR double-tap confirm`|
|FR-8.2|System shall transmit SOS with userId, location, timestamp immediately|Critical|`socket.emit('sos:trigger', data) — no debounce, no queue`|
|FR-8.3|Admin dashboard shall show SOS alert with location within 2 seconds|Critical|`socket.on('sos:trigger') → admin room broadcast + map pin drop`|
|FR-8.4|System shall notify all security sockets with routing to SOS location|Critical|`socket.to(securityRoom).emit('sos:alert', {data, routeToUser})`|
|FR-8.5|Admin shall mark SOS as resolved with notes|High|`SOS status update button → Supabase record update`|
|FR-8.6|Admin shall trigger mass evacuation mode|High|`Admin button → socket.broadcast.emit('evacuation:start')`|
|FR-8.7|Evacuation routes shall override all UI on all connected fan devices|High|`React context evacuation state → full-screen red overlay component`|

---

### 3.9 Group Tracking & Coordination

|ID|Requirement|Priority|Vibe Prompt Hint|
|---|---|---|---|
|FR-9.1|Fan shall create a group and share a 4-digit join code|High|`Group entity in Supabase with shortcode, creator is owner`|
|FR-9.2|Group members shall see each other's real-time positions as named dots|High|`Socket.io group room + filtered dot rendering on SVG map`|
|FR-9.3|System shall alert if group members are more than 200m apart|Medium|`Haversine distance check on each location tick`|
|FR-9.4|Group shall have a shared meeting point navigable by all members|Medium|`meetingPointZoneId in Group record, shown as star pin on map`|

> **Removed from MVP:** Group in-app chat (FR-9.5). Group map pins are sufficient for demo impact and group chat is a scope-creep risk.

---

### 3.10 Admin Dashboard

**Description:** Mission control for event organizers. Single React page with live data streams. Designed as the primary judging showcase screen.

|ID|Requirement|Priority|Vibe Prompt Hint|
|---|---|---|---|
|FR-10.1|Dashboard shall display live venue heatmap with zone density overlays|Critical|`VenueHeatmap component with SVG fill bound to socket heatmap data`|
|FR-10.2|Dashboard shall show total active users + per-zone breakdown table|High|`Stats bar + sortable zone density table component`|
|FR-10.3|Dashboard shall display SOS alerts in real-time with zone and timestamp|Critical|`Alert panel with red badges, sorted by time, auto-scrolling`|
|FR-10.4|Admin shall broadcast venue-wide announcement to all fans|High|`Text input + button → socket.broadcast.emit → fan toast`|
|FR-10.5|Admin shall throttle/close specific entry gates remotely|High|`Gate status toggle → sets edge weight to ∞ in routing graph`|
|FR-10.6|Dashboard shall show density trend chart per zone (last 30 mins)|Medium|`Recharts LineChart, rolling 60-point buffer per zone`|

> **Removed from MVP:** CSV export (FR-10.7). Mention verbally during demo — not worth build time for hackathon.

---

## 4. Non-Functional Requirements

|Category|Requirement|Target|
|---|---|---|
|Performance|Real-time update latency (location → heatmap)|≤ 3 seconds end-to-end|
|Performance|Navigation route computation time|≤ 500ms for venues up to 200 zones|
|Performance|SOS alert delivery to admin|≤ 2 seconds guaranteed|
|Scalability|Concurrent users (MVP demo)|≥ 1,000 users simultaneously|
|Scalability|Concurrent users (production target)|≥ 50,000 users per event|
|Scalability|Events running simultaneously|≥ 10 per server instance|
|Reliability|System uptime during live event|≥ 99.5%|
|Reliability|Graceful degradation when GPS fails|Static map + last heatmap snapshot + manual zone check-in|
|Security|Data transmission|HTTPS/WSS encrypted at all times|
|Security|Authentication|Supabase JWT with event-scoped session|
|Security|Data retention|All location data purged 24h post-event|
|Privacy|Heatmap data|Aggregate zone counts only — no individual tracking shown|
|Privacy|Consent|Explicit opt-in prompt before first location use|
|Usability|Time to first navigation from cold start|≤ 30 seconds|
|Usability|SOS activation time from any screen|≤ 5 seconds|
|Usability|Evacuation mode UI complexity|Reduced to 2 elements: route overlay + SOS button|
|Compatibility|Fan device support|Any modern browser (PWA — no app install)|
|Compatibility|Admin dashboard|Desktop Chrome/Firefox|
|Battery|Location polling impact|< 5% additional drain per hour|

---

## 5. Data Models

### 5.1 Core Entities

|Entity|Key Fields|Notes|
|---|---|---|
|`Event`|id, name, venue_id, date, capacity, status, event_code|status: `draft \| active \| closed`|
|`Venue`|id, name, address, area_m2, zone_config (JSON)|Reusable across events|
|`Zone`|id, venue_id, name, type, polygon (JSON), area_m2, capacity|Types: `gate \| section \| toilet \| food \| exit \| firstaid`|
|`User`|id, email, name, avatar_url, role|Roles: `fan \| admin \| security`|
|`EventUser`|id, event_id, user_id, joined_at, ticket_ref|Fan's event membership|
|`LocationUpdate`|id, event_id, user_id, lat, lng, zone_id, timestamp|High-volume, 24h TTL|
|`ZoneDensityLog`|id, event_id, zone_id, density, user_count, timestamp|Snapshot every 30s|
|`Group`|id, event_id, name, join_code, meeting_point_zone_id|Fan coordination group|
|`GroupMember`|id, group_id, user_id, joined_at|Junction table|
|`SOSAlert`|id, event_id, user_id, lat, lng, zone_id, status, resolved_by, notes, created_at|status: `open \| acknowledged \| resolved`|
|`Announcement`|id, event_id, message, type, sent_by, sent_at|Types: `info \| warning \| evacuation`|
|`Nudge`|id, event_id, user_id, message, zone_id, sent_at, acted_on|Per-fan nudge log|

---

### 5.2 Real-Time Socket.io Event Schema

**Client → Server: Location update**

```json
Event: "location:update"
{
  "userId": "string",
  "lat": 28.6448,
  "lng": 77.2167,
  "accuracy": 15,
  "timestamp": 1714000000000
}
```

**Server → All Admins: Heatmap state**

```json
Event: "heatmap:update"
{
  "eventId": "string",
  "zones": [
    { "zoneId": "gate-a", "density": 3.2, "userCount": 214, "status": "safe" },
    { "zoneId": "gate-b", "density": 5.8, "userCount": 389, "status": "danger" }
  ],
  "timestamp": 1714000002000
}
```

**Server → Fan: Nudge**

```json
Event: "nudge:receive"
{
  "message": "Gate B is getting crowded — Gate D has a 1-min walk and no queue.",
  "zoneId": "gate-b",
  "alternatives": [
    { "zoneId": "gate-d", "name": "Gate D", "density": 1.1, "etaMinutes": 1 }
  ],
  "expiresAt": 1714000182000
}
```

**Fan → Server: SOS**

```json
Event: "sos:trigger"
{
  "userId": "string",
  "lat": 28.6448,
  "lng": 77.2167,
  "zoneId": "section-12",
  "timestamp": 1714000000000
}
```

**Server → All Clients: Evacuation**

```json
Event: "evacuation:start"
{
  "eventId": "string",
  "message": "Please proceed calmly to the nearest exit.",
  "exitRoutes": [
    { "zoneId": "section-12", "path": ["section-12", "concourse-b", "gate-c"], "exitGate": "Gate C" }
  ]
}
```

---

## 6. System Design Notes

### 6.1 Crowd Density Algorithm

The density engine runs on a 2-second server-side tick:

1. Collect all active user locations from the in-memory `Map(userId → {lat, lng, zoneId})`
2. For each zone, run `@turf/boolean-point-in-polygon` against each user's coordinates
3. Count users per zone → `density = count / zone.area_m2`
4. Apply threshold classification: Safe `< 4`, Warning `4–5`, Danger `≥ 5`
5. Emit `heatmap:update` to admin room and `zone:status` to affected fans
6. Pass warning/danger zones to nudge engine

---

### 6.2 Pathfinding Model

The venue is modeled as a weighted undirected graph:

- **Nodes:** zones and POIs
- **Edges:** walkable connections between adjacent zones
- **Fastest path weight:** Euclidean distance in meters
- **Least-congested path weight:** `distance + (zone.density × CROWD_PENALTY_FACTOR)`
- **CROWD_PENALTY_FACTOR:** configurable constant, default `50` (equivalent meters per density unit)
- **Gate closed:** set edge weight to `Infinity` — automatically excluded from all routes

**Recommended library:** `astar-typescript` (npm, TypeScript-native, well-maintained)

---

### 6.3 Nudge Engine Rules

|Trigger Condition|Nudge Action|Target Audience|
|---|---|---|
|Zone density ≥ 80% of danger threshold|Suggest nearest same-type alternative POI|Fans within 100m of affected zone|
|Queue wait time > 10 minutes|Show top 2 alternatives with wait times|Fans navigating to that POI|
|Gate closing / throttled by admin|Alert fans in that gate zone|Fans in gate zone|
|Group member separation > 200m|Suggest shared meeting point|All group members|
|Evacuation mode activated|Override ALL UI with evacuation overlay|All connected fans|

**Rate limit:** Maximum 1 nudge per fan per 3 minutes (tracked server-side per userId).

---

### 6.4 Vibe Coding Prompt Library

Use these prompts directly in Lovable / Bolt.new / Cursor:

---

**Prompt: Real-time heatmap component**

> Build a React component called `VenueHeatmap` that renders an SVG venue map. It receives a `zones` prop (array of `{id, polygon, density, status}`). Fill each zone polygon based on status: green for safe, yellow for warning, red for danger. Opacity scales with density from 0.2 to 0.8. Add a CSS pulse animation on danger zones. Connect to a Socket.io server listening on `heatmap:update` and update zones state in real-time.

---

**Prompt: SOS button component**

> Create a React `SOSButton` component fixed at the bottom of every page. It's a large red circle button labeled "SOS". When held for 2 seconds, it emits `sos:trigger` via Socket.io with `{userId, lat, lng}` from `navigator.geolocation`. Show a 2-second hold progress indicator. Display a confirmation dialog before sending and a success toast when server acknowledges.

---

**Prompt: Admin dashboard page**

> Build an admin dashboard React page with three sections: (1) Left 2/3: `VenueHeatmap` component with live zone density. (2) Right 1/3: SOS Alerts panel — real-time list from `sos:trigger` socket events with zone name, timestamp, and a Resolve button. (3) Top bar: stats showing total active users, count of zones at danger level, and pending SOS count. Also add a text input + broadcast button that emits `announcement:send` via socket. Use Recharts `LineChart` below the map for per-zone density trend (last 30 mins, rolling buffer).

---

**Prompt: Smart navigation UI**

> Build a React navigation panel component. User picks a destination from a POI dropdown. On selection, call a server REST endpoint `/api/route?from=zoneA&to=zoneB&eventId=xyz` that returns two route options: fastest and least-crowded, each with `{path: string[], etaMinutes: number, congestionLevel: string}`. Display both as cards. Draw the selected route as an animated SVG polyline on the `VenueHeatmap` map. Auto-refresh route every 10 seconds if active.

---

## 7. Deployment & Tech Stack

### 7.1 Full Stack

|Layer|Technology|Why for Vibe Coding|
|---|---|---|
|Frontend|React + Vite + Tailwind CSS|Fast dev, Bolt/Lovable native, great AI output|
|State|Zustand|Minimal boilerplate, easy to prompt for|
|Real-Time Client/Server|Socket.io v4|Most documented, best AI coverage, free hosting compatible|
|Backend|Node.js + Express|Full JS stack, one language everywhere|
|Database + Auth|Supabase|Built-in auth, realtime, storage — no backend config needed|
|Map Rendering|react-svg-pan-zoom + custom SVG|No third-party map API costs, full control|
|Pathfinding|astar-typescript|npm install, works immediately|
|Geo calculations|@turf/boolean-point-in-polygon|Point-in-polygon — one function call|
|Charts|Recharts|React-native, zero config, AI knows it well|
|Notifications|react-hot-toast|One-line toast on socket event|
|QR Code|qrcode.react + react-qr-reader|Well-documented, AI-friendly|
|Deploy (Frontend)|Vercel|Zero-config, free tier, instant GitHub deploy|
|Deploy (Backend)|Railway or Render|Free tier WebSocket support, one-click Node.js|

---

### 7.2 Environment Variables

**Backend `.env`**

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
PORT=3001
CLIENT_ORIGIN=https://your-vercel-app.vercel.app
ANTHROPIC_API_KEY=        # optional — only for FR-6.7 AI nudges
CROWD_PENALTY_FACTOR=50   # pathfinding tuning
DANGER_THRESHOLD=5        # people per m²
WARNING_THRESHOLD=4
NUDGE_COOLDOWN_MS=180000  # 3 minutes
```

**Frontend `.env`**

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SOCKET_SERVER_URL=https://your-backend.railway.app
```

---

## 8. MVP Scope & Hackathon Demo Plan

### 8.1 What to Build

|Feature|Demo Impact|Est. Build Time|
|---|---|---|
|Event join via code + fan onboarding|Shows multi-user setup|1 hour|
|SVG venue map with zones (hardcoded demo venue)|Visual wow factor|2 hours|
|Real-time heatmap (live or simulated density)|Core value prop visible instantly|1 hour|
|Smart navigation — fastest + least-crowded routes|Differentiator #1|2 hours|
|Smart nudge notifications|Differentiator #2 — feels like AI|1 hour|
|SOS trigger + admin alert panel|Safety credibility|1 hour|
|Admin live dashboard (heatmap + SOS + announcements)|Judging panel showcase screen|2 hours|
|Group tracking with map pins|Consumer appeal — stretch goal|1 hour|

**Total estimated build time: ~11–14 hours** of focused vibe coding sessions.

---

### 8.2 Out of Scope (MVP)

- Payment / ticketing integration
- ML/AI predictive crowd modeling
- Admin map builder / SVG upload tool
- BLE beacon indoor positioning
- Native iOS/Android app (PWA covers demo needs)
- Group in-app chat
- Multi-language internationalization
- CSV data export

---

### 8.3 Demo Script (3 minutes)

This sequence is designed to create a judge "wow moment" at every step:

1. **Admin creates event** "IPL Final 2026" and opens the live dashboard
2. **Judges scan QR code** on their phones and join as fans — see themselves appear on the map
3. **Presenter simulates crowd surge** at Gate B (via a `/simulate` dev endpoint that bumps density)
4. **Heatmap turns red** in real-time on admin screen — judges see it on their phones simultaneously
5. **Nudge toast pops up** on fan phones: _"Gate B is getting crowded — Gate D has no queue (2 min walk)"_
6. **Judge taps navigate to seat** — sees two route options with congestion level and ETA
7. **Presenter triggers SOS** — admin sees alert with zone location within 2 seconds
8. **Admin broadcasts evacuation** — all connected phones show red full-screen overlay simultaneously

---

## 9. Future Enhancements

|Enhancement|Description|Post-MVP Priority|
|---|---|---|
|AI predictive crowding|ML model forecasts surges 10–15 mins ahead based on event schedule patterns|High|
|BLE beacon positioning|Sub-meter indoor accuracy using Bluetooth Low Energy beacon network|High|
|Accessibility mode|Audio turn-by-turn navigation + high-contrast UI for visually impaired fans|High|
|Emergency services integration|Direct API push to local police/ambulance dispatch on SOS trigger|High|
|AR wayfinding|Camera overlay with directional arrows to seats and POIs|Medium|
|Admin map builder|Drag-and-drop SVG zone editor for admin to configure new venues|Medium|
|Multi-venue federation|Single admin dashboard managing multiple venues in parallel|Medium|
|Fan sentiment analytics|Post-event dwell-time analysis and satisfaction data for venue optimization|Low|
|Wearable integration|Smartwatch haptic nudges and SOS gesture|Low|

---

## 10. Risk Register

|Risk|Impact|Likelihood|Mitigation|
|---|---|---|---|
|GPS inaccuracy indoors|Wrong zone assignment, bad routing|High|Manual zone check-in fallback (FR-3.5)|
|WebSocket overload at scale|Dropped location updates, stale heatmap|Medium|Horizontal scaling + Redis pub/sub; MVP uses in-memory safely|
|Battery drain from 3s polling|Fans disable location access|Medium|Adaptive polling: 3s active, 10s background, 30s idle|
|Network congestion at stadium|Location updates delayed beyond 3s|High|Optimistic UI with last known position; reduce to 5s polling under congestion|
|Privacy / consent friction|Fans opt out of location|Medium|Clear value prop on consent screen: "We use your location to help you avoid queues"|
|Demo venue map inaccurate|Routing looks wrong during judging|Medium|Use a well-known stadium SVG (e.g., simplified Wankhede layout) verified before demo|

---

## Appendix: Judging Criteria Alignment

|Judging Criterion|How ZenVen Addresses It|
|---|---|
|Innovation / Novelty|Combines real-time crowd intelligence + smart nudges + group coordination in one unified fan platform — no existing consumer product does all three|
|Technical Execution|Full-stack WebSocket architecture, live heatmap, A* pathfinding, SOS system — all demonstrable and running|
|Real-World Impact|Targets 500M+ sports fans globally; directly reduces injury risk and improves 20–35% of time fans spend in queues|
|Scalability|Architecture scales from demo (1k users) to production (50k+) with horizontal Node.js + Redis|
|Feasibility|React + Supabase + Socket.io stack is production-proven, free tier available, fully vibe-codeable|
|Demo Quality|8-step demo script creates visible wow moments at each reveal; judges participate as live users|
|Problem-Solution Fit|Every feature ID maps to a specific stated pain point with a measurable improvement claim|

---

_ZenVen SRS v1.0 — Hack2Skill — April 2026_