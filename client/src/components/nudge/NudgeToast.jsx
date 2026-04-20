import { useEffect } from "react";
import toast from "react-hot-toast";
import { useMapStore } from "../../store/useMapStore";
import { useNavigationStore } from "../../store/useNavigationStore";
import { useEventStore } from "../../store/useEventStore";

export default function NudgeToast() {
  const latestNudge = useMapStore((state) => state.latestNudge);
  const venueData = useEventStore((state) => state.venueData);
  const setDestination = useNavigationStore((state) => state.setDestination);

  useEffect(() => {
    if (!latestNudge) {
      return;
    }

    toast.custom(
      (currentToast) => (
        <div className="panel-strong w-[320px] rounded-[24px] p-4">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Smart Nudge</div>
          <p className="mt-2 text-sm">{latestNudge.message}</p>
          {latestNudge.alternatives?.[0] ? (
            <button
              type="button"
              onClick={() => {
                const zone = venueData?.zones?.find((entry) => entry.id === latestNudge.alternatives[0].zoneId);
                if (zone) {
                  setDestination({
                    zoneId: zone.id,
                    name: zone.name
                  });
                }
                toast.dismiss(currentToast.id);
              }}
              className="mt-4 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              Go There
            </button>
          ) : null}
        </div>
      ),
      { duration: 5000 }
    );
  }, [latestNudge, setDestination, venueData]);

  return null;
}
