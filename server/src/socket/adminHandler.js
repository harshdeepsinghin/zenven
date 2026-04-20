const { roomNames } = require("../config/constants");

function registerAdminHandlers({ io, socket, state, nudgeEngine }) {
  socket.on("admin:gate:toggle", ({ gateId, status }) => {
    const eventId = socket.data.eventId;
    const existingStatuses = state.gateStatuses.get(eventId) || {};
    state.gateStatuses.set(eventId, {
      ...existingStatuses,
      [gateId]: status
    });

    nudgeEngine.notifyGateChange(eventId, gateId, status);
    io.to(roomNames.admin(eventId)).emit("gate:status", {
      gateId,
      status
    });
  });

  socket.on("admin:announce", ({ eventId, message, type }) => {
    const announcement = {
      id: `${eventId}-${Date.now()}`,
      eventId,
      message,
      type,
      sentBy: socket.data.userId,
      sentAt: Date.now()
    };
    const announcements = state.announcements.get(eventId) || [];
    state.announcements.set(eventId, [announcement, ...announcements].slice(0, 50));
    io.to(roomNames.event(eventId)).emit("announcement:receive", announcement);
  });
}

module.exports = {
  registerAdminHandlers
};
