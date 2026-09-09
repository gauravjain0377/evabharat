# ── Stage 1: Build React Frontend ──────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Build Go Backend ──────────────────────────────────────────────
FROM golang:1.23-alpine AS backend-builder
WORKDIR /app/backend

# Install git/certs if needed
RUN apk add --no-cache git ca-certificates

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server ./cmd/server/main.go

# ── Stage 3: Minimal Production Image ──────────────────────────────────────
FROM alpine:3.20 AS runner
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata && \
    mkdir -p /app/data

# Copy binary from backend builder
COPY --from=backend-builder /app/server /app/server

# Copy built frontend assets from frontend builder
COPY --from=frontend-builder /app/frontend/dist /app/public

ENV PORT=8080 \
    DATABASE_PATH=/app/data/media.db \
    STATIC_DIR=/app/public

EXPOSE 8080

VOLUME ["/app/data"]

CMD ["/app/server"]
