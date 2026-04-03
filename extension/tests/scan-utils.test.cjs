const test = require('node:test');
const assert = require('node:assert/strict');

const { filterBySeverity, summarizeVulnerabilities } = require('../out/testable.js');

test('filterBySeverity keeps only selected severities', () => {
  const vulns = [
    { severity: 'Critical' },
    { severity: 'High' },
    { severity: 'Low' },
  ];
  const filtered = filterBySeverity(vulns, ['Critical', 'High']);
  assert.equal(filtered.length, 2);
});

test('summarizeVulnerabilities computes counts', () => {
  const vulns = [
    { severity: 'Critical' },
    { severity: 'High' },
    { severity: 'Medium' },
    { severity: 'Low' },
    { severity: 'Low' },
  ];

  const summary = summarizeVulnerabilities(vulns);
  assert.equal(summary.total, 5);
  assert.equal(summary.critical, 1);
  assert.equal(summary.high, 1);
  assert.equal(summary.medium, 1);
  assert.equal(summary.low, 2);
});
