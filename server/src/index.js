require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");
const venueData = require("../../venue-demo/stadium.json");
const { DEFAULT_EVENT_CODE, DEFAULT_EVENT_NAME, CLIENT_ORIGINS, PORT } = require("./config/constants");
const { LocationStore } = require("./store/locationStore");
const { createCrowdEngine } = require("./engines/crowdEngine");
const { createNudgeEngine } = require("./engines/nudgeEngine");
const { createAuthHelpers } = require("./routes/auth");
const { createEventsRouter } = require("./routes/events");
const { createRouteRouter } = require("./routes/route");
const { registerLocationHandlers } = require("./socket/locationHandler");
const { registerSosHandlers } = require("./socket/sosHandler");
const { registerAdminHandlers } = require("./socket/adminHandler");
const { registerEvacuationHandlers } = require("./socket/evacuationHandler");
const { seedDefaultState } = require("./utils/seed");
const { runSimulation } = require("./utils/simulation");
const { logger } = require("./utils/logger");

// ── Startup validation ──────────────────────────────────────────────────────
if (process.env.NODE_ENV === "production" && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  logger.warn("SUPABASE_SERVICE_ROLE_KEY is not set — persistence is disabled in production.");
}

// ── App setup ───────────────────────────────────────────────────────────────
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

// ── In-memory state ─────────────────────────────────────────────────────────
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
seedDefaultState(state, venueData);

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

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGINS, credentials: true }));
app.use(express.json());

// General API rate limiter: 200 req / 15 min per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});

// Stricter limiter for join endpoint: 20 req / 15 min per IP
const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many join attempts, please try again later." }
});

app.use("/api", generalLimiter);
app.use("/events/:code/join", joinLimiter);

// ── Routes ───────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    defaultEvent: [...state.events.values()][0]
  });
});

app.use(createEventsRouter({ state, venueData, authHelpers }));
app.use(createRouteRouter({ state, venueData, authHelpers }));

// Dev-only simulation endpoint (blocked in production)
app.post("/api/dev/simulate", authHelpers.optionalAuth, (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Simulation disabled in production" });
  }

  const { eventId, scenario } = req.body;
  if (!state.events.has(eventId)) {
    return res.status(404).json({ error: "Event not found" });
  }

  const result = runSimulation({ io, state, locationStore, venueData, eventId, scenario });
  return res.json(result);
});

// ── Socket.IO ────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  registerLocationHandlers({ io, socket, state, locationStore, venueData });
  registerSosHandlers({ io, socket, state, supabase });
  registerAdminHandlers({ io, socket, state, nudgeEngine });
  registerEvacuationHandlers({ io, socket, state, venueData });
});

// ── Start ────────────────────────────────────────────────────────────────────
crowdEngine.start();

server.listen(PORT, () => {
  logger.info(`ZenVen server running on port ${PORT}`, { port: PORT, env: process.env.NODE_ENV });
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function gracefulShutdown(signal) {
  logger.info(`Received ${signal} — shutting down gracefully`);
  crowdEngine.stop();
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // Force exit if server hasn't closed in 10 s
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason: String(reason) });
});

process.on("uncaughtException", (error) => {
  logger.critical("Uncaught exception — exiting", { message: error.message, stack: error.stack });
  process.exit(1);
});
