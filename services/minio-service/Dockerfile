FROM node:20-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

ARG NODE_ENV=production

COPY services/minio-service/package*.json ./
RUN npm install
RUN ln -s /app/node_modules /node_modules

COPY services/minio-service/tsconfig*.json ./
COPY services/minio-service/src ./src
COPY packages /packages

RUN npm run build
RUN if [ "$NODE_ENV" = "production" ]; then npm prune --omit=dev; fi

CMD ["node", "dist/index.js"]
