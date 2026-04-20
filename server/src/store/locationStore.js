class LocationStore {
  constructor() {
    this.eventLocations = new Map();
  }

  ensureEvent(eventId) {
    if (!this.eventLocations.has(eventId)) {
      this.eventLocations.set(eventId, new Map());
    }

    return this.eventLocations.get(eventId);
  }

  upsertLocation(eventId, payload) {
    const eventLocations = this.ensureEvent(eventId);
    const nextValue = {
      userId: payload.userId,
      lat: Number(payload.lat),
      lng: Number(payload.lng),
      accuracy: Number(payload.accuracy || 0),
      zoneId: payload.zoneId || null,
      timestamp: Number(payload.timestamp || Date.now()),
      simulated: Boolean(payload.simulated)
    };

    eventLocations.set(payload.userId, nextValue);
    return nextValue;
  }

  removeUser(eventId, userId) {
    const eventLocations = this.eventLocations.get(eventId);
    if (!eventLocations) {
      return;
    }

    eventLocations.delete(userId);
  }

  getEventUsers(eventId) {
    return Array.from(this.ensureEvent(eventId).values());
  }

  getUser(eventId, userId) {
    return this.ensureEvent(eventId).get(userId) || null;
  }

  getUsersInZone(eventId, zone) {
    return this.getEventUsers(eventId).filter((user) => {
      if (user.zoneId && user.zoneId === zone.id) {
        return true;
      }

      return pointInPolygon([user.lat, user.lng], zone.polygon);
    });
  }

  getUsersNearZone(eventId, zone, radiusMeters) {
    const center = centerOfPolygon(zone.polygon);
    return this.getEventUsers(eventId).filter((user) => {
      const userCenter = [user.lat, user.lng];
      return distanceBetween(center, userCenter) <= radiusMeters;
    });
  }

  getUsersByIds(eventId, userIds) {
    const wantedIds = new Set(userIds);
    return this.getEventUsers(eventId).filter((user) => wantedIds.has(user.userId));
  }

  clearSimulated(eventId) {
    const eventLocations = this.ensureEvent(eventId);
    for (const [userId, location] of eventLocations.entries()) {
      if (location.simulated) {
        eventLocations.delete(userId);
      }
    }
  }

  clearEvent(eventId) {
    this.eventLocations.delete(eventId);
  }
}

function centerOfPolygon(polygon) {
  const total = polygon.reduce(
    (accumulator, point) => {
      return [accumulator[0] + Number(point[0]), accumulator[1] + Number(point[1])];
    },
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

  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index++) {
    const xi = Number(polygon[index][0]);
    const yi = Number(polygon[index][1]);
    const xj = Number(polygon[previousIndex][0]);
    const yj = Number(polygon[previousIndex][1]);

    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

module.exports = {
  LocationStore,
  centerOfPolygon,
  distanceBetween,
  pointInPolygon
};
