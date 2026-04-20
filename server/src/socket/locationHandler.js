const { roomNames } = require("../config/constants");
const { pointInPolygon } = require("../store/locationStore");

function registerLocationHandlers({ io, socket, state, locationStore, venueData }) {
  socket.on("join:event", ({ eventId, userId, role }) => {
    socket.data.eventId = eventId;
    socket.data.userId = userId;
    socket.data.role = role;
    socket.join(roomNames.event(eventId));

    if (role === "admin" || role === "security") {
      socket.join(roomNames.admin(eventId));
    }

    if (!state.userSockets.has(userId)) {
      state.userSockets.set(userId, new Set());
    }

    state.userSockets.get(userId).add(socket.id);
    const latestHeatmap = state.heatmaps.get(eventId);
    if (latestHeatmap && (role === "admin" || role === "security")) {
      socket.emit("heatmap:update", latestHeatmap);
    }
  });

  socket.on("join:group", ({ groupId, userId }) => {
    socket.join(roomNames.group(groupId));
    const group = state.groups.get(groupId);
    if (!group) {
      return;
    }

    group.members.add(userId);
    emitGroupPositions(io, state, locationStore, groupId, group, socket.data.eventId);
  });

  socket.on("location:update", (payload) => {
    const eventId = socket.data.eventId;
    const userId = payload.userId || socket.data.userId;

    if (!eventId || !userId) {
      return;
    }

    const zoneId = payload.zoneId || inferZoneId(venueData, payload);
    const location = locationStore.upsertLocation(eventId, {
      ...payload,
      userId,
      zoneId
    });

    const groups = state.userGroups.get(userId) || new Set();
    for (const groupId of groups.values()) {
      const group = state.groups.get(groupId);
      if (group) {
        emitGroupPositions(io, state, locationStore, groupId, group, eventId);
      }
    }

    socket.emit("location:ack", {
      userId,
      zoneId: location.zoneId,
      timestamp: Date.now()
    });
  });

  socket.on("disconnect", () => {
    const userId = socket.data.userId;
    if (!userId) {
      return;
    }

    const sockets = state.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        state.userSockets.delete(userId);
      }
    }
  });
}

function emitGroupPositions(io, state, locationStore, groupId, group, eventId) {
  const members = [...group.members];
  const positions = locationStore.getUsersByIds(eventId, members).map((user) => ({
    userId: user.userId,
    lat: user.lat,
    lng: user.lng,
    zoneId: user.zoneId,
    name: state.userProfiles.get(user.userId)?.name || "Fan"
  }));

  io.to(roomNames.group(groupId)).emit("group:positions", {
    groupId,
    positions
  });
}

function inferZoneId(venueData, payload) {
  const point = [Number(payload.lat), Number(payload.lng)];
  const matchedZone = venueData.zones.find((zone) => pointInPolygon(point, zone.polygon));
  return matchedZone?.id || null;
}

module.exports = {
  registerLocationHandlers
};
