const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const PORT = toNumber(process.env.PORT, 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const CLIENT_ORIGINS = CLIENT_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
const CROWD_PENALTY_FACTOR = toNumber(process.env.CROWD_PENALTY_FACTOR, 50);
const DANGER_THRESHOLD = toNumber(process.env.DANGER_THRESHOLD, 5);
const WARNING_THRESHOLD = toNumber(process.env.WARNING_THRESHOLD, 4);
const NUDGE_COOLDOWN_MS = toNumber(process.env.NUDGE_COOLDOWN_MS, 180000);
const DEFAULT_EVENT_NAME = process.env.DEFAULT_EVENT_NAME || "IPL Final 2026";
const DEFAULT_EVENT_CODE = process.env.DEFAULT_EVENT_CODE || "424242";
const WALKING_METERS_PER_MINUTE = 78;

const roomNames = {
  event: (eventId) => `event:${eventId}`,
  admin: (eventId) => `admin:${eventId}`,
  group: (groupId) => `group:${groupId}`
};

module.exports = {
  CLIENT_ORIGIN,
  CLIENT_ORIGINS,
  CROWD_PENALTY_FACTOR,
  DANGER_THRESHOLD,
  WARNING_THRESHOLD,
  NUDGE_COOLDOWN_MS,
  DEFAULT_EVENT_CODE,
  DEFAULT_EVENT_NAME,
  PORT,
  WALKING_METERS_PER_MINUTE,
  roomNames
};
