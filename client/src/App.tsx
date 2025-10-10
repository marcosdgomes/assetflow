import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
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

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Check if authenticated user has a tenant
  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ["/api/tenant"],
    enabled: !!user,
    retry: false,
  });

  if (isLoading || (isAuthenticated && tenantLoading)) {
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
  const isSuperAdmin = user?.role === "super-admin";

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : isSuperAdmin ? (
        <>
          <Route path="/" component={AdminDashboard} />
          <Route path="/admin" component={AdminDashboard} />
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
