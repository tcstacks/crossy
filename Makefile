.PHONY: all dev backend frontend install install-backend install-frontend clean stop help db-up db-down

# Default target
all: dev

# Run both backend and frontend concurrently
dev:
	@echo "Starting CrossPlay development servers..."
	@make -j2 backend frontend

# Run backend server
backend:
	@echo "Starting Go backend on http://localhost:8080..."
	@cd backend && go run cmd/server/main.go

# Run frontend server
frontend:
	@echo "Starting Vite frontend on http://localhost:5173..."
	@cd frontend && npm run dev

# Install all dependencies
install: install-backend install-frontend
	@echo "All dependencies installed!"

# Install backend dependencies
install-backend:
	@echo "Installing Go dependencies..."
	@cd backend && go mod download

# Install frontend dependencies
install-frontend:
	@echo "Installing Node.js dependencies..."
	@cd frontend && npm install

# Build frontend for production
build-frontend:
	@echo "Building frontend for production..."
	@cd frontend && npm run build

# Build backend binary
build-backend:
	@echo "Building backend binary..."
	@cd backend && go build -o bin/server cmd/server/main.go

# Build admin CLI
build-admin:
	@echo "Building admin CLI..."
	@cd backend && go build -o bin/admin cmd/admin/main.go

# Build both server and admin
build: build-backend build-admin build-frontend

# Run production backend
run-backend:
	@cd backend && ./bin/server

# Run admin CLI (pass ARGS for commands, e.g., make admin ARGS="generate -size mini")
admin:
	@cd backend && go run cmd/admin/main.go $(ARGS)

# Setup environment files
setup:
	@echo "Setting up environment files..."
	@test -f backend/.env || cp backend/.env.example backend/.env
	@test -f frontend/.env.local || cp frontend/.env.example frontend/.env.local
	@echo "Environment files created. Please update them with your configuration."

# Start Docker services (PostgreSQL + Redis)
db-up:
	@echo "Starting PostgreSQL and Redis..."
	@docker-compose up -d postgres redis 2>/dev/null || \
		(docker run -d --name crossplay-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=crossplay postgres:14 && \
		 docker run -d --name crossplay-redis -p 6379:6379 redis:6)
	@echo "Database services started!"

# Stop Docker services
db-down:
	@echo "Stopping database services..."
	@docker-compose down 2>/dev/null || \
		(docker stop crossplay-postgres crossplay-redis 2>/dev/null; \
		 docker rm crossplay-postgres crossplay-redis 2>/dev/null)
	@echo "Database services stopped!"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf backend/bin
	@rm -rf frontend/dist
	@rm -rf frontend/node_modules/.cache
	@echo "Cleaned!"

# Stop all running servers (finds and kills processes on ports 5173 and 8080)
stop:
	@echo "Stopping development servers..."
	@-lsof -ti:5173 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:8080 | xargs kill -9 2>/dev/null || true
	@echo "Servers stopped!"

# Lint and format
lint:
	@echo "Linting..."
	@cd frontend && npm run lint
	@cd backend && go fmt ./...

# Help
help:
	@echo "CrossPlay Development Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Development:"
	@echo "  dev              Run both backend and frontend (default)"
	@echo "  backend          Run only the Go backend"
	@echo "  frontend         Run only the Vite frontend"
	@echo "  stop             Stop all running dev servers"
	@echo ""
	@echo "Setup:"
	@echo "  install          Install all dependencies"
	@echo "  install-backend  Install Go dependencies"
	@echo "  install-frontend Install Node.js dependencies"
	@echo "  setup            Create .env files from examples"
	@echo ""
	@echo "Database:"
	@echo "  db-up            Start PostgreSQL and Redis containers"
	@echo "  db-down          Stop database containers"
	@echo ""
	@echo "Build:"
	@echo "  build            Build server, admin CLI, and frontend"
	@echo "  build-backend    Build Go server binary"
	@echo "  build-admin      Build admin CLI binary"
	@echo "  build-frontend   Build Vite app for production"
	@echo ""
	@echo "Admin CLI (Puzzle Management):"
	@echo "  admin ARGS=\"...\" Run admin CLI with arguments"
	@echo ""
	@echo "  Examples:"
	@echo "    make admin ARGS=\"help\""
	@echo "    make admin ARGS=\"generate -size mini -difficulty monday\""
	@echo "    make admin ARGS=\"batch -size daily -count 5\""
	@echo "    make admin ARGS=\"week -start 2024-01-01 -save\""
	@echo "    make admin ARGS=\"quality -file puzzle.json\""
	@echo "    make admin ARGS=\"list -status draft\""
	@echo ""
	@echo "Utility:"
	@echo "  clean            Remove build artifacts"
	@echo "  lint             Run linters"
	@echo "  help             Show this help message"
