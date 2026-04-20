import { create } from "zustand";

export const useEventStore = create((set) => ({
  eventId: "",
  userId: "",
  role: "fan",
  userToken: "",
  venueData: null,
  event: null,
  user: null,
  currentZoneId: "gate-a",
  joinEvent: ({ eventId, userId, role, venueData, userToken, event, user }) =>
    set({
      eventId,
      userId,
      role,
      venueData,
      userToken,
      event,
      user,
      currentZoneId: "gate-a"
    }),
  leaveEvent: () =>
    set({
      eventId: "",
      userId: "",
      role: "fan",
      userToken: "",
      venueData: null,
      event: null,
      user: null,
      currentZoneId: "gate-a"
    }),
  setCurrentZoneId: (currentZoneId) => set({ currentZoneId })
}));
