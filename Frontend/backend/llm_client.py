import json

from groq import AsyncGroq
from groq import RateLimitError as GroqRateLimitError
from pydantic import ValidationError

from config import TEMPERATURE
from key_pool import GROQ_API_KEYS

_groq_clients = None


def _get_groq_clients():
    global _groq_clients
    if _groq_clients is None:
        _groq_clients = [AsyncGroq(api_key=k) for k in GROQ_API_KEYS]
    return _groq_clients


async def _complete(client, model, system_prompt):
    response = await client.chat.completions.create(
        model=model,
        # Some models (e.g. groq/compound) require the last message to be
        # role "user", so the whole prompt is sent as a user message rather
        # than "system".
        messages=[{"role": "user", "content": system_prompt}],
        response_format={"type": "json_object"},
        temperature=TEMPERATURE,
    )
    return response.choices[0].message.content


def _parse(content, schema):
    parsed = json.loads(content)
    return schema(**parsed) if schema is not None else parsed


async def call_json(system_prompt, task_label, model, schema=None):
    last_error, last_content = None, None

    for client in _get_groq_clients():
        for _ in range(2):  # retry once on malformed/invalid output, per key
            try:
                content = await _complete(client, model, system_prompt)
            except GroqRateLimitError as e:
                last_error = e
                break  # this key is rate-limited, fall back to the next one
            try:
                return _parse(content, schema)
            except (json.JSONDecodeError, ValidationError) as e:
                last_error, last_content = e, content

    raise ValueError(
        f"{task_label}: exhausted all Groq keys without a valid response "
        f"(last error: {last_error}):\n{last_content}"
    )
