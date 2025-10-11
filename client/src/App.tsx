import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { initKeycloak, fetchConfig, getKeycloakToken, getConfig } from "@/lib/keycloak";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Setup from "@/pages/setup";
import Dashboard from "@/pages/dashboard";
import Departments from "@/pages/departments";
import Software from "@/pages/software";
import Discovery from "@/pages/discovery";
import Environments from "@/pages/environments";
import Dependencies from "@/pages/dependencies";
import Costs from "@/pages/costs";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminTenantDetail from "@/pages/admin-tenant-detail";
import AdminUsers from "@/pages/admin-users";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const token = getKeycloakToken();
  const provider = getConfig()?.auth.provider || "local";
  
  // Check if authenticated user has a tenant
  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ["/api/tenant"],
    enabled: !!user,
    retry: false,
  });

  // For Keycloak: if we have a token but user hasn't loaded yet, keep loading
  // This prevents showing Landing briefly before user data arrives after F5
  const waitingForUserWithToken = provider === "keycloak" && !!token && !user;

  if (isLoading || (isAuthenticated && tenantLoading) || waitingForUserWithToken) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is super admin
  const isSuperAdmin = (user as any)?.role === "super-admin";

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/login" component={Login} />
          <Route path="/" component={Landing} />
          {/* Fallback for unauthenticated: render Landing instead of 404 */}
          <Route component={Landing} />
        </>
      ) : isSuperAdmin ? (
        <>
          <Route path="/" component={AdminDashboard} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/tenants/:id" component={AdminTenantDetail} />
        </>
      ) : !tenant ? (
        <Route path="/" component={Setup} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/departments" component={Departments} />
          <Route path="/software" component={Software} />
          <Route path="/discovery" component={Discovery} />
          <Route path="/environments" component={Environments} />
          <Route path="/dependencies" component={Dependencies} />
          <Route path="/costs" component={Costs} />
        </>
      )}
      {/* Fallback for authenticated users: keep NotFound */}
      {isAuthenticated && <Route component={NotFound} />}
    </Switch>
  );
}

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const cfg = await fetchConfig();
        
        if (cfg.auth.provider === "keycloak") {
          // Init Keycloak in background without blocking
          initKeycloak().finally(() => setReady(true));
        } else {
          setReady(true);
        }
      } catch (error) {
        console.error("Failed to init:", error);
        setReady(true);
      }
    }
    init();
  }, []);

  // Only block while fetching config (very fast)
  if (!ready) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
