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
    return null;
  }
}

export function getKeycloak(): Keycloak | null {
  return keycloak;
}

export function isKeycloakAuthenticated(): boolean {
  return keycloak?.authenticated === true;
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

