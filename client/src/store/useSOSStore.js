import { create } from "zustand";

export const useSOSStore = create((set) => ({
  sosAlerts: [],
  evacuationMode: false,
  evacuationRoute: null,
  triggerSOS: (sosAlert) =>
    set((state) => ({
      sosAlerts: [sosAlert, ...state.sosAlerts]
    })),
  resolveAlert: (resolvedAlert) =>
    set((state) => ({
      sosAlerts: state.sosAlerts.map((alert) =>
        alert.id === resolvedAlert.id ? resolvedAlert : alert
      )
    })),
  setEvacuationMode: (evacuationMode, evacuationRoute = null) =>
    set({
      evacuationMode,
      evacuationRoute
    })
}));
