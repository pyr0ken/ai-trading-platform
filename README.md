# 📈 AI Trading Platform

An institutional-grade, microservices-driven **AI-powered Quantitative Trading Platform** engineered with a high-performance **Python FastAPI Backend** and a modern, decoupled **Next.js Frontend**.

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python Version" />
  <img src="https://img.shields.io/badge/FastAPI-Framework-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI Framework" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js Version" />
  <img src="https://img.shields.io/badge/React-19-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React Version" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS Version" />
  <img src="https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase Backend" />
  <img src="https://img.shields.io/badge/Docker-Container-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker Container" />
</p>

---

## 🧱 Architecture Diagram

Below is the high-level system architecture of the platform, showing exchange connectivity, the background quant engines, the sentiment indexer, and the Next.js/FastAPI components.

<p align="center">
  <img src="docs/images/architecture-diagram.png" width="800" alt="System Architecture Diagram" />
</p>

---

## 🛠️ Architecture & Directory Layout

Built using the **Feature-Folder Structure (FFS)**:

- `frontend/` - Next.js 16+ & React 19 Frontend Dashboard
- `backend/` - FastAPI Python Backend Service for calculations and LLM streaming
- `docs/` - System architecture blueprints and specifications

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
