FROM node:20.20.2-alpine AS builder

WORKDIR /app
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile

ARG SERVICE_PATH
RUN pnpm --filter "${SERVICE_PATH}" build

FROM node:20.20.2-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY --from=builder /app ./

ARG SERVICE_PATH
CMD ["sh", "-c", "pnpm --filter ${SERVICE_PATH} exec node dist/main.js"]
