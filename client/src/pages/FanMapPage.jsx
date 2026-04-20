import { useCallback, useState } from "react";
import VenueMap from "../components/map/VenueMap";
import POISearch from "../components/navigation/POISearch";
import RoutePanel from "../components/navigation/RoutePanel";
import SOSButton from "../components/sos/SOSButton";
import NudgeToast from "../components/nudge/NudgeToast";
import GroupPanel from "../components/group/GroupPanel";
import { useEventStore } from "../store/useEventStore";
import { useMapStore } from "../store/useMapStore";
import { useNavigationStore } from "../store/useNavigationStore";
import { useSocket } from "../hooks/useSocket";
import { useLocation } from "../hooks/useLocation";
import { usePathfinding } from "../hooks/usePathfinding";

export default function FanMapPage() {
  const venueData = useEventStore((state) => state.venueData);
  const event = useEventStore((state) => state.event);
  const currentZoneId = useEventStore((state) => state.currentZoneId);
  const setCurrentZoneId = useEventStore((state) => state.setCurrentZoneId);
  const heatmapData = useMapStore((state) => state.heatmapData);
  const groupPositions = useMapStore((state) => state.groupPositions);
  const destination = useNavigationStore((state) => state.destination);
  const activeRoute = useNavigationStore((state) => state.activeRoute);
  const routeOptions = useNavigationStore((state) => state.routeOptions);
  const routeType = useNavigationStore((state) => state.routeType);
  const setDestination = useNavigationStore((state) => state.setDestination);
  const setRoute = useNavigationStore((state) => state.setRoute);
  const [selectedZoneId, setSelectedZoneId] = useState(currentZoneId);

  const handleZoneSelect = useCallback(
    (zone) => {
      setSelectedZoneId(zone.id);
      setCurrentZoneId(zone.id);
    },
    [setCurrentZoneId]
  );

  useSocket();
  usePathfinding();
  const { currentPosition, permissionState } = useLocation(venueData, currentZoneId);

  if (!venueData) {
    return <div className="app-shell flex min-h-screen items-center justify-center">Join event first.</div>;
  }

  return (
    <main className="app-shell px-4 pb-28 pt-4">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="panel-strong rounded-[30px] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Fan Map</div>
              <h1 className="mt-2 text-2xl font-semibold">{event?.name || "ZenVen Event"}</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                GPS: {permissionState}. Current zone check-in: {currentZoneId}.
              </p>
            </div>
            {destination ? (
              <div className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                Destination {destination.name}
              </div>
            ) : null}
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <VenueMap
            venueData={venueData}
            heatmapData={heatmapData}
            activeRoute={activeRoute}
            currentPosition={currentPosition}
            groupPositions={groupPositions}
            selectedZoneId={selectedZoneId}
            onZoneSelect={handleZoneSelect}
          />

          <div className="space-y-4">
            <POISearch
              venueData={venueData}
              onSelect={(poi) => {
                setDestination({
                  zoneId: poi.zoneId,
                  name: poi.name
                });
              }}
            />
            <RoutePanel
              routeOptions={routeOptions}
              selectedRouteType={routeType}
              onSelectRoute={(selectedType, route) => setRoute({ route, routeType: selectedType })}
            />
            <GroupPanel />
          </div>
        </div>
      </div>
      <NudgeToast />
      <SOSButton currentPosition={currentPosition} />
    </main>
  );
}
