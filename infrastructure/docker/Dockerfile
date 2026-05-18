# -----------------------------------
# Stage 1: Builder
# -----------------------------------
FROM node:20-alpine AS builder

# THE FIX: Install OpenSSL for the Prisma Query Engine
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy prisma from inside the src folder!
COPY src/prisma ./src/prisma/

# Install ALL dependencies
RUN npm ci

# Tell Prisma exactly where the schema file is
RUN npx prisma generate --schema=src/prisma/schema.prisma

# Copy the rest of the application code
COPY . .

# Build the NestJS application
RUN npm run build

# -----------------------------------
# Stage 2: Production
# -----------------------------------
FROM node:20-alpine AS production

# THE FIX: Install OpenSSL for the Production runtime too
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy prisma from inside the src folder!
COPY src/prisma ./src/prisma/

# Install ONLY production dependencies
RUN npm ci --omit=dev

# Tell Prisma exactly where the schema file is
RUN npx prisma generate --schema=src/prisma/schema.prisma

# Copy the compiled /dist folder from the builder stage
COPY --from=builder /app/dist ./dist

# Set Node environment to production
ENV NODE_ENV=production

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]