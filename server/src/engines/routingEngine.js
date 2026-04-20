const {
  CROWD_PENALTY_FACTOR,
  WALKING_METERS_PER_MINUTE
} = require("../config/constants");
const { centerOfPolygon, distanceBetween } = require("../store/locationStore");

function computeRoutes({ venueData, state, from, to, eventId, userId }) {
  const densityMap = getDensityMap(state, eventId);
  const gateStatuses = state.gateStatuses.get(eventId) || {};
  const graph = buildGraph(venueData, densityMap, gateStatuses);

  const fastest = runAStar(graph, venueData, from, to, false);
  const leastCrowded = runDijkstra(graph, from, to, true);

  if (userId) {
    state.routeIntents.set(userId, {
      eventId,
      destinationZoneId: to,
      updatedAt: Date.now()
    });
  }

  return {
    fastest: summarizeRoute(fastest, densityMap),
    leastCrowded: summarizeRoute(leastCrowded, densityMap)
  };
}

function getNearestExitRoute({ venueData, state, eventId, from }) {
  const exitZones = venueData.zones.filter((zone) => zone.type === "exit" || zone.type === "gate");
  const candidates = exitZones
    .map((zone) => {
      const route = computeRoutes({
        venueData,
        state,
        from,
        to: zone.id,
        eventId
      }).leastCrowded;

      return {
        exitGate: zone.name,
        zoneId: from,
        ...route
      };
    })
    .filter((route) => Array.isArray(route.path) && route.path.length > 0)
    .sort((left, right) => left.etaMinutes - right.etaMinutes);

  return candidates[0] || null;
}

function buildGraph(venueData, densityMap, gateStatuses) {
  const adjacency = new Map();
  const zoneMap = new Map(venueData.zones.map((zone) => [zone.id, zone]));

  for (const zone of venueData.zones) {
    adjacency.set(zone.id, []);
  }

  for (const edge of venueData.graph.edges) {
    const fromStatus = gateStatuses[edge.from];
    const toStatus = gateStatuses[edge.to];
    const blocked = fromStatus === "closed" || toStatus === "closed";
    const throttlePenalty = fromStatus === "throttled" || toStatus === "throttled" ? 3 : 1;
    const leftDensity = densityMap.get(edge.from) || 0;
    const rightDensity = densityMap.get(edge.to) || 0;
    const crowdPenalty = ((leftDensity + rightDensity) / 2) * CROWD_PENALTY_FACTOR;
    const fastestWeight = blocked ? Number.POSITIVE_INFINITY : edge.distance * throttlePenalty;
    const crowdedWeight = blocked
      ? Number.POSITIVE_INFINITY
      : edge.distance * throttlePenalty + crowdPenalty;

    adjacency.get(edge.from).push({
      node: edge.to,
      fastestWeight,
      crowdedWeight,
      distance: edge.distance
    });
    adjacency.get(edge.to).push({
      node: edge.from,
      fastestWeight,
      crowdedWeight,
      distance: edge.distance
    });
  }

  return { adjacency, zoneMap };
}

function runAStar(graph, venueData, start, goal) {
  const open = new Set([start]);
  const cameFrom = new Map();
  const gScore = new Map([[start, 0]]);
  const fScore = new Map([[start, heuristic(venueData, start, goal)]]);

  while (open.size > 0) {
    let current = null;
    for (const node of open.values()) {
      if (
        current === null ||
        (fScore.get(node) ?? Number.POSITIVE_INFINITY) < (fScore.get(current) ?? Number.POSITIVE_INFINITY)
      ) {
        current = node;
      }
    }

    if (current === goal) {
      return rebuildPath(cameFrom, graph, current, "fastestWeight");
    }

    open.delete(current);
    const neighbors = graph.adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (!Number.isFinite(neighbor.fastestWeight)) {
        continue;
      }

      const tentative = (gScore.get(current) ?? Number.POSITIVE_INFINITY) + neighbor.fastestWeight;
      if (tentative < (gScore.get(neighbor.node) ?? Number.POSITIVE_INFINITY)) {
        cameFrom.set(neighbor.node, { node: current, edge: neighbor });
        gScore.set(neighbor.node, tentative);
        fScore.set(neighbor.node, tentative + heuristic(venueData, neighbor.node, goal));
        open.add(neighbor.node);
      }
    }
  }

  return emptyRoute();
}

