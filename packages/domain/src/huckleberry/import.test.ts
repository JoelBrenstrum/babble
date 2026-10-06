import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  HuckleberryCsvError,
  parseHoursMinutes,
  parseHuckleberryCsv,
  parseLengthMm,
  parseSideDuration,
  parseVolumeMl,
  parseWeightG,
  type ImportedEvent,
} from './import';

const HEADER = '"Type","Start","End","Duration","Start Condition","Start Location","End Condition","Notes","Logged By"';
const fixture = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8');

function importRows(...rows: string[]) {
  return parseHuckleberryCsv([HEADER, ...rows].join('\n'), { timeZone: 'UTC' });
}

function onlyEvent<T extends ImportedEvent['type']>(rows: string[], type: T) {
  const result = importRows(...rows);
  expect(result.skipped).toEqual([]);
  expect(result.events).toHaveLength(1);
  const event = result.events[0]!;
  expect(event.type).toBe(type);
  return { event: event as Extract<ImportedEvent, { type: T }>, warnings: result.warnings };
}

describe('parseHuckleberryCsv', () => {
  it('rejects files that are not Huckleberry exports', () => {
    expect(() => parseHuckleberryCsv('a,b,c\n1,2,3', { timeZone: 'UTC' })).toThrow(HuckleberryCsvError);
    expect(() => parseHuckleberryCsv('', { timeZone: 'UTC' })).toThrow(HuckleberryCsvError);
  });

  it('ignores blank lines', () => {
    expect(importRows('', '"Diaper","2025-10-01 10:00",,,,,"Dry",,', '').events).toHaveLength(1);
  });

  it('converts local times using the given time zone', () => {
    const result = parseHuckleberryCsv([HEADER, '"Diaper","2025-10-06 06:43",,,,,"Dry",,'].join('\n'), {
      timeZone: 'Pacific/Auckland',
    });
    expect(result.events[0]!.startedAt).toBe('2025-10-05T17:43:00.000Z');
  });

  describe('breast feeds', () => {
    it('builds back-to-back segments from the right and left totals', () => {
      const { event } = onlyEvent(
        ['"Feed","2025-10-01 06:09","2025-10-01 07:07","00:57","00:35R","Breast","00:21L",,'],
        'breast_feed',
      );
      expect(event.segments).toEqual([
        { side: 'right', startedAt: '2025-10-01T06:09:00.000Z', endedAt: '2025-10-01T06:44:00.000Z' },
        { side: 'left', startedAt: '2025-10-01T06:44:00.000Z', endedAt: '2025-10-01T07:05:00.000Z' },
      ]);
      expect(event.startedAt).toBe('2025-10-01T06:09:00.000Z');
      expect(event.endedAt).toBe('2025-10-01T07:05:00.000Z');
    });

    it('handles a single side', () => {
      const { event } = onlyEvent(
        ['"Feed","2025-10-01 06:00","2025-10-01 06:11","00:11",,"Breast","00:11L",,'],
        'breast_feed',
      );
      expect(event.segments).toEqual([
        { side: 'left', startedAt: '2025-10-01T06:00:00.000Z', endedAt: '2025-10-01T06:11:00.000Z' },
      ]);
    });

    it('drops zero-length sides', () => {
      const { event } = onlyEvent(['"Feed","2025-10-01 06:00",,"00:05","00:00R","Breast","00:05L",,'], 'breast_feed');
      expect(event.segments.map((segment) => segment.side)).toEqual(['left']);
    });

    it('skips a breast feed with no side durations', () => {
      expect(importRows('"Feed","2025-10-01 06:00",,,,"Breast",,,').skipped).toEqual([
        { line: 2, type: 'Feed', reason: 'Breast feed has no side durations' },
      ]);
    });
  });

  describe('bottle feeds', () => {
    it('maps content and amount', () => {
      const { event } = onlyEvent(
        ['"Feed","2025-10-01 10:56",,,"Breast Milk","Bottle","110ml","A milk note",'],
        'bottle',
      );
      expect(event.details).toEqual({ content: 'breast_milk', amountMl: 110, amountLeftMl: null });
      expect(event.notes).toBe('A milk note');
      expect(event.endedAt).toBe(event.startedAt);
    });

    it('maps formula and converts ounces', () => {
      const { event } = onlyEvent(['"Feed","2025-10-01 10:56",,,"Formula","Bottle","4oz",,'], 'bottle');
      expect(event.details).toEqual({ content: 'formula', amountMl: 118, amountLeftMl: null });
    });

    it('imports other milk types as other with a warning', () => {
      const { event, warnings } = onlyEvent(['"Feed","2025-10-01 10:56",,,"Goat Milk","Bottle","90ml",,'], 'bottle');
      expect(event.details.content).toBe('other');
      expect(warnings).toEqual([{ line: 2, message: 'Bottle type "Goat Milk" imported as other' }]);
    });
  });

  describe('nappies', () => {
    it.each([
      ['Dry', { wet: false, dirty: false, wetSize: null, pooSize: null }],
      ['Pee', { wet: true, dirty: false, wetSize: null, pooSize: null }],
      ['Pee:large', { wet: true, dirty: false, wetSize: 'large', pooSize: null }],
      ['Poo', { wet: false, dirty: true, wetSize: null, pooSize: null }],
      ['Poo:small', { wet: false, dirty: true, wetSize: null, pooSize: 'little' }],
      ['Both, pee:medium', { wet: true, dirty: true, wetSize: 'medium', pooSize: null }],
      ['Both, pee:large poo:small', { wet: true, dirty: true, wetSize: 'large', pooSize: 'little' }],
    ])('maps "%s"', (contents, expected) => {
      const { event } = onlyEvent([`"Diaper","2025-10-01 10:00",,,,,"${contents}",,`], 'nappy');
      expect(event.details).toMatchObject(expected);
    });

    it('maps colour, texture and rash from the repurposed columns', () => {
      const { event } = onlyEvent(
        ['"Diaper","2025-10-01 10:00",,"black","Loose","Diaper rash","Poo:medium",,'],
        'nappy',
      );
      expect(event.details).toEqual({
        wet: false,
        dirty: true,
        wetSize: null,
        pooSize: 'medium',
        pooColours: ['black'],
        pooTextures: ['loose'],
        rash: true,
      });
    });

    it('maps gray to white/grey', () => {
      const { event } = onlyEvent(['"Diaper","2025-10-01 10:00",,"gray",,,"Poo",,'], 'nappy');
      expect(event.details.pooColours).toEqual(['white_grey']);
    });

    it('maps solid to formed', () => {
      const { event } = onlyEvent(['"Diaper","2025-10-01 10:00",,,"Solid",,"Poo",,'], 'nappy');
      expect(event.details.pooTextures).toEqual(['formed']);
    });

    it('warns about unknown colours and textures', () => {
      const { event, warnings } = onlyEvent(['"Diaper","2025-10-01 10:00",,"purple","Fluffy",,"Poo",,'], 'nappy');
      expect(event.details.pooColours).toEqual([]);
      expect(event.details.pooTextures).toEqual([]);
      expect(warnings.map((warning) => warning.message)).toEqual([
        'Unrecognised poo colour "purple"',
        'Unrecognised poo texture "fluffy"',
      ]);
    });

    it('skips unrecognised contents', () => {
      expect(importRows('"Diaper","2025-10-01 10:00",,,,,"Sparkles",,').skipped[0]!.reason).toBe(
        'Unrecognised diaper contents "Sparkles"',
      );
    });
  });

  describe('sleep', () => {
    it('maps start and end times', () => {
      const { event } = onlyEvent(['"Sleep","2025-10-01 03:00","2025-10-01 06:06","03:05",,,,,'], 'sleep');
      expect(event.startedAt).toBe('2025-10-01T03:00:00.000Z');
      expect(event.endedAt).toBe('2025-10-01T06:06:00.000Z');
      expect(event.details).toEqual({
        locations: [],
        fallAsleep: null,
        startMoods: [],
        endMoods: [],
        wokenByCarer: false,
      });
    });

    it('falls back to start plus duration when there is no end', () => {
      const { event } = onlyEvent(['"Sleep","2025-10-01 03:00",,"01:30",,,,,'], 'sleep');
      expect(event.endedAt).toBe('2025-10-01T04:30:00.000Z');
    });

    it('maps every condition and location', () => {
      const { event, warnings } = onlyEvent(
        [
          '"Sleep","2025-10-01 08:59","2025-10-01 10:55","01:56","10-20_minutes, upset, happy, long time to fall asleep, under_10_minutes","Swing, car, worn or held, nursing, stroller, on own in bed, bottle, co sleep, next to carer","Upset, woke up child, happy","This is a note",',
        ],
        'sleep',
      );
      expect(event.details).toEqual({
        locations: ['swing', 'car', 'held', 'nursing', 'pram', 'cot', 'bottle', 'co_sleep', 'next_to_carer'],
        fallAsleep: '10_to_20_min',
        startMoods: ['upset', 'happy'],
        endMoods: ['upset', 'happy'],
        wokenByCarer: true,
      });
      expect(warnings).toEqual([{ line: 2, message: 'Multiple fall-asleep times recorded; kept "10_to_20_min"' }]);
    });

    it('skips a sleep with no end time or duration', () => {
      expect(importRows('"Sleep","2025-10-01 03:00",,,,,,,').skipped[0]!.reason).toBe('Sleep has no end time');
    });
  });

  describe('pumping', () => {
    it('maps left and right amounts', () => {
      const { event } = onlyEvent(['"Pump","2025-10-01 10:59",,,"20ml",,"10ml",,'], 'pump');
      expect(event.details).toEqual({ leftMl: 20, rightMl: 10, totalMl: null });
      expect(event.segments).toEqual([]);
      expect(event.endedAt).toBe(event.startedAt);
    });

    it('maps a left-only amount and keeps the duration', () => {
      const { event } = onlyEvent(['"Pump","2025-10-01 10:58","2025-10-01 11:20","00:22","30ml",,,,'], 'pump');
      expect(event.details).toEqual({ leftMl: 30, rightMl: null, totalMl: null });
      expect(event.endedAt).toBe('2025-10-01T11:20:00.000Z');
    });

    it('maps a right-only amount', () => {
      const { event } = onlyEvent(['"Pump","2025-10-01 10:58",,,,,"15ml",,'], 'pump');
      expect(event.details).toEqual({ leftMl: null, rightMl: 15, totalMl: null });
    });

    it('warns about unrecognised amounts', () => {
      const { warnings } = onlyEvent(['"Pump","2025-10-01 10:58",,,"lots",,,,'], 'pump');
      expect(warnings).toEqual([{ line: 2, message: 'Unrecognised left pump amount "lots"' }]);
    });
  });

  describe('growth', () => {
    it('maps weight, length and head circumference', () => {
      const { event } = onlyEvent(['"Growth","2025-10-01 10:07",,,"4.09kg","52cm","37.5cm",,'], 'growth');
      expect(event.details).toEqual({ weightG: 4090, lengthMm: 520, headCircumferenceMm: 375 });
    });

    it('allows partial measurements', () => {
      const { event } = onlyEvent(['"Growth","2025-10-01 11:02",,,,,"23.9cm",,'], 'growth');
      expect(event.details).toEqual({ weightG: null, lengthMm: null, headCircumferenceMm: 239 });
    });

    it('skips an entry with no measurements', () => {
      expect(importRows('"Growth","2025-10-01 11:02",,,,,,,').skipped[0]!.reason).toBe(
        'Growth entry has no measurements',
      );
    });
  });

  describe('activities', () => {
    it('imports tummy time and bath as custom events', () => {
      const result = importRows(
        '"Tummy time","2025-10-01 11:00","2025-10-01 11:15","00:15",,,,,',
        '"Bath","2025-10-01 10:59",,,,,,"bathtime note ",',
      );
      expect(result.events.map((event) => event.type === 'custom' && event.details.title)).toEqual([
        'Tummy time',
        'Bath',
      ]);
      expect(result.events[0]!.endedAt).toBe('2025-10-01T11:15:00.000Z');
      expect(result.events[1]!.endedAt).toBe(result.events[1]!.startedAt);
      expect(result.events[1]!.notes).toBe('bathtime note');
    });
  });

  it.each([
    ['Potty', 'Potty tracking is not supported'],
    ['Solids', 'Solids tracking is not supported'],
    ['Temp', 'Temperature tracking is not supported'],
    ['Medicine', 'Medicine tracking is not supported'],
    ['Something new', 'Unsupported type "Something new"'],
  ])('skips %s rows', (type, reason) => {
    expect(importRows(`"${type}","2025-10-01 10:00",,,,,,,`).skipped).toEqual([{ line: 2, type, reason }]);
  });

  it('skips rows with an invalid start time', () => {
    expect(importRows('"Diaper","yesterday",,,,,"Dry",,').skipped[0]!.reason).toBe('Invalid start time "yesterday"');
  });

  it('decodes escaped newlines in notes and drops blank notes', () => {
    const result = importRows(
      '"Diaper","2025-10-01 10:00",,,,,"Dry","First\\nSecond ",',
      '"Diaper","2025-10-01 11:00",,,,,"Dry","  ",',
    );
    expect(result.events.map((event) => event.notes)).toEqual(['First\nSecond', null]);
  });

  describe('source refs', () => {
    it('are stable across imports', () => {
      const row = '"Diaper","2025-10-01 10:00",,,,,"Dry",,';
      expect(importRows(row).events[0]!.sourceRef).toBe(importRows(row).events[0]!.sourceRef);
    });

    it('differ between rows', () => {
      const [a, b] = importRows(
        '"Diaper","2025-10-01 10:00",,,,,"Dry",,',
        '"Diaper","2025-10-01 10:01",,,,,"Dry",,',
      ).events;
      expect(a!.sourceRef).not.toBe(b!.sourceRef);
    });

    it('keep identical rows distinct', () => {
      const row = '"Growth","2025-10-01 11:01",,,,,"23.9cm",,';
      const refs = importRows(row, row).events.map((event) => event.sourceRef);
      expect(new Set(refs).size).toBe(2);
    });
  });
});

