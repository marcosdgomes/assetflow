# Guia de Roles e Permissões - AssetFlow

## 🎭 Sistema de Roles

O AssetFlow usa um sistema de roles em 2 níveis:

### 1. **Realm Roles (Keycloak)**
Definidas no Keycloak, mapeadas automaticamente para o AssetFlow.

### 2. **Tenant Roles (AssetFlow)**
Definidas por tenant, independentes das realm roles.

---

## 🔐 Realm Roles (Global)

### **super-admin** ⭐
**Como configurar no Keycloak:**
1. Realm Roles → Create Role
2. Role Name: `super-admin`
3. Atribuir ao usuário: Users → [User] → Role Mappings → Assign Role

**Permissões:**
- ✅ Ver todos os tenants
- ✅ Criar/editar/deletar tenants
- ✅ Ver todos os usuários
- ✅ Criar usuários
- ✅ Promover/despromover usuários
- ✅ Atribuir usuários a tenants
- ✅ Acessar `/admin` dashboard

**Rotas exclusivas:**
```
GET    /api/admin/users
POST   /api/admin/users
PATCH  /api/admin/users/:id/role
GET    /api/admin/tenants
POST   /api/admin/tenants
GET    /api/admin/tenants/:id
PATCH  /api/admin/tenants/:id
DELETE /api/admin/tenants/:id
GET    /api/admin/tenants/:id/users
POST   /api/admin/tenants/:id/users
DELETE /api/admin/tenants/:id/users/:userId
PATCH  /api/admin/tenants/:id/users/:userId/role
```

### **user** (Default)
Usuários sem a role `super-admin` são automaticamente `user`.

**Permissões:**
- ✅ Acessar tenant(s) que foi atribuído
- ✅ Gerenciar assets do tenant (conforme tenant role)
- ❌ Não pode criar tenants
- ❌ Não pode ver outros tenants
- ❌ Não pode acessar `/admin`

---

## 👥 Tenant Roles (Por Tenant)

Definidas na tabela `user_tenants`, cada usuário pode ter role diferente em cada tenant.

### **admin** (Tenant Admin)
**Permissões dentro do tenant:**
- ✅ Todas as operações CRUD
- ✅ Criar/editar/deletar departments
- ✅ Criar/editar/deletar software assets
- ✅ Criar/editar/deletar environments
- ✅ Gerenciar discovery agents
- ✅ Ver custos e relatórios

### **user** (Tenant User)
**Permissões dentro do tenant:**
- ✅ Ver departments, software, environments
- ✅ Criar software assets
- ✅ Ver custos e dependências
- ❌ Não pode deletar (implementação futura)
- ❌ Não pode gerenciar discovery agents (implementação futura)

---

## 🎯 Combinações Possíveis

### **Super Admin SEM tenant:**
- Acessa: Super Admin Dashboard
- Gerencia todos os tenants e usuários
- Pode criar tenants para si mesmo

### **Super Admin COM tenant:**
- Acessa: Super Admin Dashboard (se acessar `/admin`)
- Acessa: Tenant Dashboard (se acessar `/`)
- Pode gerenciar qualquer tenant

### **User SEM tenant:**
- Acessa: Setup (criar workspace)
- Após criar, vira Tenant Admin do tenant criado

### **User COM tenant:**
- Acessa: Tenant Dashboard
- Permissões dependem do tenant role (admin/user)

---

## 🔄 Mapeamento Automático (Keycloak → AssetFlow)

```typescript
// Backend: server/keycloakAuth.ts

// Extrai roles do token JWT
const realmRoles = tokenContent.realm_access?.roles || [];

// Verifica se tem role super-admin
const isSuperAdmin = realmRoles.includes("super-admin");

// Define role no AssetFlow
const role = isSuperAdmin ? "super-admin" : "user";

// Salva no banco
await storage.upsertUser({ ..., role: role });
```

**Sincronização:**
- ✅ Automática a cada login
- ✅ Se remover role no Keycloak, próximo login perde permissão
- ✅ Se adicionar role no Keycloak, próximo login ganha permissão

---

## 🛡️ Segurança

### **Middleware no Backend:**

```typescript
// Requer autenticação
isAuthenticated  → Verifica se user existe

// Requer super admin
isSuperAdmin     → Verifica if user.role === "super-admin"

// Exemplo de uso:
app.get("/api/admin/tenants", isAuthenticated, isSuperAdmin, ...)
```

### **Frontend Guard:**

```typescript
// App.tsx linha 45
const isSuperAdmin = user?.role === "super-admin";

// Renderiza rotas diferentes baseado na role
if (isSuperAdmin) → Admin routes
else             → Tenant routes
```

---

## 📋 Checklist para Adicionar Super Admin

### No Keycloak:
1. ✅ Realm Roles → Create Role → Nome: `super-admin`
2. ✅ Users → [Usuário] → Role Mappings → Assign `super-admin`
3. ✅ Salvar

### No AssetFlow:
1. ✅ User faz logout (se logado)
2. ✅ User faz login novamente (para pegar novo token)
3. ✅ Sistema detecta role `super-admin` automaticamente
4. ✅ Redireciona para Super Admin Dashboard

---

## 🧪 Como Testar

### 1. Criar Super Admin:
```bash
# No Keycloak:
- Create role "super-admin"
- Atribuir ao usuário teste@teste.com

# No app:
- Fazer logout
- Fazer login novamente
- Deve ir para Super Admin Dashboard
```

### 2. Verificar Role:
```javascript
// No browser console (F12):
fetch('/api/auth/user', {credentials: 'include'})
  .then(r => r.json())
  .then(u => console.log('Role:', u.role));
// Deve mostrar: "super-admin"
```

### 3. Testar Permissões:
- Acessar `/admin` → Deve mostrar dashboard
- Criar novo tenant → Deve funcionar
- Ver todos os usuários → Deve listar

---

## 🔄 Mudança de Roles

### Promover User → Super Admin:
1. Keycloak: Atribuir role `super-admin` ao user
2. AssetFlow: User faz logout e login
3. Próximo login: será super admin

### Despromover Super Admin → User:
1. Keycloak: Remover role `super-admin` do user
2. AssetFlow: User faz logout e login
3. Próximo login: será user comum

**Importante:** Mudanças no Keycloak só têm efeito **após novo login** (novo token).

---

## 🎯 Boas Práticas

### Para Produção:
- ✅ Criar poucos super admins (1-3 pessoas)
- ✅ Usar super admin só para gestão de plataforma
- ✅ Usuários normais usam tenant roles (admin/user)
- ✅ Auditar mudanças de roles
- ✅ Usar grupos do Keycloak para organizar users

### Para Desenvolvimento:
- ✅ Use `AUTH_PROVIDER=local` para dev rápido
- ✅ Use `AUTH_PROVIDER=keycloak` para testar integração
- ✅ Mantenha ambos funcionando (flexibilidade)

