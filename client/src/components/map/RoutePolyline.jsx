export default function RoutePolyline({ points }) {
  if (!points) {
    return null;
  }

  return (
    <polyline
      points={points}
      fill="none"
      stroke="#114b36"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="18 10"
      className="route-dash"
    />
  );
}
