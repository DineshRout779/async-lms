FROM node:20-bullseye-slim

# Install Docker CLI so the backend can execute sibling containers
RUN apt-get update && \
    apt-get install -y docker.io && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port (default Express port)
EXPOSE 5000

# Start server
CMD ["npm", "start"]
