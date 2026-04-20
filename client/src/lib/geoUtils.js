export function haversineDistance(from, to) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;
  const deltaLat = radians(to.lat - from.lat);
  const deltaLng = radians(to.lng - from.lng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function pointInPolygon(point, polygon) {
  let inside = false;
  const [x, y] = point;

  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index++) {
    const [xi, yi] = polygon[index];
    const [xj, yj] = polygon[previousIndex];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

export function centerOfPolygon(polygon) {
  const totals = polygon.reduce(
    (accumulator, point) => [accumulator[0] + point[0], accumulator[1] + point[1]],
    [0, 0]
  );

  return {
    lat: totals[0] / polygon.length,
    lng: totals[1] / polygon.length
  };
}

export function distanceBetweenPoints(from, to) {
  const dx = from.lat - to.lat;
  const dy = from.lng - to.lng;
  return Math.sqrt(dx * dx + dy * dy);
}
