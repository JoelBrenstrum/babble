# Build from the repository root: docker build -f apps/web/Dockerfile .
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch
COPY . .
RUN pnpm install --offline --frozen-lockfile --filter @babble/web...
RUN pnpm --filter @babble/web build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
COPY --from=build /repo/apps/web/.output ./.output
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", ".output/server/index.mjs"]
