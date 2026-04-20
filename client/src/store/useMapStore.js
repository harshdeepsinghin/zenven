import { create } from "zustand";

export const useMapStore = create((set) => ({
  zones: [],
  heatmapData: {},
  densityHistory: [],
  activeHeatmap: null,
  gateStatuses: {},
  announcements: [],
  latestNudge: null,
  groupPositions: [],
  updateVenueData: (venueData) =>
    set({
      zones: venueData?.zones || []
    }),
  updateHeatmap: (payload) =>
    set((state) => ({
      activeHeatmap: payload,
      heatmapData: Object.fromEntries(payload.zones.map((zone) => [zone.zoneId, zone])),
      densityHistory: [...state.densityHistory, payload].slice(-60)
    })),
  setGateStatus: (gateId, status) =>
    set((state) => ({
      gateStatuses: {
        ...state.gateStatuses,
        [gateId]: status
      }
    })),
  addAnnouncement: (announcement) =>
    set((state) => ({
      announcements: [announcement, ...state.announcements].slice(0, 20)
    })),
  pushNudge: (latestNudge) => set({ latestNudge }),
  setGroupPositions: (groupPositions) => set({ groupPositions })
}));
