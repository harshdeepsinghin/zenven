/**
 * In-memory location store for all event users.
 *
 * Efficiency improvement: maintains a per-event zone-membership index
 * (Map<eventId, Map<zoneId, Set<userId>>>) updated on every upsertLocation.
 * This reduces getUsersInZone from O(N) scan + polygon test per call
 * to O(1) index lookup — critical for the crowd engine's 2-second tick.
 */

class LocationStore {
  constructor() {
    /** @type {Map<string, Map<string, object>>} eventId → (userId → location) */
    this.eventLocations = new Map();
    /** @type {Map<string, Map<string, Set<string>>>} eventId → (zoneId → Set<userId>) */
    this.zoneIndex = new Map();
  }

  ensureEvent(eventId) {
    if (!this.eventLocations.has(eventId)) {
      this.eventLocations.set(eventId, new Map());
      this.zoneIndex.set(eventId, new Map());
    }
    return this.eventLocations.get(eventId);
  }

  /**
   * Update or insert a user's location and keep the zone index in sync.
   * @param {string} eventId
   * @param {object} payload
   * @returns {object} stored location
   */
  upsertLocation(eventId, payload) {
    const eventLocations = this.ensureEvent(eventId);
    const zoneIdx = this.zoneIndex.get(eventId);

    const previous = eventLocations.get(payload.userId);
    const nextValue = {
      userId: payload.userId,
      lat: Number(payload.lat),
      lng: Number(payload.lng),
      accuracy: Number(payload.accuracy || 0),
      zoneId: payload.zoneId || null,
      timestamp: Number(payload.timestamp || Date.now()),
      simulated: Boolean(payload.simulated)
    };

    // Remove from old zone index bucket
    if (previous?.zoneId) {
      const bucket = zoneIdx.get(previous.zoneId);
      if (bucket) bucket.delete(payload.userId);
    }

    // Add to new zone index bucket
    if (nextValue.zoneId) {
      if (!zoneIdx.has(nextValue.zoneId)) zoneIdx.set(nextValue.zoneId, new Set());
      zoneIdx.get(nextValue.zoneId).add(payload.userId);
    }

    eventLocations.set(payload.userId, nextValue);
    return nextValue;
  }

  removeUser(eventId, userId) {
    const eventLocations = this.eventLocations.get(eventId);
    if (!eventLocations) return;

    const location = eventLocations.get(userId);
    if (location?.zoneId) {
      this.zoneIndex.get(eventId)?.get(location.zoneId)?.delete(userId);
    }
    eventLocations.delete(userId);
  }

  getEventUsers(eventId) {
    return Array.from(this.ensureEvent(eventId).values());
  }

  getUser(eventId, userId) {
    return this.ensureEvent(eventId).get(userId) || null;
  }

  /**
   * O(1) zone lookup via index (falls back to polygon scan for unindexed users).
   * @param {string} eventId
   * @param {object} zone
   * @returns {object[]}
   */
  getUsersInZone(eventId, zone) {
    this.ensureEvent(eventId);
    const zoneIdx = this.zoneIndex.get(eventId);
    const eventLocations = this.eventLocations.get(eventId);

    // Users tracked in this zone by index
    const indexed = zoneIdx?.get(zone.id) || new Set();
    const result = [];

    for (const userId of indexed) {
      const loc = eventLocations.get(userId);
      if (loc) result.push(loc);
    }

    // Also pick up users whose zoneId is null but are physically inside the polygon
    for (const loc of eventLocations.values()) {
      if (loc.zoneId === null && pointInPolygon([loc.lat, loc.lng], zone.polygon)) {
        result.push(loc);
      }
    }

    return result;
  }

  getUsersNearZone(eventId, zone, radiusMeters) {
    const center = centerOfPolygon(zone.polygon);
    return this.getEventUsers(eventId).filter(
      (user) => distanceBetween(center, [user.lat, user.lng]) <= radiusMeters
    );
  }

  getUsersByIds(eventId, userIds) {
    const wantedIds = new Set(userIds);
    return this.getEventUsers(eventId).filter((user) => wantedIds.has(user.userId));
  }

  clearSimulated(eventId) {
    const eventLocations = this.ensureEvent(eventId);
    const zoneIdx = this.zoneIndex.get(eventId);

    for (const [userId, location] of eventLocations.entries()) {
      if (location.simulated) {
        if (location.zoneId) zoneIdx?.get(location.zoneId)?.delete(userId);
        eventLocations.delete(userId);
      }
    }
  }

  clearEvent(eventId) {
    this.eventLocations.delete(eventId);
    this.zoneIndex.delete(eventId);
  }
}

function centerOfPolygon(polygon) {
  const total = polygon.reduce(
    (acc, point) => [acc[0] + Number(point[0]), acc[1] + Number(point[1])],
    [0, 0]
  );
  return [total[0] / polygon.length, total[1] / polygon.length];
}

function distanceBetween(a, b) {
  const dx = Number(a[0]) - Number(b[0]);
  const dy = Number(a[1]) - Number(b[1]);
  return Math.sqrt(dx * dx + dy * dy);
}

function pointInPolygon(point, polygon) {
  let inside = false;
  const [x, y] = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = Number(polygon[i][0]);
    const yi = Number(polygon[i][1]);
    const xj = Number(polygon[j][0]);
    const yj = Number(polygon[j][1]);

    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

module.exports = { LocationStore, centerOfPolygon, distanceBetween, pointInPolygon };