describe('Huckleberry export fixtures', () => {
  const countByType = (events: ImportedEvent[]) =>
    events.reduce<Record<string, number>>(
      (counts, event) => ({ ...counts, [event.type]: (counts[event.type] ?? 0) + 1 }),
      {},
    );

  it('imports a week of real (anonymised) data without skips or warnings', () => {
    const result = parseHuckleberryCsv(fixture('real-week.csv'), { timeZone: 'Pacific/Auckland' });
    expect(result.skipped).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(countByType(result.events)).toEqual({ nappy: 39, breast_feed: 56, sleep: 36, growth: 3 });
    expect(new Set(result.events.map((event) => event.sourceRef)).size).toBe(result.events.length);
  });

  it('keeps breast feed totals equal to the side durations', () => {
    const result = parseHuckleberryCsv(fixture('real-week.csv'), { timeZone: 'Pacific/Auckland' });
    for (const event of result.events) {
      if (event.type !== 'breast_feed') continue;
      const total = event.segments.reduce((sum, s) => sum + Date.parse(s.endedAt) - Date.parse(s.startedAt), 0);
      expect(Date.parse(event.endedAt!) - Date.parse(event.startedAt)).toBe(total);
    }
  });

  it('imports an export containing every Huckleberry type', () => {
    const result = parseHuckleberryCsv(fixture('all-types.csv'), { timeZone: 'Pacific/Auckland' });
    expect(countByType(result.events)).toEqual({ growth: 5, custom: 3, pump: 2, bottle: 2, breast_feed: 1, sleep: 1 });
    expect(result.skipped.map((row) => row.type)).toEqual(['Temp', 'Potty', 'Potty', 'Potty', 'Solids']);
    expect(result.warnings).toEqual([
      { line: 19, message: 'Multiple fall-asleep times recorded; kept "10_to_20_min"' },
    ]);
  });
});

