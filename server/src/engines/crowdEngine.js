const {
  DANGER_THRESHOLD,
  WARNING_THRESHOLD,
  roomNames
} = require("../config/constants");

function createCrowdEngine({ io, state, locationStore, venueData, nudgeEngine, supabase }) {
  async function tick() {
    const now = Date.now();
    const activeEvents = [...state.events.values()].filter((event) => event.status === "active");

    for (const event of activeEvents) {
      const zones = venueData.zones.map((zone) => {
        const users = locationStore.getUsersInZone(event.id, zone);
        const density = Number((users.length / Math.max(zone.area_m2, 1)).toFixed(3));
        return {
          zoneId: zone.id,
          density,
          userCount: users.length,
          status: getZoneStatus(density)
        };
      });

      const payload = {
        eventId: event.id,
        zones,
        timestamp: now
      };

      state.heatmaps.set(event.id, payload);
      io.to(roomNames.admin(event.id)).emit("heatmap:update", payload);

      emitZoneStatusChanges(event.id, zones);
      nudgeEngine.evaluate({
        eventId: event.id,
        zones
      });

      const shouldPersist = now - (state.lastDensityPersistAt.get(event.id) || 0) >= 30000;
      if (shouldPersist) {
        state.lastDensityPersistAt.set(event.id, now);
        persistDensitySnapshot(event.id, zones, now, supabase, state);
      }
    }
  }

  function start() {
    tick();
    return setInterval(tick, 2000);
  }

  function emitZoneStatusChanges(eventId, zones) {
    const statusCache = state.zoneStatusCache.get(eventId) || new Map();

    for (const zone of zones) {
      const previousStatus = statusCache.get(zone.zoneId);
      if (previousStatus === zone.status) {
        continue;
      }

      statusCache.set(zone.zoneId, zone.status);
      const socketsToNotify = locationStore
        .getEventUsers(eventId)
        .filter((user) => user.zoneId === zone.zoneId || user.zoneId === null)
        .map((user) => state.userSockets.get(user.userId) || new Set());

      for (const socketSet of socketsToNotify) {
        for (const socketId of socketSet) {
          io.to(socketId).emit("zone:status", zone);
        }
      }
    }

    state.zoneStatusCache.set(eventId, statusCache);
  }

  return {
    start,
    tick
  };
}

function getZoneStatus(density) {
  if (density < WARNING_THRESHOLD) {
    return "safe";
  }

  if (density < DANGER_THRESHOLD) {
    return "warning";
  }

  return "danger";
}

async function persistDensitySnapshot(eventId, zones, timestamp, supabase, state) {
  const nextHistoryPoint = { timestamp, zones };
  const history = state.densityHistory.get(eventId) || [];
  state.densityHistory.set(eventId, [...history, nextHistoryPoint].slice(-60));

  if (!supabase) {
    return;
  }

  const rows = zones.map((zone) => ({
    event_id: eventId,
    zone_id: zone.zoneId,
    density: zone.density,
    user_count: zone.userCount,
    timestamp: new Date(timestamp).toISOString()
  }));

  try {
    await supabase.from("zone_density_log").insert(rows);
  } catch (error) {
    state.lastErrors.push({
      scope: "zone_density_log",
      message: error.message,
      timestamp
    });
    state.lastErrors.splice(0, Math.max(state.lastErrors.length - 20, 0));
  }
}

module.exports = {
  createCrowdEngine
};
