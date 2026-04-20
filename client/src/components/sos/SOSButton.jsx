import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { getSocket } from "../../hooks/useSocket";
import { useEventStore } from "../../store/useEventStore";

export default function SOSButton({ currentPosition }) {
  const { userId, currentZoneId } = useEventStore();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef(null);
  const autoConfirmRef = useRef(null);

  useEffect(() => {
    if (!holding) {
      return undefined;
    }

    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      const nextProgress = Math.min(1, (Date.now() - startedAt) / 2000);
      setProgress(nextProgress);
      if (nextProgress >= 1) {
        window.clearInterval(timerRef.current);
        setHolding(false);
        setConfirming(true);
      }
    }, 16);

    return () => {
      window.clearInterval(timerRef.current);
    };
  }, [holding]);

  useEffect(() => {
    if (!confirming) {
      return undefined;
    }

    autoConfirmRef.current = window.setTimeout(() => {
      sendSOS();
    }, 3000);

    return () => window.clearTimeout(autoConfirmRef.current);
  }, [confirming]);

  const ringOffset = useMemo(() => 188 - progress * 188, [progress]);

  const sendSOS = () => {
    setConfirming(false);
    const socket = getSocket();
    socket?.emit(
      "sos:trigger",
      {
        userId,
        lat: currentPosition?.lat || 0,
        lng: currentPosition?.lng || 0,
        zoneId: currentZoneId,
        timestamp: Date.now()
      },
      () => {
        toast.success("Help is on the way. Stay calm.");
      }
    );
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-5 z-[9999] flex justify-center">
        <button
          type="button"
          onMouseDown={() => setHolding(true)}
          onMouseUp={() => {
            setHolding(false);
            setProgress(0);
          }}
          onTouchStart={() => setHolding(true)}
          onTouchEnd={() => {
            setHolding(false);
            setProgress(0);
          }}
          className="group relative flex h-16 items-center justify-center overflow-hidden rounded-full bg-[var(--danger)] px-6 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(239,68,68,0.35)] transition hover:w-40 focus:w-40 w-16 hover:px-8 focus:px-8"
        >
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="4" />
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="none"
              stroke="white"
              strokeWidth="4"
              strokeDasharray="188"
              strokeDashoffset={ringOffset}
            />
          </svg>
          <span className="relative flex items-center gap-2">
            <span>!</span>
            <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all group-hover:max-w-24 group-focus:max-w-24">
              SOS
            </span>
          </span>
        </button>
      </div>

      {confirming ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[rgba(17,34,24,0.45)] px-4">
          <div className="panel-strong w-full max-w-sm rounded-[28px] p-6">
            <h3 className="text-xl font-semibold">Send SOS alert?</h3>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Security receives your zone immediately. Auto-send in 3 seconds.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  window.clearTimeout(autoConfirmRef.current);
                }}
                className="flex-1 rounded-2xl border border-[var(--line)] px-4 py-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendSOS}
                className="flex-1 rounded-2xl bg-[var(--danger)] px-4 py-3 font-semibold text-white"
              >
                Send SOS
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
