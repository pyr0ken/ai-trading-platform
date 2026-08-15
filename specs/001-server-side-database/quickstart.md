# Quickstart Validation Guide: Server-Side Database Storage

## Prerequisites
- Node.js 20+
- SQLite driver installed (`npm install better-sqlite3` and `@types/better-sqlite3`)

## Verification Steps

### 1. Database Initialization
Run the app dev server:
```bash
npm run dev
```
Verify that `data/trading.db` file is created automatically on launch.

### 2. API Endpoint Testing
Execute curl commands or test via Next.js API:

- **Create Analysis Record**:
  ```bash
  curl -X POST http://localhost:3000/api/db/analyses \
    -H "Content-Type: application/json" \
    -d '{"id":"test-1","symbol":"BTC/USDT","exchange":"kucoin","timeframe":"1h","price":64200,"signal":"BUY","confidence":85,"risk_level":"MEDIUM","markdown_report":"Test Report"}'
  ```

- **Fetch Historical Analyses**:
  ```bash
  curl http://localhost:3000/api/db/analyses?symbol=BTC/USDT
  ```

### 3. Automated Test Suite
Run vitest suite to verify database operations:
```bash
npm run test
```
