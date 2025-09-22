# Docker Setup for HOI4 Translate App

This document explains how to run the HOI4 Translation App using Docker and Docker Compose.

## Architecture

The application consists of the following services:

- **web-app** (Port 3000): Next.js frontend and API
- **translator-service** (Port 3004): Microsoft Translator API service
- **websocket-service** (Port 3001): WebSocket server for real-time translation
- **variable-separator** (Port 3003): Variable processing service (optional)
- **db** (Port 5432): PostgreSQL database
- **redis** (Port 6379): Redis for queue management

## Prerequisites

1. **Docker & Docker Compose**: Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. **Microsoft Translator API**: Get credentials from [Azure Portal](https://portal.azure.com/)

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your actual values
nano .env
```

Required environment variables:
- `MICROSOFT_TRANSLATOR_KEY`: Your Azure Translator subscription key
- `MICROSOFT_TRANSLATOR_REGION`: Your Azure region (e.g., `eastus`)
- `JWT_SECRET`: Random string for JWT signing
- `DATABASE_URL`: Will be set automatically for Docker

### 2. Production Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 3. Development Mode

```bash
# Start with development overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or start specific services
docker-compose up db redis translator-service
```

## Service Management

### Individual Services

```bash
# Start only core services (db, redis)
docker-compose up db redis

# Start translation services
docker-compose up translator-service websocket-service

# Start web app
docker-compose up web-app
```

### Scaling Services

```bash
# Scale translator service for high load
docker-compose up --scale translator-service=3

# Scale websocket service
docker-compose up --scale websocket-service=2
```

## Database Management

### Initial Setup

```bash
# Run database migrations
docker-compose exec web-app npx prisma migrate deploy

# Generate Prisma client (if needed)
docker-compose exec web-app npx prisma generate
```

### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec db psql -U user -d translator

# Run Prisma Studio
docker-compose exec web-app npx prisma studio
```

## Monitoring & Debugging

### Health Checks

```bash
# Check service health
docker-compose ps

# Test translator service
curl http://localhost:3004/health

# Test web app
curl http://localhost:3000/api/health
```

### Logs

```bash
# View all logs
docker-compose logs

# Follow specific service logs
docker-compose logs -f translator-service

# View last 100 lines
docker-compose logs --tail=100 websocket-service
```

### Debugging

```bash
# Execute commands in running containers
docker-compose exec web-app bash
docker-compose exec translator-service sh

# Inspect container
docker inspect hoi4-translate-app_web-app_1
```

## Development Workflow

### Local Development

1. **Start infrastructure**:
   ```bash
   docker-compose up db redis
   ```

2. **Run services locally**:
   ```bash
   # Terminal 1: Translator service
   cd services/deepl-service
   npm run dev

   # Terminal 2: WebSocket service  
   cd services/websocket-service
   npm run dev

   # Terminal 3: Web app
   npm run dev
   ```

### Hot Reload Development

```bash
# Start with development overrides (includes hot reload)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Production Considerations

### Security

1. **Change default passwords**:
   - Update PostgreSQL credentials in docker-compose.yml
   - Set strong JWT_SECRET and NEXTAUTH_SECRET

2. **Use secrets management**:
   ```bash
   # Use Docker secrets for sensitive data
   echo "your-api-key" | docker secret create translator_key -
   ```

### Performance

1. **Resource limits**:
   ```yaml
   # Add to docker-compose.yml
   deploy:
     resources:
       limits:
         memory: 512M
         cpus: '0.5'
   ```

2. **Persistent volumes**:
   ```bash
   # Backup database
   docker-compose exec db pg_dump -U user translator > backup.sql
   ```

### Monitoring

1. **Add monitoring stack**:
   ```bash
   # Add Prometheus, Grafana, etc.
   docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up
   ```

## Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   # Check what's using ports
   lsof -i :3000
   lsof -i :5432
   ```

2. **Database connection issues**:
   ```bash
   # Reset database
   docker-compose down -v
   docker-compose up db
   ```

3. **Build failures**:
   ```bash
   # Clean build
   docker-compose build --no-cache
   docker system prune -a
   ```

### Service Dependencies

If services fail to start, check the dependency order:
1. `db` and `redis` (infrastructure)
2. `translator-service` (core service)
3. `websocket-service` (depends on translator + redis)
4. `web-app` (depends on db)

## File Structure

```
├── docker-compose.yml          # Main compose file
├── docker-compose.dev.yml      # Development overrides
├── dockerfiles/                # All Dockerfiles
│   ├── web-app.Dockerfile
│   ├── translator-service.Dockerfile
│   ├── websocket-service.Dockerfile
│   └── variable-separator.Dockerfile
├── .dockerignore              # Docker ignore rules
└── DOCKER.md                  # This file
```

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-generated | Yes |
| `MICROSOFT_TRANSLATOR_KEY` | Azure Translator API key | - | Yes |
| `MICROSOFT_TRANSLATOR_REGION` | Azure region | - | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `NEXTAUTH_SECRET` | NextAuth secret | - | Yes |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` | No |
| `NODE_ENV` | Environment mode | `production` | No |

For more details, see the individual service documentation in their respective directories.
