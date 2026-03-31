"""
Unit tests for backend/src/handler.py

Validates:
- Returns 400 when no code is provided in non-webhook requests
- Returns 401 when GitHub webhook signature is invalid
- Skips non-actionable webhook actions (e.g. 'closed')

All AWS Bedrock and GitHub API calls are mocked — zero real network traffic.
"""
import sys
import os
import json
import unittest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


def _make_event(body: dict, headers: dict = None) -> dict:
    """Helper that builds a mock Lambda API Gateway event."""
    return {
        "body": json.dumps(body),
        "headers": headers or {},
    }


class TestReviewCodeInputValidation(unittest.TestCase):

    def _patched_import(self):
        """Returns handler module with boto3 mocked to prevent init-time AWS calls."""
        mock_bedrock = MagicMock()
        with patch('boto3.client', return_value=mock_bedrock):
            import importlib
            from src import handler
            importlib.reload(handler)
            return handler, mock_bedrock

    def test_returns_400_when_code_is_missing(self):
        handler, _ = self._patched_import()
        event = _make_event({"language": "python"})  # no 'code' key

        with patch.dict(os.environ, {'GITHUB_WEBHOOK_SECRET': ''}):
            response = handler.review_code(event, {})

        self.assertEqual(response["statusCode"], 400)
        body = json.loads(response["body"])
        self.assertIn("error", body)

    def test_returns_400_when_code_is_empty_string(self):
        handler, _ = self._patched_import()
        event = _make_event({"code": "", "language": "python"})

        with patch.dict(os.environ, {'GITHUB_WEBHOOK_SECRET': ''}):
            response = handler.review_code(event, {})

        self.assertEqual(response["statusCode"], 400)

    def test_skips_non_opened_webhook_action(self):
        handler, _ = self._patched_import()
        # 'closed' PR events should be skipped gracefully
        event = _make_event({
            "action": "closed",
            "pull_request": {"diff_url": "https://example.com/diff"},
            "repository": {"full_name": "owner/repo"}
        })

        with patch.dict(os.environ, {'GITHUB_WEBHOOK_SECRET': ''}):
            response = handler.review_code(event, {})

        self.assertEqual(response["statusCode"], 200)
        body = json.loads(response["body"])
        self.assertIn("msg", body)
        self.assertIn("Skipping", body["msg"])


class TestReviewCodeSignatureValidation(unittest.TestCase):

    def test_returns_401_on_invalid_signature(self):
        mock_bedrock = MagicMock()
        with patch('boto3.client', return_value=mock_bedrock):
            import importlib
            from src import handler
            importlib.reload(handler)

        body_str = json.dumps({"code": "x = 1", "language": "python"})
        event = {
            "body": body_str,
            "headers": {
                "x-hub-signature-256": "sha256=invalidsignature",
            }
        }

        with patch.dict(os.environ, {'GITHUB_WEBHOOK_SECRET': 'real-secret'}):
            response = handler.review_code(event, {})

        self.assertEqual(response["statusCode"], 401)
        body = json.loads(response["body"])
        self.assertIn("error", body)


if __name__ == "__main__":
    unittest.main()
