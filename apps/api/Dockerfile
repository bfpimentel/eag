FROM oven/bun:alpine
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/providers/package.json packages/providers/package.json
COPY apps/api/package.json apps/api/package.json
RUN bun install --frozen-lockfile --production
COPY packages packages
COPY apps/api apps/api
EXPOSE 6123
CMD ["bun", "run", "api"]
