export default function HeatmapOverlay({ zone, state, onZoneSelect }) {
  const zoneFill = state?.status === "danger" ? "#ef4444" : state?.status === "warning" ? "#f59e0b" : "#22c55e";
  const opacity = Math.min(0.8, 0.15 + ((state?.density || 0) / 7) * 0.65);
  const points = zone.polygon.map((point) => point.join(",")).join(" ");

  return (
    <polygon
      points={points}
      fill={zoneFill}
      fillOpacity={opacity}
      stroke={state?.status === "danger" ? "#991b1b" : "rgba(17,34,24,0.4)"}
      className={state?.status === "danger" ? "danger-pulse cursor-pointer" : "cursor-pointer"}
      onClick={() => onZoneSelect?.(zone)}
    />
  );
}
