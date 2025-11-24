FROM node:20-slim AS base

ENV BUN_INSTALL=/usr/local/bun \
	PATH="/usr/local/bun/bin:${PATH}" \
	HUSKY=0

RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl ca-certificates unzip \
	&& rm -rf /var/lib/apt/lists/* \
	&& curl -fsSL https://bun.sh/install | bash

WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production \
	PORT=3000 \
	HOST=0.0.0.0 \
	HUSKY=0
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=builder /app/.next ./.next
COPY public ./public
COPY next.config.ts next-env.d.ts ./ 
EXPOSE 3000
CMD ["npm", "run", "start"]

