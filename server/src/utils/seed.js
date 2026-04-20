/**
 * Seeds the default in-memory state for the demo event.
 * Extracted from index.js to keep the entry point lean.
 */

const { DEFAULT_EVENT_CODE, DEFAULT_EVENT_NAME } = require("../config/constants");

/**
 * @param {object} state - The global server state object
 * @param {object} venueData - Venue JSON data
 */
function seedDefaultState(state, venueData) {
  const eventId = "00000000-0000-4000-8000-000000000001";

  state.userProfiles.set("local-admin", {
    id: "local-admin",
    role: "admin",
    name: "Venue Admin",
    email: "admin@zenven.local"
  });

  state.events.set(eventId, {
    id: eventId,
    name: DEFAULT_EVENT_NAME,
    date: new Date(Date.now() + 86400000).toISOString(),
    capacity: 10000,
    venueId: venueData.id,
    status: "active",
    eventCode: DEFAULT_EVENT_CODE,
    createdBy: "local-admin"
  });
}

module.exports = { seedDefaultState };
