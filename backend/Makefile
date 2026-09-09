.PHONY: run build clean test

# Run the development server
run:
	go run ./cmd/server/main.go

# Build production binary
build:
	go build -o bin/server ./cmd/server/main.go

# Remove built binary and database
clean:
	rm -rf bin/ data/

# Tidy module dependencies
tidy:
	go mod tidy

# Vet all packages
vet:
	go vet ./...
