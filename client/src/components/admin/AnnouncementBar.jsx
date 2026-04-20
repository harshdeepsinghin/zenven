import { useState } from "react";
import { getSocket } from "../../hooks/useSocket";
import { useEventStore } from "../../store/useEventStore";

export default function AnnouncementBar() {
  const { eventId } = useEventStore();
  const [message, setMessage] = useState("");

  return (
    <div className="panel rounded-3xl p-5">
      <h3 className="text-lg font-semibold">Announcement</h3>
      <div className="mt-4 flex gap-3">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Broadcast venue update"
          className="flex-1 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => {
            getSocket()?.emit("admin:announce", {
              eventId,
              message,
              type: "info"
            });
            setMessage("");
          }}
          className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
        >
          Broadcast
        </button>
      </div>
    </div>
  );
}
