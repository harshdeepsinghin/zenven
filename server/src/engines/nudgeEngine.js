const {
  DANGER_THRESHOLD,
  NUDGE_COOLDOWN_MS
} = require("../config/constants");
const { centerOfPolygon, distanceBetween } = require("../store/locationStore");

function createNudgeEngine({ io, state, locationStore, venueData }) {
  const zoneMap = new Map(venueData.zones.map((zone) => [zone.id, zone]));

  // Cache polygon centers at construction time to avoid recomputing every tick
  const zoneCenterCache = new Map(
    venueData.zones.map((zone) => [zone.id, centerOfPolygon(zone.polygon)])
  );

  function emitToUser(userId, eventId, payload) {
    const lastSentAt = state.nudgeCooldowns.get(userId) || 0;
    if (Date.now() - lastSentAt < NUDGE_COOLDOWN_MS) {
      return false;
    }

    const socketIds = state.userSockets.get(userId) || new Set();
    for (const socketId of socketIds) {
      io.to(socketId).emit("nudge:receive", payload);
    }

    state.nudgeCooldowns.set(userId, Date.now());
    const eventNudges = state.nudges.get(eventId) || [];
    eventNudges.unshift({
      id: `${eventId}-${userId}-${Date.now()}`,
      userId,
      eventId,
      zoneId: payload.zoneId,
      message: payload.message,
      sentAt: Date.now(),
      actedOn: false
    });
    state.nudges.set(eventId, eventNudges.slice(0, 200));
    return socketIds.size > 0;
  }

  function evaluate({ eventId, zones }) {
    const densityMap = new Map(zones.map((zone) => [zone.zoneId, zone]));

    for (const zoneState of zones) {
      const zone = zoneMap.get(zoneState.zoneId);
      if (!zone) {
        continue;
      }

      if (zoneState.density >= DANGER_THRESHOLD * 0.8) {
        const nearbyUsers = locationStore.getUsersNearZone(eventId, zone, 100);
        const alternatives = findAlternatives(zone, densityMap);
        for (const user of nearbyUsers) {
          if (!alternatives.length) {
            continue;
          }

          emitToUser(user.userId, eventId, {
            message: `${zone.name} is filling up. Try ${alternatives[0].name} instead.`,
            zoneId: zone.id,
            alternatives,
            expiresAt: Date.now() + 180000
          });
        }
      }

      const poi = venueData.pois.find((candidate) => candidate.zoneId === zone.id);
      if (poi) {
        const waitMinutes = zoneState.userCount / Math.max(poi.serviceRate, 1);
        if (waitMinutes > 10) {
          const alternatives = findQueueAlternatives(poi, densityMap);
          for (const [userId, intent] of state.routeIntents.entries()) {
            if (intent.eventId !== eventId || intent.destinationZoneId !== poi.zoneId) {
              continue;
            }

            emitToUser(userId, eventId, {
              message: `${poi.name} wait is about ${Math.round(waitMinutes)} minutes. Better option: ${alternatives[0]?.name || poi.name}.`,
              zoneId: poi.zoneId,
              alternatives,
              expiresAt: Date.now() + 180000
            });
          }
        }
      }
    }

    evaluateGroupSpread(eventId);
  }

  function notifyGateChange(eventId, gateId, status) {
    const zone = zoneMap.get(gateId);
    if (!zone) {
      return;
    }

    const users = locationStore.getUsersInZone(eventId, zone);
    for (const user of users) {
      emitToUser(user.userId, eventId, {
        message: `${zone.name} is now ${status}. Follow alternate guidance.`,
        zoneId: gateId,
        alternatives: findAlternatives(zone, getLatestDensityMap(eventId)),
        expiresAt: Date.now() + 180000
      });
    }
  }

  function evaluateGroupSpread(eventId) {
    for (const group of state.groups.values()) {
      if (group.eventId !== eventId || group.members.size < 2) {
        continue;
      }

      const memberLocations = locationStore.getUsersByIds(eventId, [...group.members]);
      let farthestDistance = 0;

      for (let index = 0; index < memberLocations.length; index += 1) {
        for (let nestedIndex = index + 1; nestedIndex < memberLocations.length; nestedIndex += 1) {
          farthestDistance = Math.max(
            farthestDistance,
            distanceBetween(
              [memberLocations[index].lat, memberLocations[index].lng],
              [memberLocations[nestedIndex].lat, memberLocations[nestedIndex].lng]
            )
          );
        }
      }

      if (farthestDistance <= 200) {
        continue;
      }

      const meetingZone = zoneMap.get(group.meetingPointZoneId || "main-exit");
      for (const memberId of group.members) {
        emitToUser(memberId, eventId, {
          message: `Group spread out. Meet at ${meetingZone?.name || "Main Exit Plaza"}.`,
          zoneId: meetingZone?.id || null,
          alternatives: meetingZone
            ? [{ zoneId: meetingZone.id, name: meetingZone.name, density: 0, etaMinutes: 2 }]
            : [],
          expiresAt: Date.now() + 180000
        });
      }
    }
  }

  function findAlternatives(zone, densityMap) {
    const zoneCenter = zoneCenterCache.get(zone.id) || centerOfPolygon(zone.polygon);
    return venueData.pois
      .filter((poi) => poi.type === zone.type && poi.zoneId !== zone.id)
      .map((poi) => {
        const alternativeZone = zoneMap.get(poi.zoneId);
        const density = densityMap.get(poi.zoneId)?.density || 0;
        const etaMinutes = Math.max(
          1,
          Math.round(distanceBetween(zoneCenter, centerOfPolygon(alternativeZone.polygon)) / 75)
        );

        return {
          zoneId: poi.zoneId,
          name: alternativeZone.name,
          density,
          etaMinutes
        };
      })
      .sort((left, right) => left.density - right.density || left.etaMinutes - right.etaMinutes)
      .slice(0, 2);
  }

  function findQueueAlternatives(poi, densityMap) {
    return venueData.pois
      .filter((candidate) => candidate.type === poi.type && candidate.zoneId !== poi.zoneId)
      .map((candidate) => {
        const zoneState = densityMap.get(candidate.zoneId);
        const estimatedWait = (zoneState?.userCount || 0) / Math.max(candidate.serviceRate, 1);
        return {
          zoneId: candidate.zoneId,
          name: candidate.name,
          density: zoneState?.density || 0,
          etaMinutes: Math.max(1, Math.round(estimatedWait))
        };
      })
      .sort((left, right) => left.etaMinutes - right.etaMinutes)
      .slice(0, 2);
  }

  function getLatestDensityMap(eventId) {
    const snapshot = state.heatmaps.get(eventId);
    return new Map((snapshot?.zones || []).map((zone) => [zone.zoneId, zone]));
  }

  return {
    evaluate,
    notifyGateChange
  };
}

module.exports = {
  createNudgeEngine
};
