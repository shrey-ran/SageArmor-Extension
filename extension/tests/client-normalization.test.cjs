const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeReviewResponse, mapBackendError } = require('../out/testable.js');

test('normalizeReviewResponse maps backend fields to extension schema', () => {
  const data = {
    vulnerabilities: [
      {
        issue: 'SQL Injection',
        explanation: 'Unsafe concatenation',
        severity: 'High',
        line: 4,
        column: 2,
        attack_vector: 'user input',
        poc_exploit_scenario: 'inject payload',
        suggested_fix: 'use parameterized query',
      },
    ],
    analysis_mode: 'gemini',
  };

  const normalized = normalizeReviewResponse(data, 'javascript');
  assert.equal(normalized.vulnerabilities.length, 1);
  assert.equal(normalized.vulnerabilities[0].title, 'SQL Injection');
  assert.equal(normalized.vulnerabilities[0].line, 3);
  assert.equal(normalized.vulnerabilities[0].column, 1);
  assert.equal(normalized.vulnerabilities[0].attack_scenario, 'inject payload');
  assert.equal(normalized.vulnerabilities[0].remediation, 'use parameterized query');
});

test('mapBackendError returns timeout message', () => {
  const msg = mapBackendError({ code: 'ECONNABORTED' }, 'http://localhost:3000');
  assert.match(msg, /timed out/i);
});

test('mapBackendError returns quota message', () => {
  const msg = mapBackendError({ response: { status: 429, data: { retry_after_seconds: 9 } } }, 'http://localhost:3000');
  assert.match(msg, /Retry in 9 seconds/);
});
