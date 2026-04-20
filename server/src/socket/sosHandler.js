const { roomNames } = require("../config/constants");
const { v4: uuid } = require("uuid");

function registerSosHandlers({ io, socket, state, supabase }) {
  socket.on("sos:trigger", async (payload, callback) => {
    const eventId = socket.data.eventId;
    const sosAlert = {
      id: uuid(),
      eventId,
      userId: payload.userId || socket.data.userId,
      lat: Number(payload.lat),
      lng: Number(payload.lng),
      zoneId: payload.zoneId,
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
          zone_id: null,
          created_at: new Date(sosAlert.createdAt).toISOString()
        });
      } catch (error) {
        state.lastErrors.push({
          scope: "sos_alert",
          message: error.message,
          timestamp: Date.now()
        });
      }
    }

    if (typeof callback === "function") {
      callback({
        ok: true,
        sosId: sosAlert.id
      });
    }
  });

  socket.on("sos:resolve", ({ sosId, resolvedBy, notes }) => {
    const eventId = socket.data.eventId;
    const alerts = state.sosAlerts.get(eventId) || [];
    const nextAlerts = alerts.map((alert) => {
      if (alert.id !== sosId) {
        return alert;
      }

      return {
        ...alert,
        status: "resolved",
        resolvedBy,
        notes,
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

module.exports = {
  registerSosHandlers
};
