import { useEffect, useState } from "react";
import { centerOfPolygon } from "../lib/geoUtils";

export function useLocation(venueData, currentZoneId) {
  const [deviceCoords, setDeviceCoords] = useState(null);
  const [permissionState, setPermissionState] = useState("pending");

  useEffect(() => {
    if (!navigator.geolocation) {
      setPermissionState("unsupported");
      return undefined;
    }

    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        setDeviceCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setPermissionState("granted");
      },
      () => {
        setPermissionState("denied");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  const activeZone = venueData?.zones?.find((zone) => zone.id === currentZoneId) || venueData?.zones?.[0];
  const fallbackPosition = activeZone
    ? {
        ...centerOfPolygon(activeZone.polygon),
        accuracy: 8
      }
    : null;

  return {
    permissionState,
    deviceCoords,
    currentPosition: fallbackPosition
  };
}
