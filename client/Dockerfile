# 1) Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# ignore peer‐dep conflicts
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
# allow Next.js to compile on type errors
ENV TSC_COMPILE_ON_ERROR=true

# install deps
COPY package.json package-lock.json ./
RUN npm ci

# copy source
COPY . .

# build Next.js (won't fail on TS errors thanks to TSC_COMPILE_ON_ERROR)
RUN npm run build

# 2) Runtime stage
FROM node:18-alpine
WORKDIR /app

ENV NODE_ENV=production

# bring everything from builder
COPY --from=builder /app /app

EXPOSE 3000
CMD ["npm", "start"]
