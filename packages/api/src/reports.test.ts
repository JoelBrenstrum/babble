import { describe, expect, it } from 'vitest';
import { createReport, listReports, reportNameError, rowToReport, type ReportRow } from './reports';
import { fakeClient } from './test-utils';

const row = (overrides: Partial<ReportRow> = {}): ReportRow => ({
  id: 'report-1',
  family_id: 'family-1',
  name: 'Night and naps',
  spec: {
    version: 1,
    range: { preset: '30d' },
    bucket: 'day',
    series: [{ measure: 'sleep.night' }],
    chart: 'area',
    filters: [],
    options: {},
  },
  created_by: 'user-1',
  created_at: '2026-10-29T00:00:00Z',
  updated_at: '2026-10-29T00:00:00Z',
  ...overrides,
});

describe('reportNameError', () => {
  it('needs a short name', () => {
    expect(reportNameError('  ')).toBe('Give the report a name.');
    expect(reportNameError('x'.repeat(81))).toBe('Use 80 characters or fewer for the name.');
    expect(reportNameError(' Night and naps ')).toBeNull();
  });
});

describe('rowToReport', () => {
  it('parses the spec and drops rows it cannot read', () => {
    expect(rowToReport(row())?.spec.chart).toBe('area');
    expect(rowToReport(row({ spec: { version: 9 } }))).toBeNull();
  });
});

describe('listReports', () => {
  it("lists a family's reports and skips unreadable ones", async () => {
    const { client, requests } = fakeClient(() => ({ body: [row(), row({ id: 'report-2', spec: 'nope' })] }));
    const reports = await listReports(client, 'family-1');
    expect(reports.map((report) => report.id)).toEqual(['report-1']);
    expect(requests[0]?.url.searchParams.get('family_id')).toBe('eq.family-1');
  });
});

describe('createReport', () => {
  it('needs a session before it inserts', async () => {
    const { client, requests } = fakeClient(() => ({ body: [] }));
    await expect(
      createReport(client, { familyId: 'family-1', name: 'Feeds', spec: rowToReport(row())!.spec }),
    ).rejects.toMatchObject({
      code: 'not_signed_in',
    });
    expect(requests).toHaveLength(0);
  });

  it('refuses an empty name before it inserts', async () => {
    const { client, requests } = fakeClient(() => ({ body: [] }));
    await expect(
      createReport(client, { familyId: 'family-1', name: ' ', spec: rowToReport(row())!.spec }),
    ).rejects.toMatchObject({
      code: 'invalid_input',
    });
    expect(requests).toHaveLength(0);
  });
});
