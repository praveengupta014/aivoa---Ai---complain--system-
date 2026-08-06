import json
import logging

from groq import Groq

from app.config import settings

logger = logging.getLogger(__name__)

_client: Groq | None = None


def get_groq_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.groq_api_key)
    return _client


def call_groq_json(system_prompt: str, user_prompt: str, model: str, temperature: float = 0.1) -> dict:
    """
    Calls Groq chat completions and forces a JSON object response.
    gemma2-9b-it is used for fast structured extraction;
    llama-3.3-70b-versatile is used for reasoning-heavy nodes (root cause, CAPA, risk).
    """
    client = get_groq_client()
    completion = client.chat.completions.create(
        model=model,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    raw = completion.choices[0].message.content
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Groq returned non-JSON, attempting to salvage: %s", raw[:500])
        # crude salvage: grab the first {...} block
        start, end = raw.find("{"), raw.rfind("}")
        if start != -1 and end != -1:
            return json.loads(raw[start : end + 1])
        raise


def call_groq_text(system_prompt: str, user_prompt: str, model: str, temperature: float = 0.3) -> str:
    client = get_groq_client()
    completion = client.chat.completions.create(
        model=model,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    return completion.choices[0].message.content
