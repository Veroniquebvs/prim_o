FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ── Development ──────────────────────────────────────────────
FROM base AS development
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]

# ── Build ────────────────────────────────────────────────────
FROM base AS builder
RUN npm install
COPY . .
RUN npm run build

# ── Production (nginx) ───────────────────────────────────────
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
