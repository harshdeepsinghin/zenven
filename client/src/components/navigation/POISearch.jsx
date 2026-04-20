import { useMemo, useState } from "react";

export default function POISearch({ venueData, onSelect }) {
  const [query, setQuery] = useState("");
  const options = useMemo(() => {
    const lowerQuery = query.toLowerCase();
    return venueData.pois.filter((poi) => poi.name.toLowerCase().includes(lowerQuery));
  }, [query, venueData.pois]);

  return (
    <div className="panel rounded-3xl p-4">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
        Navigate To
      </label>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search gates, food, toilets"
        className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
      />
      <div className="mt-3 grid gap-2">
        {options.slice(0, 6).map((poi) => (
          <button
            key={poi.id}
            type="button"
            onClick={() => onSelect(poi)}
            className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-left transition hover:border-[var(--accent)]"
          >
            <span className="font-medium">{poi.name}</span>
            <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{poi.type}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
