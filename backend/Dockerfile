FROM node:18-alpine

WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files first for better caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8000

# Start the server
CMD ["node", "server.js"]