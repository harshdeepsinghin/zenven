import { useEffect } from "react";
import { computeLocalRoutes } from "../lib/pathfinding";
import { getApiBaseUrl } from "../lib/runtimeConfig";
import { useEventStore } from "../store/useEventStore";
import { useMapStore } from "../store/useMapStore";
import { useNavigationStore } from "../store/useNavigationStore";

export function usePathfinding() {
  const apiBaseUrl = getApiBaseUrl();
  const { eventId, userId, venueData, currentZoneId } = useEventStore();
  const heatmapData = useMapStore((state) => state.heatmapData);
  const gateStatuses = useMapStore((state) => state.gateStatuses);
  const destination = useNavigationStore((state) => state.destination);
  const setRouteOptions = useNavigationStore((state) => state.setRouteOptions);
  const activeRoute = useNavigationStore((state) => state.activeRoute);
  const routeType = useNavigationStore((state) => state.routeType);
  const setRoute = useNavigationStore((state) => state.setRoute);

  useEffect(() => {
    if (!destination || !eventId || !venueData) {
      return undefined;
    }

    let cancelled = false;

    const loadRoute = async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/route?from=${currentZoneId}&to=${destination.zoneId}&eventId=${eventId}&userId=${userId}`
        );
        const data = await response.json();
        if (cancelled) {
          return;
        }

        setRouteOptions(data);
        const preferredRoute = data[routeType] || data.fastest;
        setRoute({ route: preferredRoute, routeType });
      } catch (_error) {
        const localRoutes = computeLocalRoutes(venueData, heatmapData, currentZoneId, destination.zoneId, gateStatuses);
        if (!cancelled) {
          setRouteOptions(localRoutes);
          setRoute({ route: localRoutes[routeType] || localRoutes.fastest, routeType });
        }
      }
    };

    loadRoute();
    const interval = activeRoute ? window.setInterval(loadRoute, 10000) : null;

    return () => {
      cancelled = true;
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [
    activeRoute,
    apiBaseUrl,
    currentZoneId,
    destination,
    eventId,
    gateStatuses,
    heatmapData,
    routeType,
    setRoute,
    setRouteOptions,
    userId,
    venueData
  ]);
}
