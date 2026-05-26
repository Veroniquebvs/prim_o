FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ── Development ──────────────────────────────────────────────
FROM base AS development
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# ── Production ───────────────────────────────────────────────
FROM base AS production
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
