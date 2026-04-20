import { useEventStore } from "../store/useEventStore";
import { useSOSStore } from "../store/useSOSStore";

export default function EvacuationPage() {
  const event = useEventStore((state) => state.event);
  const evacuationRoute = useSOSStore((state) => state.evacuationRoute);

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#7f1d1d] px-6 text-white"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="max-w-3xl text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-red-100">
          Evacuation Mode
        </div>
        <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
          {event?.name || "ZenVen Event"}
        </h1>
        <p className="flash-text mt-6 text-3xl font-semibold md:text-5xl" aria-label="Emergency instruction: Follow exit signs">
          FOLLOW EXIT SIGNS
        </p>
        <div className="mt-10 rounded-[32px] bg-white/10 p-6 text-left backdrop-blur">
          <div className="text-sm uppercase tracking-[0.22em] text-red-100">Nearest Exit Path</div>
          <div className="mt-4 text-2xl font-semibold">
            {evacuationRoute?.path?.length
              ? evacuationRoute.path.join(" → ")
              : "Move to nearest gate immediately."}
          </div>
          <div className="mt-3 text-sm text-red-50">
            Exit gate: {evacuationRoute?.exitGate || "Main Exit Plaza"}
          </div>
        </div>
      </div>
    </main>
  );
}
