import { Component } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import FanMapPage from "./pages/FanMapPage";
import AdminDashboard from "./pages/AdminDashboard";
import EvacuationPage from "./pages/EvacuationPage";
import { useEventStore } from "./store/useEventStore";
import { useSOSStore } from "./store/useSOSStore";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function RequireFan({ children }) {
  const eventId = useEventStore((state) => state.eventId);
  const role = useEventStore((state) => state.role);

  if (!eventId || role !== "fan") {
    return <Navigate to="/" replace />;
  }

  return children;
}

function RequireAdmin({ children }) {
  const eventId = useEventStore((state) => state.eventId);
  const role = useEventStore((state) => state.role);

  if (!eventId || role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const evacuationMode = useSOSStore((state) => state.evacuationMode);
  const role = useEventStore((state) => state.role);

  if (evacuationMode && role === "fan") {
    return <EvacuationPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/fan"
        element={
          <RequireFan>
            <ErrorBoundary fallback={<div className="app-shell flex min-h-screen items-center justify-center">Venue map hit error.</div>}>
              <FanMapPage />
            </ErrorBoundary>
          </RequireFan>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <ErrorBoundary fallback={<div className="app-shell flex min-h-screen items-center justify-center">Admin dashboard hit error.</div>}>
              <AdminDashboard />
            </ErrorBoundary>
          </RequireAdmin>
        }
      />
      <Route path="/evacuation" element={<EvacuationPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
