import { buildVenueGraph } from "./venueGraph";
import { centerOfPolygon, distanceBetweenPoints } from "./geoUtils";

export function computeLocalRoutes(venueData, heatmapData, from, to, gateStatuses = {}) {
  const graph = buildVenueGraph(venueData);
  return {
    fastest: summarize(runAStar(graph, venueData, from, to, heatmapData, gateStatuses)),
    leastCrowded: summarize(runDijkstra(graph, from, to, heatmapData, gateStatuses))
  };
}

function runAStar(graph, venueData, start, goal, heatmapData, gateStatuses) {
  const open = new Set([start]);
  const cameFrom = new Map();
  const gScore = new Map([[start, 0]]);
  const fScore = new Map([[start, heuristic(venueData, start, goal)]]);

  while (open.size) {
    let current = null;
    open.forEach((node) => {
      if (current === null || (fScore.get(node) ?? Infinity) < (fScore.get(current) ?? Infinity)) {
        current = node;
      }
    });

    if (current === goal) {
      return rebuildPath(cameFrom, current);
    }

    open.delete(current);
    graph.adjacency[current].forEach((neighbor) => {
      if (gateStatuses[neighbor.node] === "closed") {
        return;
      }

      const nextScore =
        (gScore.get(current) ?? Infinity) +
        neighbor.distance +
        (gateStatuses[neighbor.node] === "throttled" ? neighbor.distance * 2 : 0);

      if (nextScore < (gScore.get(neighbor.node) ?? Infinity)) {
        cameFrom.set(neighbor.node, {
          node: current,
          distance: neighbor.distance,
          density: heatmapData[neighbor.node]?.density || 0
        });
        gScore.set(neighbor.node, nextScore);
        fScore.set(neighbor.node, nextScore + heuristic(venueData, neighbor.node, goal));
        open.add(neighbor.node);
      }
    });
  }

  return { path: [], score: 0, averageDensity: 0 };
}

function runDijkstra(graph, start, goal, heatmapData, gateStatuses) {
  const distances = new Map([[start, 0]]);
  const queue = new Set([start]);
  const cameFrom = new Map();

  while (queue.size) {
    let current = null;
    queue.forEach((node) => {
      if (current === null || (distances.get(node) ?? Infinity) < (distances.get(current) ?? Infinity)) {
        current = node;
      }
    });

    queue.delete(current);
    if (current === goal) {
      return rebuildPath(cameFrom, current);
    }

    graph.adjacency[current].forEach((neighbor) => {
      if (gateStatuses[neighbor.node] === "closed") {
        return;
      }

      const density = heatmapData[neighbor.node]?.density || 0;
      const penalty = density * 50 + (gateStatuses[neighbor.node] === "throttled" ? neighbor.distance * 2 : 0);
      const nextDistance = (distances.get(current) ?? Infinity) + neighbor.distance + penalty;

      if (nextDistance < (distances.get(neighbor.node) ?? Infinity)) {
        distances.set(neighbor.node, nextDistance);
        cameFrom.set(neighbor.node, {
          node: current,
          distance: neighbor.distance,
          density
        });
        queue.add(neighbor.node);
      }
    });
  }

  return { path: [], score: 0, averageDensity: 0 };
}

function rebuildPath(cameFrom, current) {
  const path = [current];
  const densities = [];
  let score = 0;

  while (cameFrom.has(current)) {
    const segment = cameFrom.get(current);
    score += segment.distance;
    densities.push(segment.density);
    path.unshift(segment.node);
    current = segment.node;
  }

  return {
    path,
    score,
    averageDensity: densities.length ? densities.reduce((sum, value) => sum + value, 0) / densities.length : 0
  };
}

function heuristic(venueData, from, to) {
  const sourceZone = venueData.zones.find((zone) => zone.id === from);
  const targetZone = venueData.zones.find((zone) => zone.id === to);
  if (!sourceZone || !targetZone) {
    return 0;
  }

  return distanceBetweenPoints(centerOfPolygon(sourceZone.polygon), centerOfPolygon(targetZone.polygon));
}

function summarize(route) {
  return {
    path: route.path,
    etaMinutes: Math.max(1, Math.round(route.score / 78)),
    congestionLevel:
      route.averageDensity < 1.5 ? "minimal" : route.averageDensity < 3 ? "low" : route.averageDensity < 4.5 ? "moderate" : "high"
  };
}
