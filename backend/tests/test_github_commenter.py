"""
Unit tests for backend/src/github_commenter.py

Validates:
- Clean pass message when no vulnerabilities are found
- Correct severity emoji mapping for High findings
- post_pr_review returns False when GITHUB_TOKEN is not set
"""
import sys
import os
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from github_commenter import _build_review_body, post_pr_review


SAMPLE_VULN_HIGH = {
    "severity": "High",
    "issue": "SQL Injection",
    "explanation": "Unsanitized user input is concatenated directly into a SQL query.",
    "poc_exploit_scenario": "1. Attacker sends user_id=1 OR 1=1.\n2. Query returns all rows.",
    "remediation": {
        "patch": "cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))",
        "explanation": "Parameterized queries prevent injection by separating data from code.",
    }
}

SAMPLE_VULN_MEDIUM = {
    "severity": "Medium",
    "issue": "Hardcoded Secret",
    "explanation": "API key exposed in source code.",
    "poc_exploit_scenario": "Attacker clones repo and extracts API_KEY from source.",
    "suggested_fix": "Use environment variables instead."
}


class TestBuildReviewBody:

    def test_empty_vulnerabilities_returns_pass_message(self):
        body = _build_review_body([])
        assert "Passed" in body or "passed" in body
        assert "SageArmor" in body

    def test_high_severity_maps_to_orange_emoji(self):
        body = _build_review_body([SAMPLE_VULN_HIGH])
        assert "🟠" in body

    def test_medium_severity_maps_to_yellow_emoji(self):
        body = _build_review_body([SAMPLE_VULN_MEDIUM])
        assert "🟡" in body

    def test_finding_issue_title_appears_in_body(self):
        body = _build_review_body([SAMPLE_VULN_HIGH])
        assert "SQL Injection" in body

    def test_poc_scenario_appears_in_body(self):
        body = _build_review_body([SAMPLE_VULN_HIGH])
        assert "Attacker" in body

    def test_remediation_patch_appears_in_body(self):
        body = _build_review_body([SAMPLE_VULN_HIGH])
        assert "cursor.execute" in body

    def test_fallback_to_suggested_fix_for_old_schema(self):
        # Legacy vuln without 'remediation' object
        body = _build_review_body([SAMPLE_VULN_MEDIUM])
        assert "environment variables" in body

    def test_multiple_findings_numbered(self):
        body = _build_review_body([SAMPLE_VULN_HIGH, SAMPLE_VULN_MEDIUM])
        assert "Finding #1" in body
        assert "Finding #2" in body


class TestPostPrReview(unittest.TestCase):

    def test_returns_false_when_token_not_set(self):
        with patch.dict(os.environ, {}, clear=True):
            # Ensure GITHUB_TOKEN is absent
            os.environ.pop('GITHUB_TOKEN', None)
            result = post_pr_review("owner/repo", 42, [SAMPLE_VULN_HIGH])
        self.assertFalse(result)

    def test_returns_true_on_201_response(self):
        from unittest.mock import MagicMock
        mock_response = MagicMock()
        mock_response.status_code = 201

        with patch.dict(os.environ, {'GITHUB_TOKEN': 'fake-token'}):
            with patch('github_commenter.requests.post', return_value=mock_response):
                result = post_pr_review("owner/repo", 1, [SAMPLE_VULN_HIGH])
        self.assertTrue(result)

    def test_returns_false_on_401_response(self):
        from unittest.mock import MagicMock
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"

        with patch.dict(os.environ, {'GITHUB_TOKEN': 'bad-token'}):
            with patch('github_commenter.requests.post', return_value=mock_response):
                result = post_pr_review("owner/repo", 1, [])
        self.assertFalse(result)
