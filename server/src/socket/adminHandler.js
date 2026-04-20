const { roomNames } = require("../config/constants");

const ADMIN_ROLES = new Set(["admin", "security"]);

/**
 * Guards a socket handler so only admin/security sockets may call it.
 * @param {import('socket.io').Socket} socket
 * @returns {boolean} true if the socket is authorised
 */
function isAdminSocket(socket) {
  return ADMIN_ROLES.has(socket.data.role);
}

function registerAdminHandlers({ io, socket, state, nudgeEngine }) {
  /** Toggle a gate's operational status — admin/security only. */
  socket.on("admin:gate:toggle", ({ gateId, status }) => {
    if (!isAdminSocket(socket)) {
      socket.emit("error", { message: "Unauthorised: admin access required" });
      return;
    }

    const eventId = socket.data.eventId;
    if (!eventId || !gateId || !status) return;

    const existingStatuses = state.gateStatuses.get(eventId) || {};
    state.gateStatuses.set(eventId, { ...existingStatuses, [gateId]: status });

    nudgeEngine.notifyGateChange(eventId, gateId, status);
    io.to(roomNames.admin(eventId)).emit("gate:status", { gateId, status });
  });

  /** Broadcast an announcement to the event — admin/security only. */
  socket.on("admin:announce", ({ eventId, message, type }) => {
    if (!isAdminSocket(socket)) {
      socket.emit("error", { message: "Unauthorised: admin access required" });
      return;
    }

    if (!eventId || typeof message !== "string" || !message.trim()) return;

    const announcement = {
      id: `${eventId}-${Date.now()}`,
      eventId,
      message: message.slice(0, 500), // cap length
      type,
      sentBy: socket.data.userId,
      sentAt: Date.now()
    };

    const announcements = state.announcements.get(eventId) || [];
    state.announcements.set(eventId, [announcement, ...announcements].slice(0, 50));
    io.to(roomNames.event(eventId)).emit("announcement:receive", announcement);
  });
}

module.exports = { registerAdminHandlers };
