import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { createClient } from "@supabase/supabase-js";
import { useEventStore } from "../store/useEventStore";
import { useMapStore } from "../store/useMapStore";
import { getApiBaseUrl } from "../lib/runtimeConfig";

const supabase =
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
    : null;

export default function LandingPage() {
  const apiBaseUrl = getApiBaseUrl();
  const navigate = useNavigate();
  const joinEvent = useEventStore((state) => state.joinEvent);
  const updateVenueData = useMapStore((state) => state.updateVenueData);
  const [eventCode, setEventCode] = useState("424242");
  const [fanName, setFanName] = useState("");
  const [demoEvent, setDemoEvent] = useState(null);
  const [qrEnabled, setQrEnabled] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [createdEvent, setCreatedEvent] = useState(null);

  // Loading / error state for each async action
  const [fanLoading, setFanLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [fanError, setFanError] = useState("");
  const [adminError, setAdminError] = useState("");

  useEffect(() => {
    fetch(`${apiBaseUrl}/health`)
      .then((response) => response.json())
      .then((data) => setDemoEvent(data.defaultEvent))
      .catch(() => {});
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!qrEnabled) return undefined;

    const scanner = new Html5QrcodeScanner("event-code-reader", { fps: 10, qrbox: 220 }, false);
    scanner.render(
      (decodedText) => {
        setEventCode(decodedText);
        setQrEnabled(false);
        scanner.clear();
      },
      () => {}
    );

    return () => scanner.clear().catch(() => {});
  }, [qrEnabled]);

  const qrValue = useMemo(
    () => createdEvent?.event?.eventCode || demoEvent?.eventCode || "424242",
    [createdEvent, demoEvent]
  );

  const joinFanEvent = async (code = eventCode) => {
    setFanLoading(true);
    setFanError("");
    try {
      const response = await fetch(`${apiBaseUrl}/events/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fanName || "Match Fan", role: "fan" })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setFanError(err.error || "Failed to join event. Check the code and try again.");
        return;
      }
      const data = await response.json();
      joinEvent({ ...data, role: "fan", user: { id: data.userId, name: fanName || "Match Fan" } });
      updateVenueData(data.venueData);
      navigate("/fan");
    } catch {
      setFanError("Network error — please try again.");
    } finally {
      setFanLoading(false);
    }
  };

  const openDemoAdmin = async () => {
    if (!demoEvent) return;
    const response = await fetch(`${apiBaseUrl}/events/${demoEvent.id}`);
    const data = await response.json();
    joinEvent({
      eventId: data.event.id,
      userId: "local-admin",
      role: "admin",
      userToken: "dev-local-admin",
      venueData: data.venueData,
      event: data.event,
      user: { id: "local-admin", name: "Venue Admin" }
    });
    updateVenueData(data.venueData);
    navigate("/admin");
  };

  const loginAdmin = async () => {
    setAdminLoading(true);
    setAdminError("");
    try {
      if (supabase && adminEmail && adminPassword) {
        await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
      }
      await openDemoAdmin();
    } catch {
      setAdminError("Could not open dashboard. Please try again.");
    } finally {
      setAdminLoading(false);
    }
  };

  const createEvent = async () => {
    setCreateLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "local-admin",
          "x-user-role": "admin"
        },
        body: JSON.stringify({ name: "ZenVen Demo Night", capacity: 12000, status: "active" })
      });
      const data = await response.json();
      setCreatedEvent(data);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <main className="app-shell px-4 py-6 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="panel-strong rounded-[36px] p-6 md:p-10">
          <div className="inline-flex rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
            Smart Fan Experience and Crowd Intelligence
          </div>
          <h1 className="mt-6 max-w-xl text-4xl leading-tight md:text-6xl">
            Move through the stadium with live crowd awareness.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Join event, avoid crush points, get safer routes, and call for help in one tap.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {/* Fan join panel */}
            <div className="panel rounded-[28px] p-5">
              <h2 className="text-xl font-semibold">Join as Fan</h2>
              <div className="mt-4 space-y-3">
                <label htmlFor="fan-name" className="sr-only">Your name</label>
                <input
                  id="fan-name"
                  value={fanName}
                  onChange={(e) => setFanName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                />
                <label htmlFor="event-code" className="sr-only">6-digit event code</label>
                <input
                  id="event-code"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value)}
                  placeholder="Enter 6-digit event code"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                />
                {fanError && (
                  <p role="alert" className="text-sm text-red-600">{fanError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    id="btn-join-fan"
                    type="button"
                    onClick={() => joinFanEvent()}
                    disabled={fanLoading}
                    aria-busy={fanLoading}
                    aria-label="Enter event using the code above"
                    className="flex-1 rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-white disabled:opacity-60"
                  >
                    {fanLoading ? "Joining…" : "Enter Event Code"}
                  </button>
                  <button
                    id="btn-scan-qr"
                    type="button"
                    onClick={() => setQrEnabled((v) => !v)}
                    aria-pressed={qrEnabled}
                    aria-label={qrEnabled ? "Close QR scanner" : "Open QR scanner to read event code"}
                    className="flex-1 rounded-2xl border border-[var(--line)] px-4 py-3 font-semibold"
                  >
                    {qrEnabled ? "Close Scanner" : "Scan QR"}
                  </button>
                </div>
                {qrEnabled && (
                  <div
                    id="event-code-reader"
                    role="region"
                    aria-label="QR code scanner"
                    aria-live="polite"
                    className="overflow-hidden rounded-3xl bg-white p-3"
                  />
                )}
              </div>
            </div>

            {/* Admin panel */}
            <div className="panel rounded-[28px] p-5">
              <h2 className="text-xl font-semibold">Admin Launch</h2>
              <div className="mt-4 space-y-3">
                <label htmlFor="admin-email" className="sr-only">Admin email</label>
                <input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Admin email"
                  autoComplete="email"
                  className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                />
                <label htmlFor="admin-password" className="sr-only">Admin password</label>
                <input
                  id="admin-password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Admin password"
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                />
                {adminError && (
                  <p role="alert" className="text-sm text-red-600">{adminError}</p>
                )}
                <button
                  id="btn-open-admin"
                  type="button"
                  onClick={loginAdmin}
                  disabled={adminLoading}
                  aria-busy={adminLoading}
                  aria-label="Open admin dashboard"
                  className="w-full rounded-2xl bg-[#111827] px-4 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {adminLoading ? "Opening…" : "Open Admin Dashboard"}
                </button>
                <button
                  id="btn-create-event"
                  type="button"
                  onClick={createEvent}
                  disabled={createLoading}
                  aria-busy={createLoading}
                  aria-label="Create a new demo event and generate QR code"
                  className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 font-semibold disabled:opacity-60"
                >
                  {createLoading ? "Creating…" : "Create Event and QR"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="grid gap-6">
          <div className="panel rounded-[30px] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Live Demo</div>
            <div className="mt-3 text-2xl font-semibold">
              {createdEvent?.event?.name || demoEvent?.name || "ZenVen Demo Event"}
            </div>
            <div className="mt-2 text-sm text-[var(--muted)]">Default event code</div>
            <div className="mt-2 text-4xl font-semibold tracking-[0.28em]" aria-label={`Event code: ${qrValue}`}>
              {qrValue}
            </div>
            <div className="mt-6 rounded-[28px] bg-white p-5">
              <QRCodeSVG value={qrValue} size={220} className="mx-auto" aria-label={`QR code for event ${qrValue}`} />
            </div>
          </div>

          <div className="panel rounded-[30px] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">What fans get</div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
              <li>Dual-route indoor navigation with live congestion updates</li>
              <li>Heatmap-aware nudges before chokepoints become dangerous</li>
              <li>Fixed SOS access from any screen in under two seconds</li>
              <li>Group meeting and separation alerts inside the venue</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
