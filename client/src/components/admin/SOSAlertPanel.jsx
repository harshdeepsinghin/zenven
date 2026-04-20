import { getSocket } from "../../hooks/useSocket";

export default function SOSAlertPanel({ alerts }) {
  const openAlerts = alerts.filter((alert) => alert.status !== "resolved");

  return (
    <div className="panel rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">SOS Alerts</h3>
        <span className="text-sm text-[var(--muted)]">{openAlerts.length} open</span>
      </div>
      <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
        {alerts.map((alert) => (
          <div key={alert.id} className="rounded-2xl border border-[rgba(239,68,68,0.2)] bg-[rgba(254,242,242,0.9)] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">{alert.zoneId}</div>
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  {Math.max(0, Math.round((Date.now() - alert.createdAt) / 1000))} sec ago
                </div>
              </div>
              {alert.status === "resolved" ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Resolved
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => getSocket()?.emit("sos:resolve", { sosId: alert.id, resolvedBy: "admin", notes: "Resolved from dashboard" })}
                  className="rounded-full bg-[var(--danger)] px-3 py-2 text-xs font-semibold text-white"
                >
                  Resolve
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
