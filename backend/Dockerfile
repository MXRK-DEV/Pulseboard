
FROM node:20-alpine AS builder
WORKDIR /app


RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma


RUN npm ci


RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build


FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production


RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma


COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]