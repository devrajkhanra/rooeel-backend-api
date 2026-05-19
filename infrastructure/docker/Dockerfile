# ─── Stage 1: Base dependencies ──────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --frozen-lockfile

# ─── Stage 2: Development (hot-reload with ts-node / nest start:dev) ─────────
FROM node:20-alpine AS development
WORKDIR /app
RUN apk add --no-cache openssl

# Copy all deps (including devDependencies needed for ts compilation)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Expose the API port
EXPOSE 5000

CMD ["npm", "run", "start:dev"]

# ─── Stage 3: Builder (compile TypeScript to dist/) ──────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client before build
RUN npx prisma generate --schema=src/prisma/schema.prisma

RUN npm run build

# ─── Stage 4: Production (lean, no devDeps, no src/) ─────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Only production deps
COPY package*.json ./
RUN npm ci --frozen-lockfile --omit=dev

# Copy compiled output and schema
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Expose port
EXPOSE 5000

CMD ["node", "dist/main"]
