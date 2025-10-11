# Configuração Keycloak - AssetFlow

## 🔧 2 Clients Necessários

**Realm:** `infra-team-dev`

### Client 1: `assetflow-frontend` (Login de Usuários)
```
Client authentication: OFF (Public)
Standard flow: ON
Direct access grants: ON
PKCE: S256

Valid redirect URIs: http://localhost:5002/*
Web origins: http://localhost:5002
```

### Client 2: `assetflow-backend` (Admin API)
```
Client authentication: ON (Confidential)
Service accounts roles: ON

Service Account Roles:
  realm-management → manage-users
  realm-management → view-users
```

## 🎭 Realm Role

```
Realm Roles → Create:
  Name: super-admin
```

## 👥 Super Admin User

```
Users → Add User:
  Username: admin
  Email: admin@example.com

Credentials:
  Password: [sua-senha]
  Temporary: OFF

Role Mappings:
  Assign: super-admin
```

## 🔑 .env

```bash
AUTH_PROVIDER=keycloak
KEYCLOAK_REALM=infra-team-dev
KEYCLOAK_URL=https://auth.cloud.dmcitsolutions.com
KEYCLOAK_CLIENT_ID=assetflow-frontend
KEYCLOAK_ADMIN_CLIENT_ID=assetflow-backend
KEYCLOAK_ADMIN_CLIENT_SECRET=[copiar de assetflow-backend → Credentials]
```

## 📊 Como Funciona

**Login (Frontend):**
- Usa `assetflow-frontend` (Public)
- Flow: Authorization Code + PKCE
- Sem client secret

**Criar Usuários (Backend):**
- Usa `assetflow-backend` (Confidential)
- Flow: Service Account (client credentials)
- Com client secret
- Cria users no Keycloak via Admin API

**Resultado:**
- Usuários criados pelo AssetFlow existem no Keycloak
- Podem logar via Keycloak imediatamente
- Roles sincronizadas automaticamente

