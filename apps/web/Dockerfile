FROM oven/bun:alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/providers/package.json packages/providers/package.json
COPY apps/api/package.json apps/api/package.json
RUN bun install --frozen-lockfile
COPY apps/web apps/web
COPY packages packages
RUN bun run build
FROM nginx:alpine
ENV SERVER_ADDRESS=http://eag-api:6123
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 6124
CMD ["nginx", "-g", "daemon off;"]
