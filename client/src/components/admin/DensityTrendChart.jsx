import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function DensityTrendChart({ history }) {
  const chartData = history.map((entry) => {
    const row = {
      time: new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    entry.zones.forEach((zone) => {
      row[zone.zoneId] = zone.density;
    });
    return row;
  });

  const lines = history[history.length - 1]?.zones?.slice(0, 4) || [];

  return (
    <div className="panel rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Density Trend</h3>
        <span className="text-sm text-[var(--muted)]">Last 30 minutes</span>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            {lines.map((line, index) => (
              <Line
                key={line.zoneId}
                type="monotone"
                dataKey={line.zoneId}
                stroke={["#114b36", "#f59e0b", "#2563eb", "#ef4444"][index % 4]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
