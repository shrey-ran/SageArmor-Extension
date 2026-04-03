const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeRemediation } = require('../out/testable.js');

test('normalizeRemediation preserves single-line fixes', () => {
  const out = normalizeRemediation('safeCall(userInput)', '    ');
  assert.equal(out, 'safeCall(userInput)');
});

test('normalizeRemediation indents multiline fixes after first line', () => {
  const input = 'if (x) {\nreturn y;\n}';
  const out = normalizeRemediation(input, '  ');
  assert.equal(out, 'if (x) {\n  return y;\n  }');
});
