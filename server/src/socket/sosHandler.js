const { roomNames } = require("../config/constants");
const { v4: uuid } = require("uuid");

// Sane coordinate bounds (venue uses pixel-space coords; allow 0–5000)
const COORD_MIN = -10000;
const COORD_MAX = 10000;

function isValidCoord(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= COORD_MIN && n <= COORD_MAX;
}

function registerSosHandlers({ io, socket, state, supabase }) {
  /** Fan triggers an SOS alert. */
  socket.on("sos:trigger", async (payload, callback) => {
    const eventId = socket.data.eventId;

    if (!eventId) {
      if (typeof callback === "function") callback({ ok: false, error: "Not joined to an event" });
      return;
    }

    // Validate coordinates
    if (!isValidCoord(payload.lat) || !isValidCoord(payload.lng)) {
      if (typeof callback === "function") callback({ ok: false, error: "Invalid coordinates" });
      return;
    }

    const sosAlert = {
      id: uuid(),
      eventId,
      userId: payload.userId || socket.data.userId,
      lat: Number(payload.lat),
      lng: Number(payload.lng),
      zoneId: payload.zoneId || null,
      status: "open",
      notes: "",
      createdAt: Date.now()
    };

    const alerts = state.sosAlerts.get(eventId) || [];
    state.sosAlerts.set(eventId, [sosAlert, ...alerts]);
    io.to(roomNames.admin(eventId)).emit("sos:alert", sosAlert);

    if (supabase) {
      try {
        await supabase.from("sos_alerts").insert({
          id: sosAlert.id,
          event_id: sosAlert.eventId,
          user_id: sosAlert.userId,
          lat: sosAlert.lat,
          lng: sosAlert.lng,
          status: sosAlert.status,
          zone_id: sosAlert.zoneId,
          created_at: new Date(sosAlert.createdAt).toISOString()
        });
      } catch (error) {
        const errors = state.lastErrors;
        errors.push({ scope: "sos_alert", message: error.message, timestamp: Date.now() });
        if (errors.length > 20) errors.splice(0, errors.length - 20);
      }
    }

    if (typeof callback === "function") {
      callback({ ok: true, sosId: sosAlert.id });
    }
  });

  /** Admin resolves an SOS alert. */
  socket.on("sos:resolve", ({ sosId, resolvedBy, notes }) => {
    const eventId = socket.data.eventId;
    if (!eventId || !sosId) return;

    const alerts = state.sosAlerts.get(eventId) || [];
    const nextAlerts = alerts.map((alert) => {
      if (alert.id !== sosId) return alert;
      return {
        ...alert,
        status: "resolved",
        resolvedBy,
        notes: typeof notes === "string" ? notes.slice(0, 500) : "",
        resolvedAt: Date.now()
      };
    });

    state.sosAlerts.set(eventId, nextAlerts);
    const resolvedAlert = nextAlerts.find((alert) => alert.id === sosId);
    if (resolvedAlert) {
      io.to(roomNames.admin(eventId)).emit("sos:resolved", resolvedAlert);
    }
  });
}

module.exports = { registerSosHandlers };
