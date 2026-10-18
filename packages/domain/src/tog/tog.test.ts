import { describe, expect, it } from 'vitest';
import {
  appendKey,
  celsiusToFahrenheit,
  clampTemp,
  convertTemp,
  fahrenheitToCelsius,
  formatTemp,
  formatTempRange,
  parseTypedTemp,
  parseTypedTog,
  roomForTog,
  scalePosition,
  stepTemp,
  stepTog,
  TOG_CHART,
  togForRoom,
} from './tog';

describe('temperature conversion and formatting', () => {
  it('rounds the chart edges to the published °F values', () => {
    expect([16, 18, 20, 24].map(celsiusToFahrenheit)).toEqual([61, 64, 68, 75]);
    expect(fahrenheitToCelsius(72)).toBe(22);
    expect(fahrenheitToCelsius(67)).toBe(19.5);
    expect(convertTemp(22, 'c', 'c')).toBe(22);
  });

  it('formats single values and ranges in either unit', () => {
    expect(formatTemp(19.5, 'c')).toBe('19.5 °C');
    expect(formatTemp(22, 'c')).toBe('22 °C');
    expect(formatTemp(71.6, 'f')).toBe('72 °F');
    expect(formatTempRange(16, 20, 'c')).toBe('16–20 °C');
    expect(formatTempRange(16, 20, 'f')).toBe('61–68 °F');
    expect(formatTempRange(-Infinity, 16, 'c')).toBe('Below 16 °C');
    expect(formatTempRange(24, Infinity, 'f')).toBe('75 °F and above');
  });
});

describe('stepping and typing', () => {
  it('steps temperatures by half a degree C or a whole degree F within the limits', () => {
    expect(stepTemp(22, 'c', 1)).toBe(22.5);
    expect(stepTemp(10, 'c', -1)).toBe(10);
    expect(stepTemp(30, 'c', 1)).toBe(30);
    expect(stepTemp(72, 'f', -1)).toBe(71);
    expect(stepTemp(86, 'f', 1)).toBe(86);
  });

  it('clamps and rounds typed temperatures', () => {
    expect(clampTemp(19.3, 'c')).toBe(19.5);
    expect(parseTypedTemp('19.5', 'c')).toBe(19.5);
    expect(parseTypedTemp('40', 'c')).toBe(30);
    expect(parseTypedTemp('71.6', 'f')).toBe(72);
    expect(parseTypedTemp('', 'c')).toBeNull();
  });

  it('steps through the common ratings and clamps typed TOGs', () => {
    expect(stepTog(2.5, 1)).toBe(3.0);
    expect(stepTog(0.2, -1)).toBe(0.2);
    expect(stepTog(4.0, 1)).toBe(4.0);
    expect(stepTog(2.2, 1)).toBe(2.5);
    expect(stepTog(2.2, -1)).toBe(2.0);
    expect(parseTypedTog('1.25')).toBe(1.3);
    expect(parseTypedTog('9')).toBe(5);
    expect(parseTypedTog('abc')).toBeNull();
  });

  it('builds typed input one key at a time', () => {
    expect(appendKey('', '.')).toBe('0.');
    expect(appendKey('1.5', '.')).toBe('1.5');
    expect(appendKey('19.5', '2')).toBe('19.5');
    expect(appendKey('19', 'del')).toBe('1');
  });

  it('places temperatures on the 12–28 °C scale', () => {
    expect(scalePosition(12)).toBe(0);
    expect(scalePosition(20)).toBe(50);
    expect(scalePosition(30)).toBe(100);
  });
});

