# Use the official VS Code devcontainer image for Node
# https://github.com/microsoft/vscode-dev-containers/tree/main/containers/javascript-node
ARG VARIANT="18-bullseye"
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:${VARIANT}

# Install MongoDB CLI tooling (optional, but handy for mongo shell / mongosh)
RUN apt-get update \
    && apt-get install -y mongodb-clients \
    && rm -rf /var/lib/apt/lists/*

# Set your working directory
WORKDIR /workspace

# Copy server dependency manifests and install
COPY --chown=node:node server/package*.json ./server/
RUN cd server && npm install

# Copy client dependency manifests and install (if you want to build or lint client here)
COPY --chown=node:node client/package*.json ./client/
RUN cd client && npm install

# Expose the application ports
EXPOSE 5000 3000 27017

# Switch to the non-root 'node' user provided by the base image
USER node

# By default, the docker-compose devcontainer will run your service command.
# You can override the CMD here if needed, e.g.:
# CMD ["npm", "run", "dev", "--prefix", "server"]
