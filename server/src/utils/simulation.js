/**
 * Dev-only simulation helpers.
 * These are disabled in production by index.js (returns 403).
 */

const { centerOfPolygon } = require("../store/locationStore");
const { getNearestExitRoute } = require("../engines/routingEngine");

/**
 * Seeds simulated users spread across a zone polygon.
 *
 * @param {object} locationStore
 * @param {string} eventId
 * @param {object} venueData
 * @param {string} zoneId
 * @param {number} count
 * @param {string} prefix - userId prefix for simulated users
 */
function seedUsersInZone(locationStore, eventId, venueData, zoneId, count, prefix) {
  const zone = venueData.zones.find((candidate) => candidate.id === zoneId);
  if (!zone) return;

  const [centerX, centerY] = centerOfPolygon(zone.polygon);
  for (let index = 0; index < count; index += 1) {
    locationStore.upsertLocation(eventId, {
      userId: `${prefix}-${index}`,
      lat: centerX + (index % 10) - 5,
      lng: centerY + (Math.floor(index / 10) % 10) - 5,
      accuracy: 5,
      zoneId,
      timestamp: Date.now(),
      simulated: true
    });
  }
}

/**
 * Runs a named simulation scenario.
 *
 * @param {object} options
 * @returns {{ ok: boolean, scenario?: string, error?: string }}
 */
function runSimulation({ io, state, locationStore, venueData, eventId, scenario }) {
  if (scenario === "clear") {
    locationStore.clearSimulated(eventId);
    state.evacuationState.delete(eventId);
    io.to(`event:${eventId}`).emit("evacuation:end", { eventId });
    return { ok: true, scenario };
  }

  if (scenario === "surge_gate_b") {
    locationStore.clearSimulated(eventId);
    seedUsersInZone(locationStore, eventId, venueData, "gate-b", 400, "sim-gate-b");
    return { ok: true, scenario, injectedUsers: 400 };
  }

  if (scenario === "full_stadium") {
    locationStore.clearSimulated(eventId);
    let total = 0;
    const crowdZones = venueData.zones.filter((zone) =>
      ["gate", "section", "concourse", "food", "toilet"].includes(zone.type)
    );
    for (const zone of crowdZones) {
      const amount = Math.floor(8000 / crowdZones.length);
      total += amount;
      seedUsersInZone(locationStore, eventId, venueData, zone.id, amount, `sim-${zone.id}`);
    }
    return { ok: true, scenario, injectedUsers: total };
  }

  if (scenario === "sos_test") {
    const fakeAlert = {
      id: `fake-sos-${Date.now()}`,
      eventId,
      userId: "sim-user",
      lat: 350,
      lng: 250,
      zoneId: "section-12",
      status: "open",
      createdAt: Date.now()
    };
    const alerts = state.sosAlerts.get(eventId) || [];
    state.sosAlerts.set(eventId, [fakeAlert, ...alerts]);
    io.to(`admin:${eventId}`).emit("sos:alert", fakeAlert);
    return { ok: true, scenario };
  }

  if (scenario === "evacuation_test") {
    const exitRoutes = venueData.zones
      .filter((zone) => zone.type === "section")
      .map((zone) => {
        const route = getNearestExitRoute({ venueData, state, eventId, from: zone.id });
        return {
          zoneId: zone.id,
          path: route?.path || [],
          exitGate: route?.exitGate || "Main Exit Plaza"
        };
      });

    io.to(`event:${eventId}`).emit("evacuation:start", {
      eventId,
      message: "Please proceed calmly to the nearest exit.",
      exitRoutes
    });
    return { ok: true, scenario };
  }

  return { ok: false, error: "Unknown scenario" };
}

module.exports = { runSimulation, seedUsersInZone };
