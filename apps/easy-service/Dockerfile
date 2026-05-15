# syntax=docker/dockerfile:1.7
# Build from the monorepo root: docker build -f apps/easy-service/Dockerfile .

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV GIT_SSL_NO_VERIFY=true
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    fonts-liberation \
    fonts-noto-color-emoji \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    wget \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
RUN git config --system url."https://github.com/".insteadOf "git@github.com:" \
  && git config --system --add url."https://github.com/".insteadOf "ssh://git@github.com/" \
  && git config --system --add url."https://github.com/".insteadOf "git+ssh://git@github.com/" \
  && git config --system http.sslVerify false
WORKDIR /app

FROM base AS builder
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc .puppeteerrc.cjs ./
COPY shared/package.json ./shared/
COPY apps/easy-service/package.json ./apps/easy-service/
COPY apps/easy-service-front/package.json ./apps/easy-service-front/
RUN pnpm install --frozen-lockfile --filter "easy-service..." --filter "@easy-service/shared..."
COPY shared ./shared
COPY apps/easy-service ./apps/easy-service
RUN pnpm --filter @easy-service/shared build \
  && pnpm --filter easy-service build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3001
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer
COPY --from=builder /app /app
WORKDIR /app/apps/easy-service
EXPOSE 3001
CMD ["node", "dist/main"]
