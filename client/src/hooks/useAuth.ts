import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { getKeycloakToken, getConfig, getKeycloak } from "@/lib/keycloak";

export function useAuth() {
  const token = getKeycloakToken();
  const provider = getConfig()?.auth.provider || "local";
  
  // Persist last authentication state temporarily (hint for F5)
  const [wasAuthenticated, setWasAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('_auth_hint') === 'true';
  });

  const { data: user, isLoading: queryLoading, isFetching } = useQuery({
    // include token in key so it refetches when token appears/changes
    queryKey: ["/api/auth/user", token ?? "no-token"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    // for keycloak, wait until a token exists; for local, fetch immediately
    enabled: provider === "keycloak" ? !!token : true,
    // avoid caching 401 and ensure a fresh fetch on mount
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    retry: false,
  });

  // Update hint when user state changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('_auth_hint', 'true');
      setWasAuthenticated(true);
    } else if (!queryLoading && !isFetching) {
      localStorage.removeItem('_auth_hint');
      setWasAuthenticated(false);
    }
  }, [user, queryLoading, isFetching]);

  // Clear wasAuthenticated hint after 5 seconds if no user loaded (prevents infinite loading)
  useEffect(() => {
    const keycloakInstance = getKeycloak();
    const keycloakInitFinished = provider === "local" || !!keycloakInstance;
    
    if (wasAuthenticated && !user && keycloakInitFinished) {
      const timer = setTimeout(() => {
        console.warn("⏱️ Auth hint timeout - clearing to prevent infinite loading");
        setWasAuthenticated(false);
        localStorage.removeItem('_auth_hint');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [wasAuthenticated, user, provider]);

  // For Keycloak: loading if init hasn't finished OR query is loading/fetching
  // OR if we had auth before (F5 case) and still waiting for user
  const keycloakInstance = getKeycloak();
  const keycloakInitFinished = provider === "local" || !!keycloakInstance;
  
  const isLoading = (provider === "keycloak" && !keycloakInitFinished) || 
                    queryLoading || 
                    (provider === "keycloak" && !!token && !user && isFetching) ||
                    (provider === "keycloak" && wasAuthenticated && !user && keycloakInitFinished);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
