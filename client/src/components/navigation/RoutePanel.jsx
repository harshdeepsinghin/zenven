export default function RoutePanel({ routeOptions, selectedRouteType, onSelectRoute }) {
  if (!routeOptions) {
    return (
      <div className="panel rounded-3xl p-4 text-sm text-[var(--muted)]">
        Pick destination. ZenVen shows fastest and least-crowded path.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {[
        { key: "fastest", label: "Fastest" },
        { key: "leastCrowded", label: "Least Crowded" }
      ].map((entry) => {
        const route = routeOptions[entry.key];
        return (
          <button
            key={entry.key}
            type="button"
            onClick={() => onSelectRoute(entry.key, route)}
            className={`panel rounded-3xl p-4 text-left ${selectedRouteType === entry.key ? "ring-2 ring-[var(--accent)]" : ""}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{entry.label}</h3>
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                {route.congestionLevel}
              </span>
            </div>
            <div className="mt-3 text-sm text-[var(--muted)]">{route.etaMinutes} min ETA</div>
            <div className="mt-3 text-sm leading-6">{route.path.join(" -> ")}</div>
          </button>
        );
      })}
    </div>
  );
}
