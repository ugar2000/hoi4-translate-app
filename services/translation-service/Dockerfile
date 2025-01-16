FROM node:18-alpine

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./
RUN npm install

# Copy TypeScript config
COPY tsconfig.json ./

# Copy source code
COPY src ./src

# Start the service
CMD ["npm", "start"]
