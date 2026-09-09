.PHONY: dev-backend dev-frontend build-frontend build-backend build-all docker-build docker-up docker-down clean

# Run backend locally
dev-backend:
	cd backend && go run ./cmd/server/main.go

# Run frontend locally with Vite dev server
dev-frontend:
	cd frontend && npm run dev

# Build frontend production assets
build-frontend:
	cd frontend && npm run build

# Build Go backend binary
build-backend:
	cd backend && go build -o bin/server ./cmd/server/main.go

# Build both frontend and backend
build-all: build-frontend build-backend

# Build multi-stage Docker container
docker-build:
	docker build -t mediasync .

# Run container with docker compose
docker-up:
	docker compose up -d

# Stop docker compose
docker-down:
	docker compose down

# Clean build artifacts
clean:
	rm -rf backend/bin frontend/dist
