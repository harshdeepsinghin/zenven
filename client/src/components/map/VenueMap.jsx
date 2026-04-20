import { useEffect, useState } from "react";
import { INITIAL_VALUE, ReactSVGPanZoom, TOOL_NONE } from "react-svg-pan-zoom";
import HeatmapOverlay from "./HeatmapOverlay";
import RoutePolyline from "./RoutePolyline";
import UserDot from "./UserDot";
import GroupDots from "../group/GroupDots";
import { buildPolylinePoints } from "../../lib/venueGraph";
import { centerOfPolygon } from "../../lib/geoUtils";

const TYPE_ICONS = {
  gate: "G",
  food: "F",
  toilet: "T",
  firstaid: "+",
  exit: "E"
};

export default function VenueMap({
  venueData,
  heatmapData,
  activeRoute,
  currentPosition,
  groupPositions = [],
  onZoneSelect,
  selectedZoneId
}) {
  const [viewerValue, setViewerValue] = useState(INITIAL_VALUE);

  if (!venueData) {
    return <div className="panel rounded-3xl p-6 text-sm text-[var(--muted)]">Venue map loading.</div>;
  }

  const routePoints = activeRoute?.path?.length ? buildPolylinePoints(activeRoute.path, venueData) : null;

  return (
    <div className="panel rounded-[28px] p-3">
      <ReactSVGPanZoom
        width={window.innerWidth >= 1024 ? 760 : Math.min(window.innerWidth - 32, 390)}
        height={window.innerWidth >= 1024 ? 600 : 360}
        value={viewerValue}
        onChangeValue={setViewerValue}
        tool={TOOL_NONE}
        miniaturePosition="none"
        background="#fff8eb"
        detectAutoPan={false}
        toolbarPosition="none"
      >
        <svg width="520" height="560">
          <rect x="0" y="0" width="520" height="560" rx="28" fill="#fff8eb" />
          {venueData.zones.map((zone) => (
            <g key={zone.id}>
              <HeatmapOverlay zone={zone} state={heatmapData[zone.id]} onZoneSelect={onZoneSelect} />
              {selectedZoneId === zone.id ? (
                <polygon
                  points={zone.polygon.map((point) => point.join(",")).join(" ")}
                  fill="none"
                  stroke="#114b36"
                  strokeWidth="4"
                  strokeDasharray="8 8"
                />
              ) : null}
            </g>
          ))}
          <RoutePolyline points={routePoints} />
          <GroupDots positions={groupPositions} />
          <UserDot position={currentPosition} />
          {venueData.pois.map((poi) => {
            const zone = venueData.zones.find((entry) => entry.id === poi.zoneId);
            const center = centerOfPolygon(zone.polygon);
            const waitMinutes = Math.max(1, Math.round((heatmapData[poi.zoneId]?.userCount || 0) / poi.serviceRate));
            return (
              <g key={poi.id} transform={`translate(${center.lat}, ${center.lng})`} onClick={() => onZoneSelect?.(zone)}>
                <circle r="14" fill="#fef3c7" stroke="#114b36" strokeWidth="2" />
                <text textAnchor="middle" dy="4" fontSize="12" fontWeight="700" fill="#114b36">
                  {TYPE_ICONS[poi.type] || "P"}
                </text>
                {["toilet", "food", "gate"].includes(poi.type) ? (
                  <>
                    <rect x="-18" y="18" width="36" height="16" rx="8" fill="#114b36" />
                    <text textAnchor="middle" y="30" fontSize="9" fill="#fff8eb">
                      {waitMinutes}m wait
                    </text>
                  </>
                ) : null}
              </g>
            );
          })}
        </svg>
      </ReactSVGPanZoom>
    </div>
  );
}
