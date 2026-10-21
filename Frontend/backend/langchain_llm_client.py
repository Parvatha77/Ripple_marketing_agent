"""
LangChain-based Groq client for the Persona and Competitor agents, with
multi-key fallback: all Groq keys are tried in turn, so a rate-limited call
moves to the next key instead of failing the whole run.
"""
import itertools

from groq import RateLimitError as GroqRateLimitError
from langchain_groq import ChatGroq

from config import GROQ_MAX_TOKENS, GROQ_MODEL_SMALL, TEMPERATURE
from key_pool import GROQ_API_KEYS


def _build_groq_llm(api_key: str) -> ChatGroq:
    return ChatGroq(
        api_key=api_key,
        model_name=GROQ_MODEL_SMALL,
        temperature=TEMPERATURE,
        max_tokens=GROQ_MAX_TOKENS,
        # gpt-oss reasoning models spend tokens on internal chain-of-thought before the
        # answer; "low" keeps that budget small so the JSON response isn't truncated.
        # NOTE: this value is specific to GROQ_MODEL_SMALL's accepted vocabulary
        # (openai/gpt-oss-* models use low/medium/high; other model families use
        # different values like none/default) — revisit if the model changes.
        reasoning_effort="low",
    )


_groq_pool = [_build_groq_llm(key) for key in GROQ_API_KEYS]

# Kept for backward compatibility with any caller that doesn't need fallback.
llm = _groq_pool[0]

# Round-robins the *starting* key across calls, so the many concurrent calls
# fired via asyncio.gather (18 persona calls, competitors, ...) spread their
# token usage across all configured keys instead of every call piling onto
# key[0] first and only reactively falling back on failure.
_start_index = itertools.cycle(range(len(_groq_pool)))


async def ainvoke_with_fallback(messages):
    """Try Groq keys starting from a rotating index, wrapping around — only
    moves to the next key on rate limits."""
    start = next(_start_index)
    ordered_clients = _groq_pool[start:] + _groq_pool[:start]

    last_error = None
    for client in ordered_clients:
        try:
            return await client.ainvoke(messages)
        except GroqRateLimitError as e:
            last_error = e

    raise last_error
