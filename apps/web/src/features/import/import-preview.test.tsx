import { parseHuckleberryCsv } from '@babble/domain';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ImportPreview } from './import-preview';

const fixture = (name: string) =>
  readFileSync(resolve(process.cwd(), '../../packages/domain/src/huckleberry/__fixtures__', name), 'utf8');

describe('ImportPreview', () => {
  it('summarises what will be imported', () => {
    render(
      <ImportPreview
        result={parseHuckleberryCsv(fixture('real-week.csv'), { timeZone: 'Pacific/Auckland' })}
        timeZone="Pacific/Auckland"
      />,
    );
    expect(screen.getByText('134 entries ready to import')).toBeInTheDocument();
    expect(screen.getByText('56')).toBeInTheDocument();
    expect(screen.getByText('Breastfeeds')).toBeInTheDocument();
    expect(screen.getByText(/No downtime data for feeds/)).toBeInTheDocument();
    expect(screen.queryByText(/rows? skipped/)).not.toBeInTheDocument();
  });

  it('lists skipped rows and warnings', () => {
    render(
      <ImportPreview
        result={parseHuckleberryCsv(fixture('all-types.csv'), { timeZone: 'Pacific/Auckland' })}
        timeZone="Pacific/Auckland"
      />,
    );
    expect(screen.getByText('5 rows skipped')).toBeInTheDocument();
    expect(screen.getAllByText('Potty tracking is not supported')).toHaveLength(3);
    expect(screen.getByText('1 note about the data')).toBeInTheDocument();
  });
});
