# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar apenas arquivos de dependências
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar dependências da stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar código-fonte
COPY . .

# Build da aplicação (frontend + backend)
RUN pnpm run build

# Stage 3: Runner (imagem final)
FROM node:20-alpine AS runner
WORKDIR /app

# Instalar apenas dependências de produção
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar arquivos necessários
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copiar build da stage anterior
COPY --from=builder /app/dist ./dist

# Copiar arquivos de configuração necessários
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 assetflow && \
    chown -R assetflow:nodejs /app

USER assetflow

# Expor porta
EXPOSE 5002

# Variável de ambiente padrão
ENV NODE_ENV=production
ENV PORT=5002

# Comando de inicialização
CMD ["node", "dist/index.js"]

