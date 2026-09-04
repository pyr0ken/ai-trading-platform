# 🤖 AI Agent — Part 1: ReAct Engine & Dynamic Tool Registry

> **Module:** `backend/app/features/ai_agent/engine/`  
> **Design Paradigm:** Pure Python Async ReAct Loop (No LangChain/LangGraph), OpenAI-Wire Tool Calling, Granular SSE Emitter.

---

## 1. Architectural Overview

The AI Quant Agent executes an asynchronous Reason+Act (ReAct) loop. When a user sends a message, the engine parses context, invokes relevant quantitative tools, formats intermediate execution signals, and returns final responses with real-time SSE streaming.

```
┌─────────────────────────────────────────────────────────────┐
│                 🔄 ReAct Conversation Loop                  │
├─────────────────────────────────────────────────────────────┤
│ 1. Ingest Prompt + Session Messages + Injected Chart Context │
│ 2. Call LLM (OpenAI-compatible wire with Tools Schema)      │
│ 3. If Model requests tool_calls:                            │
│    ├── Emit `tool_start` event (status: running)            │
│    ├── Execute local Python function via Tool Registry      │
│    ├── Bounded string truncation (prevent context blowup)   │
│    ├── Emit `tool_result` event                             │
│    └── Re-enter loop with tool output appended to context   │
│ 4. If Model streams text/reasoning:                         │
│    ├── Emit `thinking_delta` (for DeepSeek R1 / Claude)     │
│    └── Emit `text_delta` tokens                             │
│ 5. Yield final artifact (trade card, chart overlay command) │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. File Specifications & Contracts

### A. `backend/app/features/ai_agent/engine/tool_registry.py`
Provides the central `@register_tool` decorator. Automatically inspects Python type hints and docstrings to generate valid JSON Schemas for OpenAI tool-calling.

```python
from typing import Callable, Dict, Any
import inspect

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Callable] = {}
        self._schemas: list[Dict[str, Any]] = []

    def register(self, name: str | None = None, description: str | None = None):
        def decorator(func: Callable):
            tool_name = name or func.__name__
            self._tools[tool_name] = func
            schema = self._generate_schema(func, tool_name, description)
            self._schemas.append(schema)
            return func
        return decorator

    def _generate_schema(self, func: Callable, name: str, desc: str | None) -> Dict[str, Any]:
        # Inspect signatures, docstrings, type annotations, return standard OpenAI tool schema
        ...
```

### B. `backend/app/features/ai_agent/engine/conversation_loop.py`
Drives the async conversation loop, handling retries, timeouts, and SSE generation:

```python
class AgentConversationLoop:
    async def run_stream(self, session_id: str, user_message: str, chart_context: dict | None = None):
        # 1. Fetch Session & Prompt Context
        # 2. ReAct loop with max 10 steps
        # 3. Stream SSE events to caller
        ...
```

---

## 3. SSE Event Stream Specifications

The streaming endpoint yields SSE events conforming to the following JSON payloads:

1. **Thinking Token:** `data: {"type": "thinking_delta", "content": "..."}`
2. **Text Token:** `data: {"type": "text_delta", "content": "..."}`
3. **Tool Invocations:**
   - Start: `data: {"type": "tool_start", "tool": "compute_quant_metrics", "args": {"symbol": "BTC/USDT"}}`
   - Complete: `data: {"type": "tool_result", "tool": "compute_quant_metrics", "summary": "RSI: 34.2 (Oversold), Support: $63,400"}`
4. **Chart Drawing Action:** `data: {"type": "chart_overlay", "overlays": [...]}`
5. **Trade Setup Card:** `data: {"type": "trade_card", "setup": {...}}`
6. **Done:** `data: {"type": "done", "session_id": "..."}`
