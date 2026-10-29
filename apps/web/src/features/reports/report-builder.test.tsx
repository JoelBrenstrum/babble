import { emptySpec, type ReportSettings, type ReportSpec } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ReportBuilder } from './report-builder';

const settings: ReportSettings = {
  timeZone: 'UTC',
  dayStartMinutes: 0,
  nightStartMinutes: 19 * 60,
  nightEndMinutes: 7 * 60,
  mergeGapMs: 15_000,
  units: 'metric',
  birthDate: '2026-08-01',
  carers: { 'user-1': 'Joel', 'user-2': 'Sam' },
};

function Harness({
  initial,
  onSpec,
  locked = false,
  onLockedRange = () => undefined,
}: {
  initial: ReportSpec;
  onSpec: (spec: ReportSpec) => void;
  locked?: boolean;
  onLockedRange?: () => void;
}) {
  const [spec, setSpec] = useState(initial);
  return (
    <ReportBuilder
      spec={spec}
      onChange={(next) => {
        setSpec(next);
        onSpec(next);
      }}
      settings={settings}
      preview={<div>preview</div>}
      longRangesLocked={locked}
      onLockedRange={onLockedRange}
      footer={<div>footer</div>}
    />
  );
}

describe('ReportBuilder', () => {
  it('adds measures, limits mixing units, and suggests a chart', () => {
    const onSpec = vi.fn();
    render(<Harness initial={emptySpec()} onSpec={onSpec} />);
    expect(screen.getByRole('radio', { name: /Bar/ })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('radio', { name: /Bar/ })).toHaveAttribute('title', 'Pick a measure first');

    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Time asleep' })[0]!);
    const last = onSpec.mock.calls.at(-1)![0] as ReportSpec;
    expect(last.series).toEqual([{ measure: 'sleep.total' }]);
    expect(screen.getAllByText('Suggested')).toHaveLength(1);

    const bottles = screen.getAllByRole('checkbox', { name: 'Bottle volume' })[0]!;
    expect(bottles).toHaveAttribute('aria-disabled', 'true');
    expect(bottles).toHaveAttribute('title', 'Mix measures with the same unit as Time asleep');

    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Location' })[0]!);
    expect((onSpec.mock.calls.at(-1)![0] as ReportSpec).splitBy).toBe('location');
    const donut = screen.getAllByRole('radio', { name: /Donut/ })[0]!;
    expect(donut).not.toHaveAttribute('aria-disabled');
    fireEvent.click(donut);
    expect((onSpec.mock.calls.at(-1)![0] as ReportSpec).chart).toBe('donut');
  });

  it('adds and removes a filter with labelled values', () => {
    const onSpec = vi.fn();
    render(<Harness initial={{ ...emptySpec(), series: [{ measure: 'feeds.bottleMl' }] }} onSpec={onSpec} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Add filter' })[0]!);
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Formula' })[0]!);
    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]!);
    expect((onSpec.mock.calls.at(-1)![0] as ReportSpec).filters).toEqual([
      { key: 'bottleContent', values: ['formula'] },
    ]);
    expect(screen.getAllByText('Bottle content is Formula')[0]).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove filter Bottle content is Formula' })[0]!);
    expect((onSpec.mock.calls.at(-1)![0] as ReportSpec).filters).toEqual([]);
  });

  it('sends locked ranges to the Plus pitch instead of applying them', () => {
    const onSpec = vi.fn();
    const onLockedRange = vi.fn();
    render(
      <Harness
        initial={{ ...emptySpec(), series: [{ measure: 'feeds.bottleMl' }] }}
        onSpec={onSpec}
        locked
        onLockedRange={onLockedRange}
      />,
    );
    fireEvent.click(screen.getAllByRole('checkbox', { name: /All/ })[0]!);
    expect(onLockedRange).toHaveBeenCalledTimes(1);
    expect(onSpec).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('checkbox', { name: '14 days' })[0]!);
    expect((onSpec.mock.calls.at(-1)![0] as ReportSpec).range).toEqual({ preset: '14d' });
  });
});
