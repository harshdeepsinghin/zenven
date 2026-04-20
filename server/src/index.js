require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");
const venueData = require("../../venue-demo/stadium.json");
const { DEFAULT_EVENT_CODE, DEFAULT_EVENT_NAME, CLIENT_ORIGINS, PORT } = require("./config/constants");
const { LocationStore, centerOfPolygon } = require("./store/locationStore");
const { createCrowdEngine } = require("./engines/crowdEngine");
const { createNudgeEngine } = require("./engines/nudgeEngine");
const { createAuthHelpers } = require("./routes/auth");
const { createEventsRouter } = require("./routes/events");
const { createRouteRouter } = require("./routes/route");
const { registerLocationHandlers } = require("./socket/locationHandler");
const { registerSosHandlers } = require("./socket/sosHandler");
const { registerAdminHandlers } = require("./socket/adminHandler");
const { registerEvacuationHandlers } = require("./socket/evacuationHandler");
const { getNearestExitRoute } = require("./engines/routingEngine");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ["GET", "POST"]
  }
});

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

const state = {
  events: new Map(),
  eventUsers: new Map(),
  heatmaps: new Map(),
  densityHistory: new Map(),
  zoneStatusCache: new Map(),
  lastDensityPersistAt: new Map(),
  gateStatuses: new Map(),
  sosAlerts: new Map(),
  announcements: new Map(),
  groups: new Map(),
  userGroups: new Map(),
  userProfiles: new Map(),
  userSockets: new Map(),
  routeIntents: new Map(),
  nudgeCooldowns: new Map(),
  nudges: new Map(),
  evacuationState: new Map(),
  lastErrors: []
};

const locationStore = new LocationStore();
seedDefaultState(state);

const authHelpers = createAuthHelpers(state);
const nudgeEngine = createNudgeEngine({ io, state, locationStore, venueData });
const crowdEngine = createCrowdEngine({
  io,
  state,
  locationStore,
  venueData,
  nudgeEngine,
  supabase
});

app.use(cors({ origin: CLIENT_ORIGINS, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    defaultEvent: [...state.events.values()][0]
  });
});

app.use(createEventsRouter({ state, venueData, authHelpers }));
app.use(createRouteRouter({ state, venueData, authHelpers }));
app.post("/api/dev/simulate", authHelpers.optionalAuth, (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Simulation disabled in production" });
  }

  const { eventId, scenario } = req.body;
  if (!state.events.has(eventId)) {
    return res.status(404).json({ error: "Event not found" });
  }

  const result = runSimulation({
    io,
    state,
    locationStore,
    venueData,
    eventId,
    scenario
  });

  return res.json(result);
});

io.on("connection", (socket) => {
  registerLocationHandlers({
    io,
    socket,
    state,
    locationStore,
    venueData
  });
  registerSosHandlers({
    io,
    socket,
    state,
    supabase
  });
  registerAdminHandlers({
    io,
    socket,
    state,
    nudgeEngine
  });
  registerEvacuationHandlers({
    io,
    socket,
    state,
    venueData
  });
});

crowdEngine.start();

server.listen(PORT, () => {
  console.log(`ZenVen server running on port ${PORT}`);
});

function seedDefaultState(nextState) {
  const eventId = "00000000-0000-4000-8000-000000000001";
  nextState.userProfiles.set("local-admin", {
    id: "local-admin",
    role: "admin",
    name: "Venue Admin",
    email: "admin@zenven.local"
  });
  nextState.events.set(eventId, {
    id: eventId,
    name: DEFAULT_EVENT_NAME,
    date: new Date(Date.now() + 86400000).toISOString(),
    capacity: 10000,
    venueId: venueData.id,
    status: "active",
    eventCode: DEFAULT_EVENT_CODE,
    createdBy: "local-admin"
  });
}

function runSimulation({ io, state, locationStore, venueData, eventId, scenario }) {
  if (scenario === "clear") {
    locationStore.clearSimulated(eventId);
    state.evacuationState.delete(eventId);
    io.to(`event:${eventId}`).emit("evacuation:end", { eventId });
    return { ok: true, scenario };
  }

  if (scenario === "surge_gate_b") {
    locationStore.clearSimulated(eventId);
    seedUsersInZone(locationStore, eventId, venueData, "gate-b", 400, "sim-gate-b");
    return { ok: true, scenario, injectedUsers: 400 };
  }

  if (scenario === "full_stadium") {
    locationStore.clearSimulated(eventId);
    let total = 0;
    const crowdZones = venueData.zones.filter((zone) => ["gate", "section", "concourse", "food", "toilet"].includes(zone.type));
    for (const zone of crowdZones) {
      const amount = Math.floor(8000 / crowdZones.length);
      total += amount;
      seedUsersInZone(locationStore, eventId, venueData, zone.id, amount, `sim-${zone.id}`);
    }
    return { ok: true, scenario, injectedUsers: total };
  }

  if (scenario === "sos_test") {
    const fakeAlert = {
      id: `fake-sos-${Date.now()}`,
      eventId,
      userId: "sim-user",
      lat: 350,
      lng: 250,
      zoneId: "section-12",
      status: "open",
      createdAt: Date.now()
    };
    const alerts = state.sosAlerts.get(eventId) || [];
    state.sosAlerts.set(eventId, [fakeAlert, ...alerts]);
    io.to(`admin:${eventId}`).emit("sos:alert", fakeAlert);
    return { ok: true, scenario };
  }

  if (scenario === "evacuation_test") {
    const exitRoutes = venueData.zones
      .filter((zone) => zone.type === "section")
      .map((zone) => {
        const route = getNearestExitRoute({
          venueData,
          state,
          eventId,
          from: zone.id
        });
        return {
          zoneId: zone.id,
          path: route?.path || [],
          exitGate: route?.exitGate || "Main Exit Plaza"
        };
      });

    io.to(`event:${eventId}`).emit("evacuation:start", {
      eventId,
      message: "Please proceed calmly to the nearest exit.",
      exitRoutes
    });
    return { ok: true, scenario };
  }

  return {
    ok: false,
    error: "Unknown scenario"
  };
}

function seedUsersInZone(locationStore, eventId, venueData, zoneId, count, prefix) {
  const zone = venueData.zones.find((candidate) => candidate.id === zoneId);
  if (!zone) {
    return;
  }

  const [centerX, centerY] = centerOfPolygon(zone.polygon);
  for (let index = 0; index < count; index += 1) {
    locationStore.upsertLocation(eventId, {
      userId: `${prefix}-${index}`,
      lat: centerX + (index % 10) - 5,
      lng: centerY + (Math.floor(index / 10) % 10) - 5,
      accuracy: 5,
      zoneId,
      timestamp: Date.now(),
      simulated: true
    });
  }
}
