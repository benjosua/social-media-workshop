# Production Docker image serving slides + live socket backend on a single port
FROM node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml tsconfig.json ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml tsconfig.json ./
RUN pnpm install --prod --frozen-lockfile && pnpm add -D tsx typescript @types/node @types/express @types/qrcode

COPY --from=builder /app/dist /app/dist
COPY server.ts ./
COPY public ./public

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["pnpm", "run", "server"]
