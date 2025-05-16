# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if present)
COPY package*.json ./

# Install dependencies
RUN npm install

# Install PostgreSQL client libraries
RUN apt-get update && apt-get install -y postgresql-client

# Copy the rest of the application code
COPY . .

# Build the project (if needed)
RUN npm run build

# Expose the port the app runs on
EXPOSE 5000

# Start the app
CMD ["npm", "start"]
