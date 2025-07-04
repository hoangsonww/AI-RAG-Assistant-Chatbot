FROM node:18-alpine AS builder
WORKDIR /app

# ignore peer‐dep conflicts
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true

# install & build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Build the project
RUN npm run build

# runtime image
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app
EXPOSE 5000

# Start the app
CMD ["npm", "start"]
