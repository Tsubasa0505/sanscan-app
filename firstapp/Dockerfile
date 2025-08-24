FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Development image
FROM base AS development
WORKDIR /app

# Install development dependencies
RUN apk add --no-cache git

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Expose port
EXPOSE 3010

# Set environment to development
ENV NODE_ENV=development
ENV PORT=3010

CMD ["npm", "run", "dev"]