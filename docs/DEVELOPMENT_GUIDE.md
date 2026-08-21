# AI Trading Platform — Development & Setup Guide

This guide covers local environment setup, running both the Next.js Frontend and the FastAPI Python Backend, running tests, and troubleshooting.

---

## 📋 Prerequisites

* **Node.js**: `v20.x` or higher
* **Python**: `v3.10` or higher
* **uv**: Fast Python package installer & resolver (`uv 0.10+`)
* **Git**: Installed and configured

---

## 🚀 Quick Start Guide (Monorepo Run)

By structuring the project with a root Package Manager, you can bootstrap and run BOTH services with a single command from the root folder!

### 1. Zero-Config Installation

```bash
# Navigate to workspace root
cd /home/omid/Code/fun/ai-trading-platform

# Install root manager packages
npm install

# In separate steps or automatic workspace installs:
npm install --prefix frontend

# Re-create and link Python microservice
cd backend && uv venv .venv && source .venv/bin/activate && uv pip install -e . && cd ..
```

---

### 2. Simultaneous Launch (Frontend + Backend)

Start both Next.js Frontend (`localhost:3000`) and FastAPI Backend (`localhost:8000`) concurrently:

```bash
npm run dev
```

*Prefix labels `[next]` and `[fastapi]` will color-code the console log stream in real time.*

---

### 3. Isolated Manual Launch

If you prefer to run the services in separate terminal windows:

#### Next.js Frontend
```bash
npm run dev:frontend
# Or: cd frontend && npm run dev
```

#### FastAPI Backend
```bash
npm run dev:backend
# Or: cd backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 🧪 Running Tests

### Integration & Unit Tests
```bash
# Run all Vitest suites inside frontend/
npm run test

# Run python integration tests specifically
npx vitest run frontend/tests/python-backend-client.test.ts
```

### Code Verification & Linting
```bash
npm run lint:frontend
npm run build:frontend
```

---

## ⚙️ Environment Variables (`frontend/.env.local`)

| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| `LLM_BASE_URL` | `http://127.0.0.1:20128/v1` | URL for the local LLM server (9router / Hermes) |
| `LLM_MODEL` | `hermes` | Default LLM model identifier |
| `PYTHON_BACKEND_URL` | `http://127.0.0.1:8000` | URL for the Python FastAPI microservice |
| `NEXT_PUBLIC_SUPABASE_URL` | `""` | Supabase endpoint URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `""` | Supabase public API key |
