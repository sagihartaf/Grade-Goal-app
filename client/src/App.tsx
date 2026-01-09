import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { StickyBottomAd } from "@/components/AdPlaceholder";
import { Footer } from "@/components/Footer";
import { Analytics } from "@vercel/analytics/react";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import AnalyticsPage from "@/pages/Analytics";
import Profile from "@/pages/Profile";
import Subscription from "@/pages/Subscription";
import AdminDashboard from "@/pages/AdminDashboard";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import About from "@/pages/About";
import NotFound from "@/pages/not-found";

function AuthenticatedRoutes() {
  return (
    <>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/about" component={About} />
        <Route path="/analytics" component={AnalyticsPage} />
        <Route path="/profile" component={Profile} />
        <Route path="/subscription" component={Subscription} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route component={NotFound} />
      </Switch>
      <StickyBottomAd />
    </>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/about" component={About} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return <AuthenticatedRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
          <Analytics />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
