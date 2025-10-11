import Keycloak from "keycloak-js";

interface AppConfig {
  auth: {
    provider: "local" | "keycloak";
    keycloak?: {
      url: string;
      realm: string;
      clientId: string;
    };
  };
}

let keycloak: Keycloak | null = null;
let config: AppConfig | null = null;
let configCache: AppConfig | null = null;

export async function fetchConfig(): Promise<AppConfig> {
  if (configCache) return configCache;
  
  const response = await fetch("/api/config");
  configCache = await response.json();
  config = configCache; // Keep backward compatibility
  return configCache!;
}

export function getConfig(): AppConfig | null {
  return configCache || config;
}

export async function initKeycloak(): Promise<Keycloak | null> {
  const cfg = await fetchConfig();
  
  if (cfg.auth.provider !== "keycloak" || !cfg.auth.keycloak) {
    return null;
  }

  if (keycloak) {
    return keycloak;
  }

  keycloak = new Keycloak({
    url: cfg.auth.keycloak.url,
    realm: cfg.auth.keycloak.realm,
    clientId: cfg.auth.keycloak.clientId,
  });

  try {
    // Initialize Keycloak with standard flow (no silent-check-sso iframe)
    const authenticated = await keycloak.init({
      onLoad: "check-sso",
      checkLoginIframe: false,
      pkceMethod: "S256",
    });

    // Make keycloak accessible globally for debugging
    (window as any).keycloak = keycloak;

    console.log("🔐 Keycloak initialized:", {
      authenticated,
      hasToken: !!keycloak.token,
      email: keycloak.tokenParsed?.email,
    });

    // Clean up URL hash if there's a Keycloak error (prevents #error=login_required flash)
    // BUT preserve callback parameters (state, code, session_state) needed for auth
    if (window.location.hash && window.location.hash.includes("error=")) {
      const hasCallbackParams = window.location.hash.includes("state=") || 
                               window.location.hash.includes("code=");
      
      // Only clean if it's an error WITHOUT callback params
      if (!hasCallbackParams) {
        console.log("🧹 Cleaning Keycloak error from URL");
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }

    if (authenticated) {
      console.log("✅ User authenticated via Keycloak");
      console.log("📧 Email:", keycloak.tokenParsed?.email);
      console.log("🎫 Token present:", !!keycloak.token);
      
      // Setup token refresh
      keycloak.onTokenExpired = () => {
        console.log("🔄 Token expired, refreshing...");
        keycloak?.updateToken(30).catch(() => {
          console.error("❌ Failed to refresh token");
        });
      };
    } else {
      console.log("⚠️ User not authenticated");
    }

    return keycloak;
  } catch (error) {
    console.error("❌ Keycloak init failed:", error);
    // Clean up URL hash on error too
    // BUT preserve callback parameters (state, code, session_state) needed for auth
    if (window.location.hash && window.location.hash.includes("error=")) {
      const hasCallbackParams = window.location.hash.includes("state=") || 
                               window.location.hash.includes("code=");
      
      // Only clean if it's an error WITHOUT callback params
      if (!hasCallbackParams) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
    return null;
  }
}

export function getKeycloak(): Keycloak | null {
  return keycloak;
}

export function isKeycloakAuthenticated(): boolean {
  return keycloak?.authenticated === true;
}

export function isKeycloakFullyReady(): boolean {
  const cfg = getConfig();
  
  // If using Keycloak as auth provider
  if (cfg?.auth.provider === "keycloak") {
    // Must have keycloak initialized
    if (!keycloak) return false; // Still initializing, wait
    
    // If authenticated, must have token
    if (keycloak.authenticated) {
      return !!keycloak.token;
    }
    
    // Not authenticated is OK (will show public pages)
    return true;
  }
  
  // Not using Keycloak (local auth)
  return true;
}

export async function keycloakLogin() {
  if (keycloak) {
    await keycloak.login({
      redirectUri: window.location.origin,
    });
  }
}

export async function keycloakLogout() {
  if (keycloak) {
    await keycloak.logout({
      redirectUri: window.location.origin,
    });
  }
}

export function getKeycloakToken(): string | undefined {
  const token = keycloak?.token;
  if (!token && keycloak) {
    console.warn("⚠️ Keycloak initialized but no token available", {
      authenticated: keycloak.authenticated,
      hasToken: !!keycloak.token,
    });
  }
  return token;
}

