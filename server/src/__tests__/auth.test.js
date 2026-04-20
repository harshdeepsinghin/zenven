"use strict";

const { createAuthHelpers } = require("../routes/auth");

function makeState(overrides = {}) {
  return {
    userProfiles: new Map(),
    ...overrides
  };
}

function makeReq(overrides = {}) {
  return {
    headers: {},
    body: {},
    query: {},
    ...overrides
  };
}

describe("createAuthHelpers", () => {
  describe("optionalAuth", () => {
    it("sets req.user from x-user-id header with default fan role", async () => {
      const state = makeState();
      const { optionalAuth } = createAuthHelpers(state);
      const req = makeReq({ headers: { "x-user-id": "user-abc" } });
      const next = jest.fn();

      await optionalAuth(req, {}, next);

      expect(req.user).toEqual({ id: "user-abc", role: "fan" });
      expect(next).toHaveBeenCalled();
    });

    it("enforces the role whitelist — unknown role falls back to fan", async () => {
      const state = makeState();
      const { optionalAuth } = createAuthHelpers(state);
      const req = makeReq({
        headers: { "x-user-id": "user-xyz", "x-user-role": "superuser" }
      });
      const next = jest.fn();

      await optionalAuth(req, {}, next);

      expect(req.user.role).toBe("fan");
    });

    it("truncates userId longer than 64 characters", async () => {
      const state = makeState();
      const { optionalAuth } = createAuthHelpers(state);
      const longId = "a".repeat(100);
      const req = makeReq({ headers: { "x-user-id": longId } });
      const next = jest.fn();

      await optionalAuth(req, {}, next);

      expect(req.user.id.length).toBeLessThanOrEqual(64);
    });

    it("leaves req.user undefined when no identity is provided", async () => {
      const state = makeState();
      const { optionalAuth } = createAuthHelpers(state);
      const req = makeReq();
      const next = jest.fn();

      await optionalAuth(req, {}, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe("requireAdmin", () => {
    it("returns 403 for fan role", () => {
      const state = makeState();
      const { requireAdmin } = createAuthHelpers(state);
      const req = { user: { id: "u1", role: "fan" } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next() for admin role", () => {
      const state = makeState();
      const { requireAdmin } = createAuthHelpers(state);
      const req = { user: { id: "u1", role: "admin" } };
      const res = {};
      const next = jest.fn();

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("calls next() for security role", () => {
      const state = makeState();
      const { requireAdmin } = createAuthHelpers(state);
      const req = { user: { id: "u1", role: "security" } };
      const next = jest.fn();

      requireAdmin(req, {}, next);

      expect(next).toHaveBeenCalled();
    });

    it("returns 403 when req.user is missing", () => {
      const state = makeState();
      const { requireAdmin } = createAuthHelpers(state);
      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