describe('field parsers', () => {
  it.each([
    ['00:57', 57 * 60_000],
    ['01:56', 116 * 60_000],
    ['', null],
    ['1h', null],
  ])('parseHoursMinutes(%j)', (value, expected) => expect(parseHoursMinutes(value)).toBe(expected));

  it.each([
    ['00:35R', { side: 'right', durationMs: 35 * 60_000 }],
    ['00:21L', { side: 'left', durationMs: 21 * 60_000 }],
    ['00:21', null],
  ])('parseSideDuration(%j)', (value, expected) => expect(parseSideDuration(value)).toEqual(expected));

  it.each([
    ['280ml', 280],
    ['4oz', 118],
    ['2.5 oz', 74],
    ['lots', null],
  ])('parseVolumeMl(%j)', (value, expected) => expect(parseVolumeMl(value)).toBe(expected));

  it.each([
    ['4.09kg', 4090],
    ['3500g', 3500],
    ['8.5lbs', 3856],
    ['heavy', null],
  ])('parseWeightG(%j)', (value, expected) => expect(parseWeightG(value)).toBe(expected));

  it.each([
    ['52cm', 520],
    ['37.5cm', 375],
    ['20in', 508],
    ['tall', null],
  ])('parseLengthMm(%j)', (value, expected) => expect(parseLengthMm(value)).toBe(expected));
});
