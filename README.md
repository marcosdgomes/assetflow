# AssetFlow - Software Asset Management

Sistema de gerenciamento de ativos de software com multi-tenancy e autenticação Keycloak.

## 🚀 Como Rodar

### 1. Instalar Dependências
```bash
pnpm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database
PORT=5002
NODE_ENV=development
SESSION_SECRET=change-me-in-production

# Authentication Provider (local ou keycloak)
AUTH_PROVIDER=keycloak

# Keycloak Configuration (quando AUTH_PROVIDER=keycloak)
KEYCLOAK_REALM=seu-realm
KEYCLOAK_URL=https://seu-keycloak.com
KEYCLOAK_CLIENT_ID=assetflow
KEYCLOAK_CLIENT_SECRET=seu-secret (opcional para public client)
```

### 3. Criar Tabelas no Banco
```bash
pnpm run db:push
```

### 4. Iniciar Servidor
```bash
pnpm run dev
```

Acesse: `http://localhost:5002`

## 🔐 Autenticação

### Auth Local (Desenvolvimento)
```bash
# No .env
AUTH_PROVIDER=local

# Credenciais default:
Username: admin
Password: admin123
```

### Auth Keycloak (Produção)
```bash
# No .env
AUTH_PROVIDER=keycloak
KEYCLOAK_REALM=seu-realm
KEYCLOAK_URL=https://seu-keycloak.com
KEYCLOAK_CLIENT_ID=assetflow
```

## 📦 Estrutura do Projeto

```
/client          → Frontend React + TypeScript
  /src
    /pages       → Páginas (dashboard, software, etc)
    /components  → Componentes UI
    /hooks       → Hooks customizados
    /lib         → Utilitários e configs
    
/server          → Backend Express + TypeScript
  index.ts       → Entry point
  routes.ts      → Rotas da API
  storage.ts     → Data access layer
  keycloakAuth.ts → Autenticação Keycloak
  replitAuth.ts  → Autenticação Local
  
/shared          → Schema compartilhado (Drizzle ORM)
```

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
pnpm run dev

# Build para produção
pnpm run build

# Iniciar produção
pnpm run start

# Atualizar schema do banco
pnpm run db:push

# Type checking
pnpm run check
```

## 🐛 Troubleshooting

### Erro: DATABASE_URL não encontrada
- Certifique-se de que o `.env` está na raiz
- Verifique se `dotenv` está sendo importado primeiro em `server/index.ts`

### Erro: Porta 5000/5002 em uso
- macOS: Desabilite AirPlay Receiver ou mude a porta no `.env`
- Linux/Windows: Mate o processo: `lsof -ti:5002 | xargs kill -9`

### Erro: Keycloak CORS
- Configure `Web Origins` no Keycloak client
- Adicione `http://localhost:5002` nas URIs válidas

### Erro: Token não encontrado
- Verifique console do browser para logs do Keycloak
- Digite `keycloak.token` no console para verificar se há token
- Certifique-se que o client está configurado como Public no Keycloak

## 📚 Stack Tecnológico

- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend:** Express, TypeScript (ESM), Drizzle ORM
- **Database:** PostgreSQL (Neon serverless)
- **Auth:** Keycloak (OpenID Connect) ou Local (Passport.js + bcrypt)
- **State:** React Query (TanStack Query)

## 🎯 Features Implementadas

- ✅ Multi-tenancy completo
- ✅ Gestão de usuários e permissões
- ✅ Software assets (tracking, versões, custos)
- ✅ Ambientes (cloud, on-premise)
- ✅ Mapeamento de dependências
- ✅ Discovery de software (estrutura)
- ✅ Dashboard com KPIs
- ✅ Activity feed
- ✅ Autenticação Keycloak + Local


