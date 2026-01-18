# Performance Optimization Guide

This document describes the performance optimizations implemented in the Crossy application.

## Overview

The application has been optimized to meet the following performance targets:

- **API Endpoints**: <200ms response time (p95)
- **WebSocket Latency**: <100ms message latency (p95)
- **Page Load**: <2s initial load time
- **Database Queries**: <50ms query time (p95)
- **Concurrent Users**: Support for 1000+ concurrent users

## Backend Optimizations

### 1. Database Connection Pooling

Location: `backend/internal/db/db.go`

Configured PostgreSQL connection pool for optimal performance:
- Max Open Connections: 25
- Max Idle Connections: 10
- Connection Max Lifetime: 5 minutes

```go
db.SetMaxOpenConns(25)
db.SetMaxIdleConns(10)
db.SetConnMaxLifetime(5 * time.Minute)
```

### 2. Performance Monitoring Middleware

Location: `backend/internal/middleware/middleware.go`

Implemented comprehensive performance tracking:
- Request latency measurement
- Per-endpoint metrics (count, avg, min, max, p95)
- Slow request logging (>200ms threshold)
- Response time headers (`X-Response-Time`)

Access metrics at: `GET /metrics`

### 3. Redis Caching

Location: `backend/internal/api/handlers.go`

Implemented caching for frequently accessed endpoints:
- Today's puzzle: 1-hour cache
- Puzzle by date: 24-hour cache
- Cache key pattern: `puzzle:today:{date}`, `puzzle:date:{date}`

### 4. Database Indexes

Location: `backend/internal/db/db.go`

Added performance-oriented indexes:
- `idx_puzzle_history_puzzle_id` - Puzzle completion lookups
- `idx_puzzle_history_completed_at` - Date range queries
- `idx_messages_created_at` - Message ordering
- `idx_rooms_host_id` - Host room lookups
- `idx_players_room_id` - Player room queries
- `idx_users_email` - User authentication

### 5. WebSocket Optimization

Location: `backend/internal/realtime/client.go`

Optimized WebSocket handling:
- Buffered send channels (256 messages)
- Message batching in WritePump
- Efficient ping/pong heartbeat (54s interval)
- Multi-tab connection tracking

## Frontend Optimizations

### 1. Next.js Production Optimizations

Location: `frontend/next.config.js`

Enabled production features:
- SWC minification
- Gzip compression
- Console log removal (production only)
- Image optimization (AVIF, WebP)
- Powered-by header removal

### 2. Code Splitting & Lazy Loading

Location: `frontend/src/app/room/[code]/page.tsx`

Dynamically loaded heavy components:
- `ChatSidebar` - Chat functionality
- `PlayerList` - Player roster
- `ResultsModal` - Game results
- `RaceLeaderboard` - Race mode UI
- `RelayTurnIndicator` - Relay mode UI

Benefits:
- Reduced initial bundle size
- Faster page load times
- SSR disabled for client-only components

### 3. PWA Optimization

Location: `frontend/next.config.js`

Progressive Web App features:
- Service Worker caching
- Offline support
- Fast page transitions
- Installable on mobile devices

## Load Testing

### Running Load Tests

Location: `backend/test/load_test.go`

Run the load test script:

```bash
cd backend/test
go run load_test.go
```

The script simulates:
- 1000 concurrent API users (ramped over 5 seconds)
- 100 concurrent WebSocket connections (ramped over 10 seconds)
- 30-second sustained load
- Various endpoint requests (puzzles, health, metrics)
- WebSocket cursor movements

### Metrics Reported

- **API Endpoints**:
  - Total requests
  - Success/failure rate
  - Average, min, max latency
  - Requests per second
  - P95 compliance check

- **WebSocket Connections**:
  - Total connections
  - Success/failure rate
  - Total messages sent
  - Average, min, max message latency
  - Messages per second
  - P95 compliance check

## Monitoring Performance

### Real-time Metrics

Access the metrics endpoint to view current performance:

```bash
curl http://localhost:8080/metrics
```

Response includes:
```json
{
  "total_requests": 1234,
  "avg_duration_ms": 45,
  "endpoints": {
    "/api/puzzles/today": {
      "count": 500,
      "avg_ms": 35,
      "min_ms": 12,
      "max_ms": 180,
      "p95_ms": 95
    },
    ...
  }
}
```

### Slow Request Logging

The performance middleware automatically logs slow requests:

```
[SLOW] GET /api/puzzles/random - 215ms (status: 200)
```

### Response Time Headers

Every API response includes timing information:

```
X-Response-Time: 45.2ms
```

## Performance Best Practices

### Backend

1. **Use Redis caching** for frequently accessed, static data
2. **Monitor slow queries** via middleware logs
3. **Review metrics endpoint** regularly for performance degradation
4. **Keep database indexes** updated as schema evolves
5. **Use connection pooling** for all database operations

### Frontend

1. **Lazy load heavy components** to reduce initial bundle
2. **Use dynamic imports** for route-specific code
3. **Enable PWA features** for offline support
4. **Optimize images** with Next.js Image component
5. **Monitor bundle size** with `npm run analyze`

### Database

1. **Add indexes** for frequently queried columns
2. **Use JSONB efficiently** for complex data structures
3. **Implement pagination** for large result sets
4. **Monitor query performance** with EXPLAIN ANALYZE
5. **Keep statistics updated** with ANALYZE command

## Acceptance Criteria Status

- ✅ API endpoints respond <200ms (p95)
- ✅ WebSocket latency <100ms (p95)
- ✅ Page load (initial) <2s
- ✅ Database queries <50ms (p95)
- ✅ Load testing completed (1000 concurrent users)
- ✅ Backend tests pass (go test ./...)
- ✅ Frontend typecheck passes
- ✅ Frontend lint passes

## Future Optimizations

Consider these additional optimizations:

1. **CDN Integration** - Serve static assets from CDN
2. **Query Result Caching** - Cache expensive database queries
3. **WebSocket Connection Pooling** - Share connections across users
4. **Database Read Replicas** - Separate read/write operations
5. **Horizontal Scaling** - Load balance across multiple instances
6. **Background Job Processing** - Queue heavy operations
7. **API Rate Limiting** - Protect against abuse
8. **Database Query Optimization** - Profile and optimize slow queries
