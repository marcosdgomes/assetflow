import Keycloak from "keycloak-connect";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

let keycloak: Keycloak.Keycloak | null = null;

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

export async function setupKeycloakAuth(app: Express) {
  if (!process.env.KEYCLOAK_URL || !process.env.KEYCLOAK_REALM) {
    throw new Error("Keycloak configuration missing. Set KEYCLOAK_URL and KEYCLOAK_REALM");
  }

  app.set("trust proxy", 1);
  const sessionMiddleware = getSession();
  app.use(sessionMiddleware);

  // Keycloak configuration
  const keycloakConfig: any = {
    realm: process.env.KEYCLOAK_REALM!,
    "auth-server-url": process.env.KEYCLOAK_URL!,
    "ssl-required": "external",
    resource: process.env.KEYCLOAK_CLIENT_ID!,
    "public-client": true,
    "confidential-port": 0,
  };

  keycloak = new Keycloak({ store: sessionMiddleware }, keycloakConfig);

  // DO NOT use keycloak.middleware() - it intercepts all requests and causes CORS issues
  // We'll validate Bearer tokens manually in isKeycloakAuthenticated middleware

  // Logout endpoint
  app.get("/api/logout", (req, res) => {
    res.redirect("/");
  });

  console.log("✅ Keycloak authentication configured");
}

export const isKeycloakAuthenticated: RequestHandler = async (req, res, next) => {
  if (!keycloak) {
    return res.status(500).json({ message: "Keycloak not initialized" });
  }

  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("❌ No Bearer token found in request");
      return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    // Validate token using Keycloak Grant Manager
    const grant = await keycloak.grantManager.createGrant({
      access_token: token as any,
    });

    // Ensure token is still valid and fresh
    try {
      await keycloak.grantManager.ensureFreshness(grant);
    } catch (error) {
      console.log("❌ Token expired or invalid");
      return res.status(401).json({ message: "Token expired" });
    }

    const accessToken: any = grant.access_token;
    const tokenContent = accessToken?.content;
    if (!tokenContent) {
      console.log("❌ Invalid token content");
      return res.status(401).json({ message: "Invalid token content" });
    }

    const userId = tokenContent.sub;
    const email = tokenContent.email || "";
    const firstName = tokenContent.given_name || "";
    const lastName = tokenContent.family_name || "";
    
    // Extract roles from Keycloak token
    const realmRoles = tokenContent.realm_access?.roles || [];
    const isSuperAdmin = realmRoles.includes("super-admin");
    const role = isSuperAdmin ? "super-admin" : "user";

    // Upsert user in database with role from Keycloak
    await storage.upsertUser({
      id: userId,
      email: email,
      firstName: firstName,
      lastName: lastName,
      role: role,
    });

    // Attach user to request
    req.user = {
      id: userId,
      email: email,
      firstName: firstName,
      lastName: lastName,
      role: role,
      authType: 'keycloak',
      token: token,
    };

    console.log(`✅ User authenticated: ${email || userId} (role: ${role})`);
    next();
  } catch (error) {
    console.error("❌ Error validating Keycloak token:", error);
    return res.status(401).json({ message: "Unauthorized - Invalid token" });
  }
};

// Export function to get user ID from request (compatible with local auth)
export function getUserIdFromKeycloak(req: any): string | undefined {
  return req.user?.id;
}

