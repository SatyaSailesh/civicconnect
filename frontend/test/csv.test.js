import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, complaintsToCsv } from '../src/services/csv.js';

test('CSV quotes embedded delimiters, quotes and newlines', () => {
    assert.equal(csvCell('Road, "A"\nHyderabad'), '"Road, ""A""\nHyderabad"');
});
test('CSV neutralizes spreadsheet formula prefixes, including whitespace', () => {
    for (const value of ['=1+1', '+SUM(A1)', '-2+3', '@SUM(A1)', '  =cmd', '\t=1'])
        assert.equal(csvCell(value).startsWith('"\''), true);
});
test('CSV export preserves Unicode, missing values and tracking IDs', () => {
    const csv = complaintsToCsv([{ complaintId: 'CC-2026-000001', title: 'దీపం, "Light"', user: null }]);
    assert.ok(csv.startsWith('\uFEFF"ID"'));
    assert.ok(csv.includes('"CC-2026-000001","దీపం, ""Light"""'));
    assert.equal(csv.includes('undefined'), false);
});
