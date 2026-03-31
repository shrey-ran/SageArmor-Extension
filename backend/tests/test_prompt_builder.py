"""
Unit tests for backend/src/prompt_builder.py

Validates:
- Non-empty output for any input
- Correct SAST mode copy for Python/JS/Go
- Correct IaC mode copy for Terraform/YAML
- Schema fields (poc_exploit_scenario, remediation) appear in the prompt
"""
import sys
import os

# Ensure the src directory is on the path so we can import without installing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.prompt_builder import build_security_prompt


class TestBuildSecurityPrompt:

    def test_returns_non_empty_string(self):
        result = build_security_prompt("print('hello')", "python")
        assert isinstance(result, str)
        assert len(result) > 100

    def test_python_mode_is_sast(self):
        result = build_security_prompt("x = 1", "python")
        assert "SAST" in result

    def test_javascript_mode_is_sast(self):
        result = build_security_prompt("const x = 1;", "javascript")
        assert "SAST" in result

    def test_go_mode_is_sast(self):
        result = build_security_prompt("fmt.Println('hi')", "go")
        assert "SAST" in result

    def test_terraform_mode_is_iac(self):
        result = build_security_prompt('resource "aws_s3_bucket" {}', "terraform")
        assert "IaC" in result

    def test_yaml_mode_is_iac(self):
        result = build_security_prompt("apiVersion: v1", "yaml")
        assert "IaC" in result

    def test_prompt_requires_poc_exploit_scenario(self):
        result = build_security_prompt("x = 1", "python")
        assert "poc_exploit_scenario" in result

    def test_prompt_requires_remediation_object(self):
        result = build_security_prompt("x = 1", "python")
        assert "remediation" in result

    def test_prompt_contains_cis_nist_guidelines(self):
        result = build_security_prompt("x = 1", "python")
        # Guidelines JSON is injected; at minimum the root key should appear
        assert "guidelines" in result.lower() or "CIS" in result or "NIST" in result

    def test_default_language_is_python(self):
        result_explicit = build_security_prompt("x = 1", "python")
        result_default  = build_security_prompt("x = 1")
        assert result_explicit == result_default
