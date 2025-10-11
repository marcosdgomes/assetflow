import KcAdminClient from "@keycloak/keycloak-admin-client";

let kcAdminClient: KcAdminClient | null = null;

async function getKeycloakAdminClient(): Promise<KcAdminClient | null> {
  // Only initialize if using Keycloak auth
  if (process.env.AUTH_PROVIDER !== "keycloak") {
    return null;
  }

  if (!process.env.KEYCLOAK_URL || !process.env.KEYCLOAK_REALM || !process.env.KEYCLOAK_ADMIN_CLIENT_ID) {
    console.error("❌ Keycloak Admin API configuration missing");
    return null;
  }

  if (kcAdminClient) {
    return kcAdminClient;
  }

  try {
    kcAdminClient = new KcAdminClient({
      baseUrl: process.env.KEYCLOAK_URL,
      realmName: process.env.KEYCLOAK_REALM,
    });

    // Authenticate using service account (backend client)
    if (process.env.KEYCLOAK_ADMIN_CLIENT_SECRET) {
      await kcAdminClient.auth({
        grantType: "client_credentials",
        clientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID,
        clientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
      });
      
      console.log("✅ Keycloak Admin API authenticated");
    } else {
      console.warn("⚠️ KEYCLOAK_ADMIN_CLIENT_SECRET not set. Admin API will not work.");
      return null;
    }

    return kcAdminClient;
  } catch (error) {
    console.error("❌ Failed to initialize Keycloak Admin Client:", error);
    kcAdminClient = null;
    return null;
  }
}

export interface CreateKeycloakUserParams {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  enabled?: boolean;
}

export async function createKeycloakUser(params: CreateKeycloakUserParams): Promise<string | null> {
  const client = await getKeycloakAdminClient();
  
  if (!client) {
    console.log("⚠️ Keycloak Admin API not available, skipping user creation in Keycloak");
    return null;
  }

  try {
    // Renovar token antes da operação para garantir que está válido
    if (process.env.KEYCLOAK_ADMIN_CLIENT_SECRET) {
      await client.auth({
        grantType: "client_credentials",
        clientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID!,
        clientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
      });
    }

    // Create user in Keycloak
    const { id } = await client.users.create({
      username: params.username,
      email: params.email,
      firstName: params.firstName || "",
      lastName: params.lastName || "",
      emailVerified: params.emailVerified ?? false,
      enabled: params.enabled ?? true,
      credentials: [
        {
          type: "password",
          value: params.password,
          temporary: false, // User doesn't need to change password on first login
        },
      ],
    });

    console.log(`✅ User created in Keycloak: ${params.email} (ID: ${id})`);
    return id;
  } catch (error: any) {
    console.error("❌ Error creating user in Keycloak:", error.response?.data || error.message);
    
    // Check for specific errors
    if (error.response?.status === 409) {
      throw new Error(`User with username "${params.username}" or email "${params.email}" already exists in Keycloak`);
    }
    
    // Retornar erro mais detalhado
    const errorMsg = error.response?.data?.errorMessage || error.message || "Unknown error";
    throw new Error(`Keycloak error: ${errorMsg}`);
  }
}

export async function deleteKeycloakUser(userId: string): Promise<boolean> {
  const client = await getKeycloakAdminClient();
  
  if (!client) {
    console.log("⚠️ Keycloak Admin API not available, skipping user deletion in Keycloak");
    return false;
  }

  try {
    // Renovar token antes da operação
    if (process.env.KEYCLOAK_ADMIN_CLIENT_SECRET) {
      await client.auth({
        grantType: "client_credentials",
        clientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID!,
        clientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
      });
    }

    await client.users.del({ id: userId });
    console.log(`✅ User deleted from Keycloak: ${userId}`);
    return true;
  } catch (error) {
    console.error("❌ Error deleting user from Keycloak:", error);
    return false;
  }
}

export async function updateKeycloakUserPassword(userId: string, newPassword: string): Promise<boolean> {
  const client = await getKeycloakAdminClient();
  
  if (!client) {
    return false;
  }

  try {
    // Renovar token antes da operação
    if (process.env.KEYCLOAK_ADMIN_CLIENT_SECRET) {
      await client.auth({
        grantType: "client_credentials",
        clientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID!,
        clientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
      });
    }

    await client.users.resetPassword({
      id: userId,
      credential: {
        type: "password",
        value: newPassword,
        temporary: false,
      },
    });
    
    console.log(`✅ Password updated for user: ${userId}`);
    return true;
  } catch (error) {
    console.error("❌ Error updating password in Keycloak:", error);
    return false;
  }
}

export async function checkKeycloakConnection(): Promise<boolean> {
  const client = await getKeycloakAdminClient();
  return client !== null;
}

