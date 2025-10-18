FROM node:18-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev

WORKDIR /app

COPY services/api-service/package*.json ./
RUN npm install

COPY services/api-service/tsconfig*.json ./
COPY services/api-service/src ./src
COPY prisma ./prisma

RUN npx prisma generate
RUN npm run build

CMD ["node", "dist/main.js"]