function runDijkstra(graph, start, goal) {
  const distances = new Map([[start, 0]]);
  const cameFrom = new Map();
  const visited = new Set();
  const queue = new Set([start]);

  while (queue.size > 0) {
    let current = null;
    for (const node of queue.values()) {
      if (
        current === null ||
        (distances.get(node) ?? Number.POSITIVE_INFINITY) < (distances.get(current) ?? Number.POSITIVE_INFINITY)
      ) {
        current = node;
      }
    }

    queue.delete(current);
    if (current === goal) {
      return rebuildPath(cameFrom, graph, current, "crowdedWeight");
    }

    visited.add(current);
    const neighbors = graph.adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.node) || !Number.isFinite(neighbor.crowdedWeight)) {
        continue;
      }

      const nextDistance = (distances.get(current) ?? Number.POSITIVE_INFINITY) + neighbor.crowdedWeight;
      if (nextDistance < (distances.get(neighbor.node) ?? Number.POSITIVE_INFINITY)) {
        distances.set(neighbor.node, nextDistance);
        cameFrom.set(neighbor.node, { node: current, edge: neighbor });
        queue.add(neighbor.node);
      }
    }
  }

  return emptyRoute();
}

function rebuildPath(cameFrom, graph, current, weightKey) {
  const path = [current];
  let totalDistance = 0;
  let totalWeight = 0;

  while (cameFrom.has(current)) {
    const previous = cameFrom.get(current);
    path.unshift(previous.node);
    totalDistance += previous.edge.distance;
    totalWeight += previous.edge[weightKey];
    current = previous.node;
  }

  return {
    path,
    totalDistance,
    totalWeight
  };
}

function summarizeRoute(route, densityMap) {
  if (!route.path.length) {
    return {
      path: [],
      etaMinutes: 0,
      congestionLevel: "unknown"
    };
  }

  const densities = route.path.map((zoneId) => densityMap.get(zoneId) || 0);
  const averageDensity = densities.reduce((sum, value) => sum + value, 0) / Math.max(densities.length, 1);

  return {
    path: route.path,
    etaMinutes: Math.max(1, Math.round(route.totalDistance / WALKING_METERS_PER_MINUTE)),
    congestionLevel: toCongestionLevel(averageDensity)
  };
}

function getDensityMap(state, eventId) {
  const snapshot = state.heatmaps.get(eventId);
  const densityMap = new Map();

  if (!snapshot) {
    return densityMap;
  }

  for (const zone of snapshot.zones) {
    densityMap.set(zone.zoneId, zone.density);
  }

  return densityMap;
}

function heuristic(venueData, from, to) {
  const zoneMap = new Map(venueData.zones.map((zone) => [zone.id, zone]));
  const fromZone = zoneMap.get(from);
  const toZone = zoneMap.get(to);

  if (!fromZone || !toZone) {
    return 0;
  }

  return distanceBetween(centerOfPolygon(fromZone.polygon), centerOfPolygon(toZone.polygon));
}

function toCongestionLevel(density) {
  if (density < 1.5) {
    return "minimal";
  }
  if (density < 3) {
    return "low";
  }
  if (density < 4.5) {
    return "moderate";
  }
  return "high";
}

function emptyRoute() {
  return {
    path: [],
    totalDistance: 0,
    totalWeight: 0
  };
}

module.exports = {
  computeRoutes,
  getNearestExitRoute
};
