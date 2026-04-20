import { useEffect } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useEventStore } from "../store/useEventStore";
import { useMapStore } from "../store/useMapStore";
import { useSOSStore } from "../store/useSOSStore";
import { getSocketUrl } from "../lib/runtimeConfig";

let activeSocket = null;

export function getSocket() {
  return activeSocket;
}

export function useSocket() {
  const { eventId, userId, role, currentZoneId, venueData } = useEventStore();
  const updateHeatmap = useMapStore((state) => state.updateHeatmap);
  const addAnnouncement = useMapStore((state) => state.addAnnouncement);
  const pushNudge = useMapStore((state) => state.pushNudge);
  const setGroupPositions = useMapStore((state) => state.setGroupPositions);
  const setGateStatus = useMapStore((state) => state.setGateStatus);
  const triggerSOS = useSOSStore((state) => state.triggerSOS);
  const resolveAlert = useSOSStore((state) => state.resolveAlert);
  const setEvacuationMode = useSOSStore((state) => state.setEvacuationMode);

  useEffect(() => {
    if (!eventId || !userId) {
      return undefined;
    }

    activeSocket = io(getSocketUrl(), {
      path: "/socket.io",
      transports: ["websocket"]
    });

    activeSocket.on("connect", () => {
      activeSocket.emit("join:event", { eventId, userId, role });
    });

    activeSocket.on("heatmap:update", updateHeatmap);
    activeSocket.on("announcement:receive", (announcement) => {
      addAnnouncement(announcement);
      toast(announcement.message);
    });
    activeSocket.on("nudge:receive", (nudge) => {
      pushNudge(nudge);
    });
    activeSocket.on("sos:alert", triggerSOS);
    activeSocket.on("sos:resolved", resolveAlert);
    activeSocket.on("group:positions", ({ positions }) => setGroupPositions(positions));
    activeSocket.on("gate:status", ({ gateId, status }) => setGateStatus(gateId, status));
    activeSocket.on("evacuation:start", ({ exitRoutes }) => {
      const route = exitRoutes?.find((entry) => entry.zoneId === currentZoneId) || exitRoutes?.[0] || null;
      setEvacuationMode(true, route);
    });
    activeSocket.on("evacuation:end", () => setEvacuationMode(false, null));

    if (venueData?.zones?.length) {
      const interval = window.setInterval(() => {
        const activeZone = venueData.zones.find((zone) => zone.id === currentZoneId) || venueData.zones[0];
        const polygon = activeZone.polygon;
        const averageLat = polygon.reduce((sum, point) => sum + point[0], 0) / polygon.length;
        const averageLng = polygon.reduce((sum, point) => sum + point[1], 0) / polygon.length;
        activeSocket.emit("location:update", {
          userId,
          lat: averageLat,
          lng: averageLng,
          accuracy: 6,
          zoneId: currentZoneId,
          timestamp: Date.now()
        });
      }, 3000);

      return () => {
        window.clearInterval(interval);
        activeSocket?.disconnect();
        activeSocket = null;
      };
    }

    return () => {
      activeSocket?.disconnect();
      activeSocket = null;
    };
  }, [
    addAnnouncement,
    currentZoneId,
    eventId,
    resolveAlert,
    role,
    setEvacuationMode,
    setGateStatus,
    setGroupPositions,
    triggerSOS,
    updateHeatmap,
    userId,
    venueData,
    pushNudge
  ]);

  return activeSocket;
}
