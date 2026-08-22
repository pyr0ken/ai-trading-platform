# 📈 AI Trading Platform

An institutional-grade, microservices-driven **AI-powered Quantitative Trading Platform** engineered with a high-performance **Python FastAPI Backend** and a modern, decoupled **Next.js Frontend**.

## 🛠️ Architecture & Directory Layout

Built using the **Feature-Folder Structure (FFS)**:

- `frontend/` - Next.js 15+ & React 19 Frontend Dashboard
- `backend/` - FastAPI Python Backend Service for calculations and LLM streaming

## 🐳 Running the Platform

1. Copy env files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. Run with Docker Compose:
   ```bash
   docker compose up --build
   ```