describe('togForRoom', () => {
  it('gives the band TOG with the all-season hint inside 18–24', () => {
    const result = togForRoom(22, 'c');
    expect(result.head).toBe('1.0 TOG');
    expect(result.sub).toBe('For a room of 20–24 °C');
    expect(result.other).toBe('22 °C is 72 °F');
    expect(result.layers).toBe('Short-sleeve bodysuit; long sleeves at the cool end');
    expect(result.hints.map((h) => h.icon)).toEqual(['all-season']);
    expect(result.activeTogs).toEqual([1.0]);
    expect(result.marker).toEqual({ position: 62.5, label: '22 °C' });
    expect(result.outside).toEqual([]);
  });

  it('spans two bands within a degree of an edge and follows the heavier layers', () => {
    const result = togForRoom(20, 'c');
    expect(result.head).toBe('1.0–2.5 TOG');
    expect(result.sub).toBe('On the line between 16–20 °C and 20–24 °C');
    expect(result.layers).toBe('Long-sleeve bodysuit, or a sleepsuit');
    expect(result.hints[0]).toEqual({
      icon: 'edge',
      text: '20 °C sits between two bands. Go 2.5 if the room cools overnight.',
    });
    expect(result.activeTogs).toEqual([1.0, 2.5]);
  });

  it('handles the cold and hot ends without hints', () => {
    expect(togForRoom(13, 'c')).toMatchObject({ head: '3.5 TOG', sub: 'For a room of below 16 °C', hints: [] });
    expect(togForRoom(28, 'c')).toMatchObject({ head: '0.2 TOG', sub: 'For a room of 24 °C and above', hints: [] });
    expect(togForRoom(10, 'c').marker?.position).toBe(4);
  });

  it('works from °F and reports °C alongside', () => {
    const result = togForRoom(72, 'f');
    expect(result.head).toBe('1.0 TOG');
    expect(result.sub).toBe('For a room of 68–75 °F');
    expect(result.other).toBe('72 °F is 22 °C');
    expect(result.marker?.label).toBe('72 °F');
  });
});

describe('roomForTog', () => {
  it('reads a chart rating straight off the chart', () => {
    const result = roomForTog(2.5, 'c');
    expect(result.kicker).toBe('A 2.5 TOG bag suits');
    expect(result.head).toBe('16–20 °C');
    expect(result.other).toBe('61–68 °F');
    expect(result.sub).toBe('Room temperature');
    expect(result.layers).toBe('Long-sleeve bodysuit, or a sleepsuit');
    expect(result.hints).toEqual([]);
    expect(result.outside).toEqual([
      { icon: 'sun', when: 'Warmer than 20 °C:', what: 'use a 1.0 TOG bag, or fewer layers underneath.' },
      { icon: 'snow', when: 'Cooler than 16 °C:', what: 'use a 3.5 TOG bag, or add a layer underneath.' },
    ]);
    expect(result.bracket).toEqual({ from: 25, to: 50 });
    expect(result.marker).toBeNull();
  });

  it('estimates in-between ratings and says so', () => {
    const result = roomForTog(2.0, 'c');
    expect(result.head).toBe('17–22 °C');
    expect(result.sub).toBe('Estimated between two chart ratings');
    expect(result.layers).toBe('Long-sleeve bodysuit');
    expect(result.hints.map((h) => h.icon)).toEqual(['brand']);
    expect(result.activeTogs).toEqual([1.5, 2.5]);
    expect(roomForTog(0.5, 'c').head).toBe('23–26 °C');
    expect(roomForTog(3.0, 'c').head).toBe('14–18 °C');
  });

  it('reads anything above 3.5 as 3.5', () => {
    const result = roomForTog(4.0, 'c');
    expect(result.kicker).toBe('A 4.0 TOG bag suits');
    expect(result.head).toBe('Below 16 °C');
    expect(result.hints).toEqual([
      { icon: 'clamp', text: 'This chart stops at 3.5 TOG, so it is read as a 3.5 TOG bag.' },
    ]);
    expect(result.outside).toEqual([
      { icon: 'sun', when: 'Warmer than 16 °C:', what: 'use a 2.5 TOG bag, or fewer layers underneath.' },
    ]);
    expect(result.bracket).toEqual({ from: 0, to: 25 });
  });

  it('describes the open warm end and the all-season bag', () => {
    const lite = roomForTog(0.2, 'c');
    expect(lite.head).toBe('24 °C and above');
    expect(lite.outside).toEqual([
      { icon: 'sun', when: 'Very warm:', what: 'just a nappy under it.' },
      { icon: 'snow', when: 'Cooler than 24 °C:', what: 'use a 1.0 TOG bag, or add a layer underneath.' },
    ]);
    expect(lite.bracket).toEqual({ from: 75, to: 100 });
    const allSeason = roomForTog(1.5, 'f');
    expect(allSeason.head).toBe('64–75 °F');
    expect(allSeason.other).toBe('18–24 °C');
    expect(allSeason.sub).toBe('An all-season bag across two bands');
    expect(allSeason.outside[0]?.when).toBe('Warmer than 75 °F:');
  });

  it('keeps the chart rows in display order', () => {
    expect(TOG_CHART.map((row) => row.tog)).toEqual([0.2, 1.0, 1.5, 2.5, 3.5]);
  });
});
