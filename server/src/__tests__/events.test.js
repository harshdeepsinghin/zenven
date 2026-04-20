"use strict";

const express = require("express");
const request = require("supertest");
const { createEventsRouter } = require("../routes/events");
const { createAuthHelpers } = require("../routes/auth");

function makeState() {
  return {
    events: new Map(),
    eventUsers: new Map(),
    sosAlerts: new Map(),
    announcements: new Map(),
    groups: new Map(),
    userGroups: new Map(),
    userProfiles: new Map([
      ["local-admin", { id: "local-admin", role: "admin", name: "Admin" }]
    ])
  };
}

const venueData = {
  id: "venue-test",
  zones: [],
  pois: []
};

function buildApp(state) {
  const app = express();
  app.use(express.json());
  const authHelpers = createAuthHelpers(state);
  app.use(createEventsRouter({ state, venueData, authHelpers }));
  return app;
}

describe("POST /events (create event)", () => {
  it("returns 403 when caller is not admin", async () => {
    const state = makeState();
    const app = buildApp(state);
    const res = await request(app)
      .post("/events")
      .set("x-user-id", "fan-1")
      .set("x-user-role", "fan")
      .send({ name: "Test Event", capacity: 5000 });

    expect(res.status).toBe(403);
  });

  it("creates an event when admin calls it", async () => {
    const state = makeState();
    const app = buildApp(state);
    const res = await request(app)
      .post("/events")
      .set("x-user-id", "local-admin")
      .set("x-user-role", "admin")
      .send({ name: "Test Event", capacity: 5000 });

    expect(res.status).toBe(201);
    expect(res.body.event.name).toBe("Test Event");
    expect(res.body.event.capacity).toBe(5000);
    expect(res.body.qrValue).toMatch(/^\d{6}$/);
  });

  it("returns 400 for capacity out of range", async () => {
    const state = makeState();
    const app = buildApp(state);
    const res = await request(app)
      .post("/events")
      .set("x-user-id", "local-admin")
      .set("x-user-role", "admin")
      .send({ name: "Test Event", capacity: 999999 });

    expect(res.status).toBe(400);
  });

  it("strips HTML from event name", async () => {
    const state = makeState();
    const app = buildApp(state);
    const res = await request(app)
      .post("/events")
      .set("x-user-id", "local-admin")
      .set("x-user-role", "admin")
      .send({ name: "<script>alert(1)</script>My Event", capacity: 1000 });

    expect(res.status).toBe(201);
    expect(res.body.event.name).not.toContain("<script>");
  });
});

describe("POST /events/:code/join", () => {
  function seedEvent(state, code = "TEST01") {
    const eventId = "evt-seed";
    state.events.set(eventId, {
      id: eventId,
      name: "Seeded Event",
      eventCode: code,
      status: "active",
      capacity: 1000
    });
    return eventId;
  }

  it("allows a fan to join with a valid code", async () => {
    const state = makeState();
    seedEvent(state, "JOIN01");
    const app = buildApp(state);

    const res = await request(app)
      .post("/events/JOIN01/join")
      .send({ name: "Test Fan", role: "fan" });

    expect(res.status).toBe(200);
    expect(res.body.eventId).toBe("evt-seed");
    expect(res.body.userId).toBeTruthy();
    expect(res.body.venueData).toBeDefined();
  });

  it("returns 404 for an invalid event code", async () => {
    const state = makeState();
    const app = buildApp(state);

    const res = await request(app)
      .post("/events/BADCOD/join")
      .send({ name: "Test Fan" });

    expect(res.status).toBe(404);
  });
});
