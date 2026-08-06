"""
Individual LangGraph node implementations. Each node reads/writes to the
shared graph state (a plain dict, see workflow.py: ComplaintState).

Pipeline shape:

  extract  --> completeness_check --+
                                     |--> risk_classification --+
                                     |--> root_cause            |--> summary --> END
                                     |--> capa_recommendation   |
                                     |--> duplicate_detection ---+

extract runs on gemma2-9b-it (fast/cheap - structured extraction).
Everything downstream runs on llama-3.3-70b-versatile (better reasoning).
"""

from app.ai.groq_client import call_groq_json
from app.ai import prompts
from app.config import settings


def node_extract(state: dict) -> dict:
    data = call_groq_json(
        system_prompt=prompts.EXTRACTION_SYSTEM_PROMPT,
        user_prompt=f"COMPLAINT SOURCE TEXT:\n\n{state['source_text']}",
        model=settings.groq_extraction_model,
        temperature=0.0,
    )
    fields_found = data.pop("fields_found", [])
    confidence = data.pop("confidence", 0.5)
    return {
        "extracted_fields": data,
        "extraction_confidence": confidence,
        "fields_found": fields_found,
    }


def node_completeness(state: dict) -> dict:
    result = call_groq_json(
        system_prompt=prompts.COMPLETENESS_SYSTEM_PROMPT,
        user_prompt=f"EXTRACTED FIELDS:\n{state['extracted_fields']}",
        model=settings.groq_reasoning_model,
    )
    return {"completeness": result}


def node_risk_classification(state: dict) -> dict:
    result = call_groq_json(
        system_prompt=prompts.RISK_SYSTEM_PROMPT,
        user_prompt=f"COMPLAINT FIELDS:\n{state['extracted_fields']}",
        model=settings.groq_reasoning_model,
    )
    return {"risk_classification": result}


def node_root_cause(state: dict) -> dict:
    result = call_groq_json(
        system_prompt=prompts.ROOT_CAUSE_SYSTEM_PROMPT,
        user_prompt=f"COMPLAINT FIELDS:\n{state['extracted_fields']}",
        model=settings.groq_reasoning_model,
    )
    return {"root_cause": result.get("root_cause_hypotheses", [])}


def node_capa(state: dict) -> dict:
    result = call_groq_json(
        system_prompt=prompts.CAPA_SYSTEM_PROMPT,
        user_prompt=f"COMPLAINT FIELDS:\n{state['extracted_fields']}",
        model=settings.groq_reasoning_model,
    )
    return {"capa": result}


def node_duplicate_detection(state: dict) -> dict:
    existing = state.get("existing_complaints", [])
    if not existing:
        return {"duplicate_matches": []}
    result = call_groq_json(
        system_prompt=prompts.DUPLICATE_SYSTEM_PROMPT,
        user_prompt=(
            f"NEW COMPLAINT:\n{state['extracted_fields']}\n\n"
            f"EXISTING COMPLAINTS (id, product, batch, type, description):\n{existing}"
        ),
        model=settings.groq_reasoning_model,
    )
    return {"duplicate_matches": result.get("duplicate_matches", [])}


def node_summary(state: dict) -> dict:
    context = {
        "fields": state.get("extracted_fields"),
        "risk": state.get("risk_classification"),
        "completeness": state.get("completeness"),
    }
    result = call_groq_json(
        system_prompt=prompts.SUMMARY_SYSTEM_PROMPT,
        user_prompt=f"CONTEXT:\n{context}",
        model=settings.groq_reasoning_model,
    )
    return {"summary": result.get("summary", "")}
