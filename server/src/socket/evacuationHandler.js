const { roomNames } = require("../config/constants");
const { getNearestExitRoute } = require("../engines/routingEngine");

function registerEvacuationHandlers({ io, socket, state, venueData }) {
  socket.on("admin:evacuate", ({ eventId, message }) => {
    const exitRoutes = venueData.zones
      .filter((zone) => zone.type === "section" || zone.type === "concourse" || zone.type === "gate")
      .map((zone) => {
        const route = getNearestExitRoute({
          venueData,
          state,
          eventId,
          from: zone.id
        });

        return route
          ? {
              zoneId: zone.id,
              path: route.path,
              exitGate: route.exitGate
            }
          : null;
      })
      .filter(Boolean);

    state.evacuationState.set(eventId, {
      active: true,
      message,
      exitRoutes,
      startedAt: Date.now()
    });

    io.to(roomNames.event(eventId)).emit("evacuation:start", {
      eventId,
      message,
      exitRoutes
    });
  });
}

module.exports = {
  registerEvacuationHandlers
};
