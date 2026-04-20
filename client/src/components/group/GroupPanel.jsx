import { useState } from "react";
import { getSocket } from "../../hooks/useSocket";
import { useEventStore } from "../../store/useEventStore";
import { getApiBaseUrl } from "../../lib/runtimeConfig";

export default function GroupPanel() {
  const apiBaseUrl = getApiBaseUrl();
  const { eventId, userId } = useEventStore();
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [activeGroup, setActiveGroup] = useState(null);

  const createGroup = async () => {
    const response = await fetch(`${apiBaseUrl}/events/${eventId}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: groupName || "My Squad",
        userId
      })
    });
    const data = await response.json();
    setActiveGroup(data.group);
    getSocket()?.emit("join:group", { groupId: data.group.id, userId });
  };

  const joinGroup = async () => {
    const response = await fetch(`${apiBaseUrl}/groups/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        joinCode,
        userId
      })
    });
    const data = await response.json();
    setActiveGroup(data.group);
    getSocket()?.emit("join:group", { groupId: data.group.id, userId });
  };

  return (
    <div className="panel rounded-3xl p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Group Sync</h3>
        {activeGroup ? (
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
            Code {activeGroup.joinCode}
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3">
        <input
          value={groupName}
          onChange={(event) => setGroupName(event.target.value)}
          placeholder="Create group name"
          className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
        />
        <button type="button" onClick={createGroup} className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white">
          Create Group
        </button>
        <div className="h-px bg-[var(--line)]" />
        <input
          value={joinCode}
          onChange={(event) => setJoinCode(event.target.value)}
          placeholder="Enter 4-digit join code"
          className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
        />
        <button type="button" onClick={joinGroup} className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm font-semibold">
          Join Group
        </button>
      </div>
    </div>
  );
}
