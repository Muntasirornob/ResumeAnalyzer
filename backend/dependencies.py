from functools import lru_cache

from langchain_openai import ChatOpenAI

from config import settings


@lru_cache(maxsize=1)
def get_llm() -> ChatOpenAI:
    """Return a single shared LLM instance (FastAPI Depends-compatible)."""
    return ChatOpenAI(
        model_name=settings.OPENAI_API_MODEL,
        temperature=0,
        max_tokens=5000,
        openai_api_key=settings.OPENAI_API_KEY,
    )
