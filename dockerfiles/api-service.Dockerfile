FROM node:18-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev

WORKDIR /app

COPY services/api-service/package*.json ./
RUN npm install
RUN ln -s /app/node_modules /node_modules

COPY services/api-service/tsconfig*.json ./
COPY services/api-service/src ./src
COPY services/api-service/prisma ./prisma
COPY packages /packages

RUN npx prisma generate
RUN npm run build

CMD ["node", "dist/main.js"]
