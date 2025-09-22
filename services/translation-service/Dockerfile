FROM node:18-alpine

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./
RUN npm install

# Copy project files
COPY tsconfig*.json ./
COPY src ./src

RUN npm run build

CMD ["node", "dist/main.js"]
