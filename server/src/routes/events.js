const express = require("express");
const { v4: uuid } = require("uuid");

function createEventsRouter({ state, venueData, authHelpers }) {
  const router = express.Router();
  router.use(express.json());
  router.use(authHelpers.optionalAuth);

  router.post("/events", authHelpers.requireAdmin, (req, res) => {
    const eventId = uuid();
    const eventCode = generateEventCode(state);
    const event = {
      id: eventId,
      name: req.body.name || "Untitled Event",
      date: req.body.date || new Date().toISOString(),
      capacity: Number(req.body.capacity || 10000),
      venueId: venueData.id,
      status: req.body.status || "active",
      eventCode,
      createdBy: req.user.id
    };

    state.events.set(eventId, event);
    res.status(201).json({
      event,
      qrValue: eventCode
    });
  });

  router.get("/events/:id", (req, res) => {
    const event = state.events.get(req.params.id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    return res.json({
      event,
      venueData,
      sosAlerts: state.sosAlerts.get(event.id) || [],
      announcements: state.announcements.get(event.id) || []
    });
  });

  router.post("/events/:code/join", (req, res) => {
    const event = [...state.events.values()].find((candidate) => candidate.eventCode === req.params.code);
    if (!event) {
      return res.status(404).json({ error: "Invalid event code" });
    }

    const userId = req.body.userId || uuid();
    const role = req.body.role || "fan";
    state.userProfiles.set(userId, {
      id: userId,
      role,
      email: req.body.email || null,
      name: req.body.name || `Fan ${String(userId).slice(0, 4)}`
    });

    const eventUsers = state.eventUsers.get(event.id) || new Map();
    eventUsers.set(userId, {
      id: uuid(),
      eventId: event.id,
      userId,
      joinedAt: Date.now(),
      ticketRef: req.body.ticketRef || null
    });
    state.eventUsers.set(event.id, eventUsers);

    return res.json({
      eventId: event.id,
      venueData,
      userToken: `dev-${userId}`,
      userId,
      role,
      event
    });
  });

  router.post("/events/:eventId/groups", (req, res) => {
    const groupId = uuid();
    const userId = req.body.userId;
    const group = {
      id: groupId,
      eventId: req.params.eventId,
      name: req.body.name || "Squad",
      joinCode: generateGroupCode(state),
      meetingPointZoneId: req.body.meetingPointZoneId || "main-exit",
      createdBy: userId,
      members: new Set([userId])
    };

    state.groups.set(groupId, group);
    if (!state.userGroups.has(userId)) {
      state.userGroups.set(userId, new Set());
    }
    state.userGroups.get(userId).add(groupId);

    return res.status(201).json({
      group: serializeGroup(group)
    });
  });

  router.post("/groups/join", (req, res) => {
    const group = [...state.groups.values()].find((candidate) => candidate.joinCode === req.body.joinCode);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    group.members.add(req.body.userId);
    if (!state.userGroups.has(req.body.userId)) {
      state.userGroups.set(req.body.userId, new Set());
    }
    state.userGroups.get(req.body.userId).add(group.id);

    return res.json({
      group: serializeGroup(group)
    });
  });

  router.get("/groups/:groupId", (req, res) => {
    const group = state.groups.get(req.params.groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    return res.json({
      group: serializeGroup(group)
    });
  });

  return router;
}

function generateEventCode(state) {
  let nextCode = "000000";
  do {
    nextCode = String(Math.floor(100000 + Math.random() * 900000));
  } while ([...state.events.values()].some((event) => event.eventCode === nextCode));

  return nextCode;
}

function generateGroupCode(state) {
  let nextCode = "0000";
  do {
    nextCode = String(Math.floor(1000 + Math.random() * 9000));
  } while ([...state.groups.values()].some((group) => group.joinCode === nextCode));

  return nextCode;
}

function serializeGroup(group) {
  return {
    ...group,
    members: [...group.members]
  };
}

module.exports = {
  createEventsRouter
};
