import { centerOfPolygon } from "./geoUtils";

export function buildVenueGraph(venueData) {
  const zonesById = Object.fromEntries(venueData.zones.map((zone) => [zone.id, zone]));
  const adjacency = {};

  venueData.zones.forEach((zone) => {
    adjacency[zone.id] = [];
  });

  venueData.graph.edges.forEach((edge) => {
    adjacency[edge.from].push({ node: edge.to, distance: edge.distance });
    adjacency[edge.to].push({ node: edge.from, distance: edge.distance });
  });

  return {
    zonesById,
    adjacency
  };
}

export function buildPolylinePoints(path, venueData) {
  return path
    .map((zoneId) => {
      const zone = venueData.zones.find((entry) => entry.id === zoneId);
      if (!zone) {
        return null;
      }

      const center = centerOfPolygon(zone.polygon);
      return `${center.lat},${center.lng}`;
    })
    .filter(Boolean)
    .join(" ");
}
