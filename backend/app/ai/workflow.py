from typing import TypedDict, Optional, List, Dict, Any

from langgraph.graph import StateGraph, END

from app.ai import nodes


class ComplaintState(TypedDict, total=False):
    source_text: str
    existing_complaints: List[Dict[str, Any]]

    extracted_fields: Dict[str, Any]
    extraction_confidence: float
    fields_found: List[str]

    completeness: Dict[str, Any]
    risk_classification: Dict[str, Any]
    root_cause: List[Dict[str, Any]]
    capa: Dict[str, Any]
    duplicate_matches: List[Dict[str, Any]]
    summary: str


def build_graph():
    graph = StateGraph(ComplaintState)

    graph.add_node("extract", nodes.node_extract)
    graph.add_node("completeness_check", nodes.node_completeness)
    graph.add_node("risk_classifier", nodes.node_risk_classification)
    graph.add_node("root_cause_analysis", nodes.node_root_cause)
    graph.add_node("capa_recommendation", nodes.node_capa)
    graph.add_node("duplicate_detection", nodes.node_duplicate_detection)
    graph.add_node("summary_generator", nodes.node_summary)

    graph.set_entry_point("extract")
    graph.add_edge("extract", "completeness_check")

    # fan-out: independent AI enrichment steps all read the same extracted_fields
    graph.add_edge("completeness_check", "risk_classifier")
    graph.add_edge("completeness_check", "root_cause_analysis")
    graph.add_edge("completeness_check", "capa_recommendation")
    graph.add_edge("completeness_check", "duplicate_detection")

    # fan-in: summary waits on all four enrichment branches
    graph.add_edge("risk_classifier", "summary_generator")
    graph.add_edge("root_cause_analysis", "summary_generator")
    graph.add_edge("capa_recommendation", "summary_generator")
    graph.add_edge("duplicate_detection", "summary_generator")

    graph.add_edge("summary_generator", END)

    return graph.compile()


_compiled_graph = None


def get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
    return _compiled_graph


def run_intake_pipeline(source_text: str, existing_complaints: Optional[List[Dict[str, Any]]] = None) -> ComplaintState:
    graph = get_graph()
    initial_state: ComplaintState = {
        "source_text": source_text,
        "existing_complaints": existing_complaints or [],
    }
    final_state = graph.invoke(initial_state)
    return final_state
