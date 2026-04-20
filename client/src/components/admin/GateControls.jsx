import { getSocket } from "../../hooks/useSocket";

const STATUSES = ["open", "throttled", "closed"];

export default function GateControls({ gates, gateStatuses }) {
  return (
    <div className="panel rounded-3xl p-5">
      <h3 className="text-lg font-semibold">Gate Controls</h3>
      <div className="mt-4 grid gap-4">
        {gates.map((gate) => (
          <div key={gate.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <div className="font-medium">{gate.name}</div>
            <div className="mt-3 flex gap-2">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => getSocket()?.emit("admin:gate:toggle", { gateId: gate.id, status })}
                  className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                    gateStatuses[gate.id] === status
                      ? status === "open"
                        ? "bg-emerald-600 text-white"
                        : status === "throttled"
                          ? "bg-amber-500 text-white"
                          : "bg-red-600 text-white"
                      : "border border-[var(--line)]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
