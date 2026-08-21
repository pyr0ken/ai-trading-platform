import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import sentiment, clustering, backtest

app = FastAPI(
    title="AI Trading Platform Microservice",
    description="Python microservice for high-performance Quant and NLP analytics",
    version="1.0.0"
)

# CORS mapping, allowing Next.js dev server and Production domains to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production domains in deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include modules
app.include_router(sentiment.router, prefix="/api/v1")
app.include_router(clustering.router, prefix="/api/v1")
app.include_router(backtest.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "AI Trading Backend Python service is running!"}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-trading-python-backend"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
