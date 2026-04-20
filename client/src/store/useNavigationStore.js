import { create } from "zustand";

export const useNavigationStore = create((set) => ({
  destination: null,
  routeOptions: null,
  activeRoute: null,
  routeType: "fastest",
  setDestination: (destination) => set({ destination }),
  setRouteOptions: (routeOptions) => set({ routeOptions }),
  setRoute: ({ route, routeType }) => set({ activeRoute: route, routeType }),
  clearRoute: () =>
    set({
      destination: null,
      routeOptions: null,
      activeRoute: null,
      routeType: "fastest"
    })
}));
