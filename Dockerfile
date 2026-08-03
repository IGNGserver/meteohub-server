FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml tsconfig.json tsconfig.build.json drizzle.config.ts ./
COPY src ./src
COPY scripts ./scripts
COPY tests ./tests
COPY drizzle ./drizzle
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable && groupadd --system meteohub && useradd --system --gid meteohub --create-home meteohub
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY scripts/entrypoint.sh ./entrypoint.sh
RUN mkdir -p /app/data /app/backups /app/logs && chown -R meteohub:meteohub /app
USER meteohub
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/api/v1/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["sh", "entrypoint.sh"]
