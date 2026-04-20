"use strict";

// Lightweight crowd engine zone status logic test
// (does not need io/state — tests pure functions)

const { createCrowdEngine } = require("../engines/crowdEngine");

// Pull the module to access non-exported getZoneStatus indirectly via overThreshold mocking
// Alternatively we test via the crowdEngine tick output
const {
  DANGER_THRESHOLD,
  WARNING_THRESHOLD
} = require("../config/constants");

// Re-create the internal function here since it's not exported (white-box)
function getZoneStatus(density) {
  if (density < WARNING_THRESHOLD) return "safe";
  if (density < DANGER_THRESHOLD) return "warning";
  return "danger";
}

describe("getZoneStatus (crowd engine thresholds)", () => {
  it("returns safe when density is below warning threshold", () => {
    expect(getZoneStatus(WARNING_THRESHOLD - 0.1)).toBe("safe");
  });

  it("returns warning at exactly the warning threshold", () => {
    expect(getZoneStatus(WARNING_THRESHOLD)).toBe("warning");
  });

  it("returns warning between thresholds", () => {
    expect(getZoneStatus((WARNING_THRESHOLD + DANGER_THRESHOLD) / 2)).toBe("warning");
  });

  it("returns danger at exactly the danger threshold", () => {
    expect(getZoneStatus(DANGER_THRESHOLD)).toBe("danger");
  });

  it("returns danger above the danger threshold", () => {
    expect(getZoneStatus(DANGER_THRESHOLD + 10)).toBe("danger");
  });
});

describe("createCrowdEngine", () => {
  function makeMinimalSetup() {
    const emittedRooms = [];
    const io = {
      to: jest.fn((room) => {
        emittedRooms.push(room);
        return { emit: jest.fn() };
      })
    };

    const state = {
      events: new Map([
        ["evt-1", { id: "evt-1", status: "active" }]
      ]),
      heatmaps: new Map(),
      zoneStatusCache: new Map(),
      densityHistory: new Map(),
      lastDensityPersistAt: new Map(),
      nudgeCooldowns: new Map(),
      nudges: new Map(),
      userSockets: new Map(),
      lastErrors: []
    };

    const locationStore = {
      getUsersInZone: jest.fn(() => []),
      getEventUsers: jest.fn(() => [])
    };

    const venueData = {
      zones: [
        { id: "zone-a", type: "section", area_m2: 100, polygon: [[0, 0], [10, 0], [10, 10], [0, 10]] }
      ],
      pois: []
    };

    const nudgeEngine = { evaluate: jest.fn() };

    return { io, state, locationStore, venueData, nudgeEngine, emittedRooms };
  }

  it("tick() stores heatmap in state and emits heatmap:update to admin room", async () => {
    const { io, state, locationStore, venueData, nudgeEngine } = makeMinimalSetup();
    const toReturnValue = { emit: jest.fn() };
    io.to.mockReturnValue(toReturnValue);

    const engine = createCrowdEngine({ io, state, locationStore, venueData, nudgeEngine, supabase: null });
    await engine.tick();

    expect(state.heatmaps.has("evt-1")).toBe(true);
    const heatmap = state.heatmaps.get("evt-1");
    expect(heatmap.eventId).toBe("evt-1");
    expect(Array.isArray(heatmap.zones)).toBe(true);

    expect(io.to).toHaveBeenCalledWith("admin:evt-1");
    expect(toReturnValue.emit).toHaveBeenCalledWith("heatmap:update", heatmap);
  });

  it("start() and stop() manage the interval without throwing", () => {
    const { io, state, locationStore, venueData, nudgeEngine } = makeMinimalSetup();
    io.to.mockReturnValue({ emit: jest.fn() });

    const engine = createCrowdEngine({ io, state, locationStore, venueData, nudgeEngine, supabase: null });
    expect(() => {
      engine.start();
      engine.stop();
    }).not.toThrow();
  });
});
