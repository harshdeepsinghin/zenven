import { useEffect } from "react";
import VenueMap from "../components/map/VenueMap";
import StatsBar from "../components/admin/StatsBar";
import SOSAlertPanel from "../components/admin/SOSAlertPanel";
import DensityTrendChart from "../components/admin/DensityTrendChart";
import AnnouncementBar from "../components/admin/AnnouncementBar";
import GateControls from "../components/admin/GateControls";
import { useEventStore } from "../store/useEventStore";
import { useMapStore } from "../store/useMapStore";
import { useSOSStore } from "../store/useSOSStore";
import { useSocket } from "../hooks/useSocket";
import { getApiBaseUrl } from "../lib/runtimeConfig";

export default function AdminDashboard() {
  const apiBaseUrl = getApiBaseUrl();
  const { venueData, eventId } = useEventStore();
  const activeHeatmap = useMapStore((state) => state.activeHeatmap);
  const heatmapData = useMapStore((state) => state.heatmapData);
  const densityHistory = useMapStore((state) => state.densityHistory);
  const gateStatuses = useMapStore((state) => state.gateStatuses);
  const sosAlerts = useSOSStore((state) => state.sosAlerts);

  useSocket();

  useEffect(() => {
    if (!eventId) {
      return;
    }

    fetch(`${apiBaseUrl}/events/${eventId}`)
      .then((response) => response.json())
      .catch(() => {});
  }, [apiBaseUrl, eventId]);

  if (window.innerWidth < 1024) {
    return <div className="app-shell flex min-h-screen items-center justify-center px-6 text-center">Admin dashboard needs desktop width.</div>;
  }

  const gates = venueData?.zones?.filter((zone) => zone.type === "gate") || [];
  const totalActiveUsers = activeHeatmap?.zones?.reduce((sum, zone) => sum + zone.userCount, 0) || 0;
  const dangerZones = activeHeatmap?.zones?.filter((zone) => zone.status === "danger").length || 0;
  const openSOS = sosAlerts.filter((alert) => alert.status !== "resolved").length;

  return (
    <main className="app-shell px-6 py-6">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <StatsBar activeUsers={totalActiveUsers} dangerZones={dangerZones} openSOS={openSOS} />
        <div className="grid gap-4 xl:grid-cols-[1.75fr_0.95fr]">
          <div className="space-y-4">
            <VenueMap venueData={venueData} heatmapData={heatmapData} />
            <DensityTrendChart history={densityHistory} />
          </div>

          <div className="space-y-4">
            <SOSAlertPanel alerts={sosAlerts} />
            <AnnouncementBar />
            <GateControls gates={gates} gateStatuses={gateStatuses} />
            <div className="panel rounded-3xl p-5">
              <div className="text-sm font-semibold">Demo Scenarios</div>
              <div className="mt-4 grid gap-2">
                {["surge_gate_b", "full_stadium", "clear", "sos_test", "evacuation_test"].map((scenario) => (
                  <button
                    key={scenario}
                    type="button"
                    onClick={() =>
                      fetch(`${apiBaseUrl}/api/dev/simulate`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ eventId, scenario })
                      })
                    }
                    className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-left text-sm font-semibold"
                  >
                    {scenario}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
