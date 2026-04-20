export default function StatsBar({ activeUsers, dangerZones, openSOS }) {
  const stats = [
    { label: "Active Users", value: activeUsers },
    { label: "Danger Zones", value: dangerZones },
    { label: "Open SOS", value: openSOS }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="panel rounded-3xl p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">{stat.label}</div>
          <div className="mt-3 text-3xl font-semibold">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
