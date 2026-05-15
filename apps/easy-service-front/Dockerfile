# syntax=docker/dockerfile:1.7
# Build from the monorepo root: docker build -f apps/easy-service-front/Dockerfile .

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV GIT_SSL_NO_VERIFY=true
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
RUN git config --system url."https://github.com/".insteadOf "git@github.com:" \
  && git config --system --add url."https://github.com/".insteadOf "ssh://git@github.com/" \
  && git config --system --add url."https://github.com/".insteadOf "git+ssh://git@github.com/" \
  && git config --system http.sslVerify false
WORKDIR /app

FROM base AS builder
ARG NEXT_PUBLIC_API_BASE_URL=""
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV MONGOMS_DISABLE_POSTINSTALL=1
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY shared/package.json ./shared/
COPY apps/easy-service/package.json ./apps/easy-service/
COPY apps/easy-service-front/package.json ./apps/easy-service-front/
RUN pnpm install --frozen-lockfile --filter "easy-service-front..." --filter "@easy-service/shared..."
COPY shared ./shared
COPY apps/easy-service-front ./apps/easy-service-front
RUN pnpm --filter @easy-service/shared build \
  && pnpm --filter easy-service-front build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app /app
WORKDIR /app/apps/easy-service-front
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
