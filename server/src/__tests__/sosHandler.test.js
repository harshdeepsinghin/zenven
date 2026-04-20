"use strict";

const { registerSosHandlers } = require("../socket/sosHandler");

function makeSocket(overrides = {}) {
  return {
    data: { eventId: "evt-1", userId: "user-1", ...overrides.data },
    on: jest.fn((event, handler) => {
      if (!makeSocket._handlers) makeSocket._handlers = {};
      makeSocket._handlers[event] = handler;
    }),
    emit: jest.fn(),
    ...overrides
  };
}

function makeIo() {
  const emitMock = jest.fn();
  return {
    to: jest.fn(() => ({ emit: emitMock })),
    _emitMock: emitMock
  };
}

function makeState() {
  return {
    sosAlerts: new Map(),
    lastErrors: []
  };
}

// Helper: extract handler registered via socket.on(event, handler)
function captureHandlers(socket) {
  const handlers = {};
  socket.on.mockImplementation((event, handler) => {
    handlers[event] = handler;
  });
  return handlers;
}

describe("registerSosHandlers", () => {
  describe("sos:trigger", () => {
    it("stores the alert and emits to admin room", async () => {
      const io = makeIo();
      const socket = makeSocket();
      const state = makeState();
      const handlers = captureHandlers(socket);

      registerSosHandlers({ io, socket, state, supabase: null });

      const callback = jest.fn();
      await handlers["sos:trigger"]({ lat: 100, lng: 200 }, callback);

      // Alert stored
      const alerts = state.sosAlerts.get("evt-1");
      expect(alerts).toHaveLength(1);
      expect(alerts[0].status).toBe("open");
      expect(alerts[0].lat).toBe(100);

      // Emitted to admin room
      expect(io.to).toHaveBeenCalledWith("admin:evt-1");
      expect(io._emitMock).toHaveBeenCalledWith("sos:alert", alerts[0]);

      // Callback called with ok
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    });

    it("rejects invalid coordinates", async () => {
      const io = makeIo();
      const socket = makeSocket();
      const state = makeState();
      const handlers = captureHandlers(socket);

      registerSosHandlers({ io, socket, state, supabase: null });

      const callback = jest.fn();
      await handlers["sos:trigger"]({ lat: "not-a-number", lng: 200 }, callback);

      expect(state.sosAlerts.get("evt-1")).toBeUndefined();
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
    });

    it("rejects when socket has no eventId", async () => {
      const io = makeIo();
      const socket = makeSocket({ data: { eventId: null, userId: "u1" } });
      const state = makeState();
      const handlers = captureHandlers(socket);

      registerSosHandlers({ io, socket, state, supabase: null });

      const callback = jest.fn();
      await handlers["sos:trigger"]({ lat: 100, lng: 200 }, callback);

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
    });
  });

  describe("sos:resolve", () => {
    it("marks an existing alert as resolved", async () => {
      const io = makeIo();
      const socket = makeSocket();
      const state = makeState();

      const existingAlert = {
        id: "sos-abc",
        eventId: "evt-1",
        userId: "user-1",
        lat: 100,
        lng: 200,
        status: "open",
        createdAt: Date.now()
      };
      state.sosAlerts.set("evt-1", [existingAlert]);

      const handlers = captureHandlers(socket);
      registerSosHandlers({ io, socket, state, supabase: null });

      handlers["sos:resolve"]({ sosId: "sos-abc", resolvedBy: "admin-1", notes: "Handled" });

      const alerts = state.sosAlerts.get("evt-1");
      const resolved = alerts.find((a) => a.id === "sos-abc");
      expect(resolved.status).toBe("resolved");
      expect(resolved.resolvedBy).toBe("admin-1");

      expect(io.to).toHaveBeenCalledWith("admin:evt-1");
      expect(io._emitMock).toHaveBeenCalledWith("sos:resolved", expect.objectContaining({ id: "sos-abc" }));
    });
  });
});
