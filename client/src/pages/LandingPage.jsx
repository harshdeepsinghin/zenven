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

  useEffect(() => {
    fetch(`${apiBaseUrl}/health`)
      .then((response) => response.json())
      .then((data) => setDemoEvent(data.defaultEvent))
      .catch(() => {});
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!qrEnabled) {
      return undefined;
    }

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

  const qrValue = useMemo(() => createdEvent?.event?.eventCode || demoEvent?.eventCode || "424242", [createdEvent, demoEvent]);

  const joinFanEvent = async (code = eventCode) => {
    const response = await fetch(`${apiBaseUrl}/events/${code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fanName || "Match Fan",
        role: "fan"
      })
    });
    const data = await response.json();
    joinEvent({
      ...data,
      role: "fan",
      user: {
        id: data.userId,
        name: fanName || "Match Fan"
      }
    });
    updateVenueData(data.venueData);
    navigate("/fan");
  };

  const openDemoAdmin = async () => {
    if (!demoEvent) {
      return;
    }

    const response = await fetch(`${apiBaseUrl}/events/${demoEvent.id}`);
    const data = await response.json();
    joinEvent({
      eventId: data.event.id,
      userId: "local-admin",
      role: "admin",
      userToken: "dev-local-admin",
      venueData: data.venueData,
      event: data.event,
      user: {
        id: "local-admin",
        name: "Venue Admin"
      }
    });
    updateVenueData(data.venueData);
    navigate("/admin");
  };

  const loginAdmin = async () => {
    if (supabase && adminEmail && adminPassword) {
      await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword
      });
    }

    await openDemoAdmin();
  };

  const createEvent = async () => {
    const response = await fetch(`${apiBaseUrl}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "local-admin",
        "x-user-role": "admin"
      },
      body: JSON.stringify({
        name: "ZenVen Demo Night",
        capacity: 12000,
        status: "active"
      })
    });
    const data = await response.json();
    setCreatedEvent(data);
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
            <div className="panel rounded-[28px] p-5">
              <h2 className="text-xl font-semibold">Join as Fan</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={fanName}
                  onChange={(event) => setFanName(event.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                />
                <input
                  value={eventCode}
                  onChange={(event) => setEventCode(event.target.value)}
                  placeholder="Enter 6-digit event code"
                  className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => joinFanEvent()} className="flex-1 rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-white">
                    Enter Event Code
                  </button>
                  <button type="button" onClick={() => setQrEnabled((value) => !value)} className="flex-1 rounded-2xl border border-[var(--line)] px-4 py-3 font-semibold">
                    Scan QR
                  </button>
                </div>
                {qrEnabled ? <div id="event-code-reader" className="overflow-hidden rounded-3xl bg-white p-3" /> : null}
              </div>
            </div>

            <div className="panel rounded-[28px] p-5">
              <h2 className="text-xl font-semibold">Admin Launch</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  placeholder="Admin email"
                  className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                />
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  placeholder="Admin password"
                  className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                />
                <button type="button" onClick={loginAdmin} className="w-full rounded-2xl bg-[#111827] px-4 py-3 font-semibold text-white">
                  Open Admin Dashboard
                </button>
                <button type="button" onClick={createEvent} className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 font-semibold">
                  Create Event and QR
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="grid gap-6">
          <div className="panel rounded-[30px] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Live Demo</div>
            <div className="mt-3 text-2xl font-semibold">{createdEvent?.event?.name || demoEvent?.name || "ZenVen Demo Event"}</div>
            <div className="mt-2 text-sm text-[var(--muted)]">Default event code</div>
            <div className="mt-2 text-4xl font-semibold tracking-[0.28em]">{qrValue}</div>
            <div className="mt-6 rounded-[28px] bg-white p-5">
              <QRCodeSVG value={qrValue} size={220} className="mx-auto" />
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
