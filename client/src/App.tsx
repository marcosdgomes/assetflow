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
import AdminTenants from "@/pages/admin-tenants";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const token = getKeycloakToken();
  const provider = getConfig()?.auth.provider || "local";
  
  // Check if user is super admin (check first, before tenant query)
  const isSuperAdmin = (user as any)?.role === "super-admin";
  
  // Check if authenticated user has a tenant (skip for super-admin since they don't have tenants)
  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ["/api/tenant"],
    enabled: !!user && !isSuperAdmin,
    retry: false,
  });

  // For Keycloak: if we have a token but user hasn't loaded yet, keep loading
  // This prevents showing Landing briefly before user data arrives after F5
  const waitingForUserWithToken = provider === "keycloak" && !!token && !user;

  if (isLoading || (isAuthenticated && !isSuperAdmin && tenantLoading) || waitingForUserWithToken) {
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
          <Route path="/admin/tenants" component={AdminTenants} />
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
  const [checkingAutoLogin, setCheckingAutoLogin] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const cfg = await fetchConfig();
        
        if (cfg.auth.provider === "keycloak") {
          // Detecta callback do Keycloak na URL
          const hasCallback = window.location.hash && 
            (window.location.hash.includes("state=") || 
             window.location.hash.includes("code=") ||
             window.location.hash.includes("session_state="));

          // Detecta se é rota protegida (não landing, não login)
          const isProtectedRoute = !["/", "/login"].includes(window.location.pathname);

          // DEVE esperar Keycloak se:
          // - Tem callback (processando login), OU
          // - É rota protegida (F5 em /software, etc.)
          if (hasCallback || isProtectedRoute) {
            console.log("🔄 Waiting for Keycloak init:", { hasCallback, isProtectedRoute });
            await initKeycloak();
            setReady(true);
          } else {
            // Landing ou Login públicas → renderiza e verifica auto-login
            console.log("🚀 Public route, checking for auto-login in background");
            setReady(true);
            setCheckingAutoLogin(true);
            
            // Init em background para auto-login
            const result = await initKeycloak();
            
            // Se detectou sessão, mantém loading (evita flash)
            // Se não, libera landing
            if (result?.authenticated) {
              console.log("✅ Auto-login detected, will redirect to dashboard");
              // Mantém checkingAutoLogin = true, Router vai redirecionar
            } else {
              console.log("ℹ️ No session found, showing landing");
              setCheckingAutoLogin(false);
            }
          }
        } else {
          setReady(true);
        }
      } catch (error) {
        console.error("Failed to init:", error);
        setReady(true);
        setCheckingAutoLogin(false);
      }
    }
    init();
  }, []);

  // Block durante config ou durante check de auto-login
  if (!ready || checkingAutoLogin) {
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
