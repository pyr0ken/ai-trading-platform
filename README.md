# 📈 AI Trading Platform

An institutional-grade, microservices-driven **AI-powered Quantitative Trading Platform** engineered with a high-performance **Python FastAPI Backend** for quant algorithms, ML models, and sentiment engines, paired with a modern, decoupled **Next.js Frontend** for rendering real-time dashboards and lightweight TradingView charts.

---

## 🏛️ Microservices Architecture & Topology

This project is built from the ground up as a **decoupled microservice architecture**. By separating the heavy mathematical calculations and data pipelines from the presentation layer, the platform guarantees sub-second responsiveness and modular scaling.

![AI Trading Platform Microservices Topology](./docs/images/architecture-diagram.png)

### Key Architectural Benefits
- **Separation of Concerns:** Next.js handles pure client UI routing, rendering, and visual state management, while Python FastAPI is dedicated to execution-heavy trading analytics.
- **Independent Scalability:** The Python backend can be scaled independently, placed on GPU-equipped instances, or containerized separately from the Node.js frontend layer.
- **Asymmetric Data Flow:** High-throughput streaming data from the market and AI engines flows via Server-Sent Events (SSE) from the FastAPI microservice directly to the client interface.

---

## 🛠️ Tech Stack Matrix

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Gateway** | Next.js 15+ (App Router) + React 19 | Server-Side Rendering (SSR), UI streaming, state synchronization |
| **UI Components & Styles** | Tailwind CSS v4 + Lucide React | High-density trading dashboard, Obsidian & Copper layout |
| **Data Visualization** | TradingView Lightweight Charts + Recharts | Real-time interactive cryptocurrency and equity curves |
| **Backend Microservice** | Python 3.12 + FastAPI + Uvicorn | Quantitative execution runtime, analytics endpoints |
| **Quant Engines** | Pandas + NumPy + Scikit-Learn | Vectorized multi-symbol backtesting & DBSCAN clustering |
| **Sentiment Analytics** | VADER Sentiment Analyzer (Crypto-Lexicon) | Financial NLP news processing & social media scoring |
| **Database & Context** | Supabase (PostgreSQL) | Multi-tenant team storage & live state persistence |
| **Market Connectivity** | CCXT (Crypto Currency eXchange Trading) | Standardized data fetching across global exchanges |
| **Containerization** | Docker & Docker Compose | Multi-container orchestration & isolated runtimes |

---

## 🐳 Containerized Development & Setup

Both the Python backend microservice and Next.js frontend are containerized using Docker, allowing you to run the entire stack with a single command without worrying about local environment drift.

### Prerequisites
- Docker (v24.0.0+)
- Docker Compose (v2.20.0+)

### Running the Monorepo

1. **Configure Environment Variables**
   Make sure you have your API keys and endpoints configured in `.env.local` or `.env` in the root:
   ```bash
   LLM_API_KEY=your_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   ```

2. **Spin Up the Containers**
   Launch both microservices concurrently:
   ```bash
   docker compose up --build
   ```

3. **In-Browser Access**
   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:8000](http://localhost:8000)
   - **Backend OpenAPI interactive docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
