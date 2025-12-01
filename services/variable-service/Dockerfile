FROM node:20-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

ARG NODE_ENV=production

COPY services/variable-service/package*.json ./
RUN npm install
RUN ln -s /app/node_modules /node_modules

COPY services/variable-service/tsconfig*.json ./
COPY services/variable-service/src ./src
COPY packages /packages

RUN npm run build
RUN if [ "$NODE_ENV" = "production" ]; then npm prune --omit=dev; fi

CMD ["node", "dist/index.js"]
