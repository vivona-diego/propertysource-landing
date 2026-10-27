import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DataRoom, { DataRoomAcceptInvite } from "./pages/DataRoom";
import DataRoomAdmin from "./pages/DataRoomAdmin";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

function OwnerLoginReturn() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    if (location !== "/") return;
    try {
      if (sessionStorage.getItem("dataRoomReturnTo") === "/data-room/admin") {
        sessionStorage.removeItem("dataRoomReturnTo");
        setLocation("/data-room/admin");
      }
    } catch {
      // A completed OAuth flow can still return to the public site if storage is unavailable.
    }
  }, [location, setLocation]);
  return null;
}

function Router() {
  return (
    <>
      <OwnerLoginReturn />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/data-room" component={DataRoom} />
        <Route path="/data-room/accept" component={DataRoomAcceptInvite} />
        <Route path="/data-room/admin" component={DataRoomAdmin} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
