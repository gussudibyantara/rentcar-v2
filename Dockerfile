FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@11.25.0
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/src/lib/db ./src/lib/db
COPY --from=builder --chown=node:node /app/database ./database
COPY --from=builder --chown=node:node /app/scripts ./scripts
RUN mkdir -p /var/lib/travelos/uploads && chown -R node:node /var/lib/travelos
USER node
EXPOSE 3000
CMD ["sh","-c","node scripts/check-vps-config.cjs && exec node server.js"]
