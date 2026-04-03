import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.attack_intelligence import (
    classify_exploitability,
    build_risk_ranking,
    generate_attack_graph,
    simulate_breach,
    build_attack_intelligence,
    sanitize_chat_input,
)


def test_classify_exploitability_high_case():
    vuln = {
        "severity": "High",
        "issue": "SQL Injection in public API",
        "explanation": "Public endpoint runs dynamic SQL",
    }
    result = classify_exploitability(vuln)
    assert result["level"] in ["High", "Medium"]
    assert "score" in result


def test_build_risk_ranking_sorted_descending():
    vulns = [
        {"severity": "Low", "issue": "Minor banner leak", "explanation": "Version in header"},
        {"severity": "High", "issue": "IAM wildcard policy", "explanation": "Over-broad policy"},
    ]
    ranking = build_risk_ranking(vulns)
    assert len(ranking) == 2
    assert ranking[0]["priority_score"] >= ranking[1]["priority_score"]


def test_generate_attack_graph_has_nodes_and_edges():
    ranking = [
        {
            "issue": "Weak Auth",
            "severity": "High",
            "priority_score": 9.1,
            "exploitability": {"exploitable": True},
        },
        {
            "issue": "IAM wildcard policy",
            "severity": "High",
            "priority_score": 8.8,
            "exploitability": {"exploitable": True},
        },
    ]
    graph = generate_attack_graph(ranking)
    assert len(graph["nodes"]) >= 2
    assert len(graph["edges"]) >= 1


def test_simulate_breach_returns_data_points():
    ranking = [
        {
            "issue": "SQL Injection",
            "severity": "High",
            "priority_score": 9.4,
            "exploitability": {"exploitable": True},
        }
    ]
    graph = generate_attack_graph(ranking)
    simulation = simulate_breach(ranking, graph)
    assert "accessible_data" in simulation
    assert len(simulation["accessible_data"]) >= 1


def test_simulate_breach_handles_empty_attack_paths():
    ranking = [
        {
            "issue": "Potential SQL Injection",
            "severity": "High",
            "priority_score": 8.9,
            "exploitability": {"exploitable": True},
        }
    ]
    simulation = simulate_breach(ranking, {"attack_paths": []})
    assert simulation["chain_summary"] == "No viable multi-step chain found"
    assert isinstance(simulation["accessible_data"], list)


def test_build_attack_intelligence_shape():
    vulns = [
        {
            "severity": "High",
            "issue": "Hardcoded token",
            "explanation": "Token in source",
            "poc_exploit_scenario": "Attacker pulls token from git history",
        }
    ]
    result = build_attack_intelligence(vulns)
    assert "risk_ranking" in result
    assert "attack_graph" in result
    assert "breach_simulation" in result


def test_sanitize_chat_input_removes_script_block():
    raw = """Hello<script>alert(1)</script>```ignore me```"""
    cleaned = sanitize_chat_input(raw)
    assert "script" not in cleaned.lower()
