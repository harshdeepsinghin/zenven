const express = require("express");
const { v4: uuid } = require("uuid");

const NAME_MAX_LENGTH = 200;
const CAPACITY_MIN = 1;
const CAPACITY_MAX = 100_000;

/**
 * Strips HTML tags from a string to prevent stored XSS.
 * @param {string} str
 * @returns {string}
 */
function stripHtml(str) {
  return String(str).replace(/<[^>]*>/g, "").trim();
}

/**
 * Creates the events router.
 *
 * Routes:
 *   POST   /events                      Create a new event (admin only)
 *   GET    /events/:id                  Get event details
 *   POST   /events/:code/join           Fan joins an event by code
 *   POST   /events/:eventId/groups      Create a group within an event
 *   POST   /groups/join                 Join an existing group by code
 *   GET    /groups/:groupId             Get group details
 *
 * @param {{ state: object, venueData: object, authHelpers: object }} deps
 */
function createEventsRouter({ state, venueData, authHelpers }) {
  const router = express.Router();
  router.use(express.json());
  router.use(authHelpers.optionalAuth);

  /** Create a new event — admin only. */
  router.post("/events", authHelpers.requireAdmin, (req, res) => {
    const rawName = req.body.name || "Untitled Event";
    const name = stripHtml(rawName).slice(0, NAME_MAX_LENGTH);
    const capacity = Number(req.body.capacity || 10000);

    if (!Number.isFinite(capacity) || capacity < CAPACITY_MIN || capacity > CAPACITY_MAX) {
      return res.status(400).json({
        error: `capacity must be an integer between ${CAPACITY_MIN} and ${CAPACITY_MAX}`
      });
    }

    const eventId = uuid();
    const eventCode = generateEventCode(state);
    const event = {
      id: eventId,
      name,
      date: req.body.date || new Date().toISOString(),
      capacity,
      venueId: venueData.id,
      status: req.body.status || "active",
      eventCode,
      createdBy: req.user.id
    };

    state.events.set(eventId, event);
    return res.status(201).json({ event, qrValue: eventCode });
  });

  /** Get full event details including venue, SOS alerts and announcements. */
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

  /** Fan joins an event using a 6-digit event code. */
  router.post("/events/:code/join", (req, res) => {
    const event = [...state.events.values()].find(
      (candidate) => candidate.eventCode === req.params.code
    );
    if (!event) {
      return res.status(404).json({ error: "Invalid event code" });
    }

    const userId = req.body.userId || uuid();
    const role = req.body.role || "fan";
    const name = stripHtml(req.body.name || `Fan ${String(userId).slice(0, 4)}`).slice(0, 80);

    state.userProfiles.set(userId, {
      id: userId,
      role,
      email: req.body.email || null,
      name
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

    return res.json({ eventId: event.id, venueData, userToken: `dev-${userId}`, userId, role, event });
  });

  /** Create a group within an event. */
  router.post("/events/:eventId/groups", (req, res) => {
    const groupId = uuid();
    const userId = req.body.userId;
    const group = {
      id: groupId,
      eventId: req.params.eventId,
      name: stripHtml(req.body.name || "Squad").slice(0, 80),
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

    return res.status(201).json({ group: serializeGroup(group) });
  });

  /** Join an existing group by its 4-digit code. */
  router.post("/groups/join", (req, res) => {
    const group = [...state.groups.values()].find(
      (candidate) => candidate.joinCode === req.body.joinCode
    );
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    group.members.add(req.body.userId);
    if (!state.userGroups.has(req.body.userId)) {
      state.userGroups.set(req.body.userId, new Set());
    }
    state.userGroups.get(req.body.userId).add(group.id);

    return res.json({ group: serializeGroup(group) });
  });

  /** Get group details by ID. */
  router.get("/groups/:groupId", (req, res) => {
    const group = state.groups.get(req.params.groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    return res.json({ group: serializeGroup(group) });
  });

  return router;
}

/**
 * Generates a unique 6-digit event code.
 * @param {object} state
 * @returns {string}
 */
function generateEventCode(state) {
  let nextCode;
  do {
    nextCode = String(Math.floor(100000 + Math.random() * 900000));
  } while ([...state.events.values()].some((event) => event.eventCode === nextCode));
  return nextCode;
}

/**
 * Generates a unique 4-digit group join code.
 * @param {object} state
 * @returns {string}
 */
function generateGroupCode(state) {
  let nextCode;
  do {
    nextCode = String(Math.floor(1000 + Math.random() * 9000));
  } while ([...state.groups.values()].some((group) => group.joinCode === nextCode));
  return nextCode;
}

/**
 * Serialises a group's Set-based members to a plain array.
 * @param {object} group
 * @returns {object}
 */
function serializeGroup(group) {
  return { ...group, members: [...group.members] };
}

module.exports = { createEventsRouter };
