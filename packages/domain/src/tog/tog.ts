export type TempUnit = 'c' | 'f';
export type TogMode = 'room' | 'bag';

export interface TogBand {
  tog: number;
  lo: number;
  hi: number;
  layers: string;
}

const LAYERS = {
  0.2: "Short-sleeve bodysuit, or just a nappy when it's very warm",
  1.0: 'Short-sleeve bodysuit; long sleeves at the cool end',
  1.5: 'Long-sleeve bodysuit',
  2.5: 'Long-sleeve bodysuit, or a sleepsuit',
  3.5: 'Long-sleeve bodysuit and a sleepsuit',
} as const;

export const TOG_BANDS: readonly TogBand[] = [
  { tog: 3.5, lo: -Infinity, hi: 16, layers: LAYERS[3.5] },
  { tog: 2.5, lo: 16, hi: 20, layers: LAYERS[2.5] },
  { tog: 1.0, lo: 20, hi: 24, layers: LAYERS[1.0] },
  { tog: 0.2, lo: 24, hi: Infinity, layers: LAYERS[0.2] },
];

export const TOG_CHART: readonly TogBand[] = [
  { tog: 0.2, lo: 24, hi: Infinity, layers: LAYERS[0.2] },
  { tog: 1.0, lo: 20, hi: 24, layers: LAYERS[1.0] },
  { tog: 1.5, lo: 18, hi: 24, layers: `${LAYERS[1.5]} (an "all season" bag that overlaps the two bands either side)` },
  { tog: 2.5, lo: 16, hi: 20, layers: LAYERS[2.5] },
  { tog: 3.5, lo: -Infinity, hi: 16, layers: LAYERS[3.5] },
];

export const TOG_RATINGS: readonly number[] = [0.2, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5];
const TOG_STEPS: readonly number[] = [...TOG_RATINGS, 4.0];
export const MAX_CHART_TOG = 3.5;
const MIN_TOG = 0.1;
const MAX_TOG = 5;

export const TEMP_LIMITS: Record<TempUnit, { min: number; max: number; step: number }> = {
  c: { min: 10, max: 30, step: 0.5 },
  f: { min: 50, max: 86, step: 1 },
};

const SCALE_MIN_C = 12;
const SCALE_MAX_C = 28;
const BAND_EDGES_C = [16, 20, 24];
const ALL_SEASON = { lo: 18, hi: 24 };

export function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32);
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return Math.round((((fahrenheit - 32) * 5) / 9) * 2) / 2;
}

export function convertTemp(value: number, from: TempUnit, to: TempUnit): number {
  if (from === to) return value;
  return to === 'f' ? celsiusToFahrenheit(value) : fahrenheitToCelsius(value);
}

function roundTemp(value: number, unit: TempUnit): number {
  return unit === 'f' ? Math.round(value) : Math.round(value * 2) / 2;
}

export function formatTog(tog: number): string {
  return tog.toFixed(1);
}

export function formatTempValue(value: number, unit: TempUnit): string {
  return String(roundTemp(value, unit));
}

export function tempUnitLabel(unit: TempUnit): string {
  return unit === 'f' ? '°F' : '°C';
}

export function formatTemp(value: number, unit: TempUnit): string {
  return `${formatTempValue(value, unit)} ${tempUnitLabel(unit)}`;
}

function edgeText(celsius: number, unit: TempUnit): string {
  return unit === 'f' ? String(celsiusToFahrenheit(celsius)) : formatTempValue(celsius, 'c');
}

export function formatTempRange(loC: number, hiC: number, unit: TempUnit): string {
  const label = tempUnitLabel(unit);
  if (loC === -Infinity) return `Below ${edgeText(hiC, unit)} ${label}`;
  if (hiC === Infinity) return `${edgeText(loC, unit)} ${label} and above`;
  return `${edgeText(loC, unit)}–${edgeText(hiC, unit)} ${label}`;
}

function lowerFirst(text: string): string {
  return text.replace(/^Below/, 'below');
}

export function clampTemp(value: number, unit: TempUnit): number {
  const { min, max } = TEMP_LIMITS[unit];
  return roundTemp(Math.min(max, Math.max(min, value)), unit);
}

export function stepTemp(value: number, unit: TempUnit, direction: 1 | -1): number {
  return clampTemp(value + TEMP_LIMITS[unit].step * direction, unit);
}

export function stepTog(tog: number, direction: 1 | -1): number {
  const index = TOG_STEPS.indexOf(tog);
  if (index >= 0) return TOG_STEPS[Math.max(0, Math.min(TOG_STEPS.length - 1, index + direction))]!;
  const next = direction > 0 ? TOG_STEPS.find((t) => t > tog) : [...TOG_STEPS].reverse().find((t) => t < tog);
  return next ?? tog;
}

export function parseTypedTemp(text: string, unit: TempUnit): number | null {
  const value = Number.parseFloat(text);
  return Number.isNaN(value) ? null : clampTemp(value, unit);
}

export function parseTypedTog(text: string): number | null {
  const value = Number.parseFloat(text);
  return Number.isNaN(value) ? null : Math.max(MIN_TOG, Math.min(MAX_TOG, Math.round(value * 10) / 10));
}

export function appendKey(typed: string, key: string): string {
  if (key === 'del') return typed.slice(0, -1);
  if (key === '.') return typed.includes('.') ? typed : `${typed || '0'}.`;
  return typed.length < 4 ? typed + key : typed;
}

export function scalePosition(celsius: number): number {
  const bounded = Math.min(SCALE_MAX_C, Math.max(SCALE_MIN_C, celsius));
  return ((bounded - SCALE_MIN_C) / (SCALE_MAX_C - SCALE_MIN_C)) * 100;
}

export const SCALE_TICKS_C: readonly number[] = BAND_EDGES_C;

export type TogHintIcon = 'edge' | 'all-season' | 'brand' | 'clamp';
export interface TogHint {
  icon: TogHintIcon;
  text: string;
}
export interface TogOutside {
  icon: 'sun' | 'snow';
  when: string;
  what: string;
}
export interface TogResult {
  kicker: string;
  head: string;
  sub: string;
  other: string;
  layers: string;
  hints: TogHint[];
  outside: TogOutside[];
  activeTogs: number[];
  marker: { position: number; label: string } | null;
  bracket: { from: number; to: number } | null;
}

function bandFor(celsius: number): TogBand {
  return TOG_BANDS.find((band) => celsius >= band.lo && celsius < band.hi)!;
}

export function togForRoom(temp: number, unit: TempUnit): TogResult {
  const celsius = unit === 'f' ? ((temp - 32) * 5) / 9 : temp;
  const display = formatTemp(temp, unit);
  const other = unit === 'f' ? formatTemp(celsius, 'c') : formatTemp(celsiusToFahrenheit(celsius), 'f');
  const edge = BAND_EDGES_C.find((e) => Math.abs(celsius - e) < 1);
  const hints: TogHint[] = [];
  let head: string;
  let sub: string;
  let layers: string;
  let activeTogs: number[];
  if (edge !== undefined) {
    const lighter = TOG_BANDS.find((band) => band.lo === edge)!;
    const heavier = TOG_BANDS.find((band) => band.hi === edge)!;
    hints.push({
      icon: 'edge',
      text: `${display} sits between two bands. Go ${formatTog(heavier.tog)} if the room cools overnight.`,
    });
    head = `${formatTog(lighter.tog)}–${formatTog(heavier.tog)} TOG`;
    sub = `On the line between ${formatTempRange(heavier.lo, heavier.hi, unit)} and ${lowerFirst(formatTempRange(lighter.lo, lighter.hi, unit))}`;
    layers = heavier.layers;
    activeTogs = [lighter.tog, heavier.tog];
  } else {
    const band = bandFor(celsius);
    head = `${formatTog(band.tog)} TOG`;
    sub = `For a room of ${lowerFirst(formatTempRange(band.lo, band.hi, unit))}`;
    layers = band.layers;
    activeTogs = [band.tog];
  }
  if (celsius >= ALL_SEASON.lo && celsius <= ALL_SEASON.hi) {
    hints.push({ icon: 'all-season', text: 'A 1.5 TOG all-season bag also covers this.' });
  }
  return {
    kicker: 'Use a bag of',
    head,
    sub,
    other: `${display} is ${other}`,
    layers,
    hints,
    outside: [],
    activeTogs,
    marker: { position: Math.max(4, Math.min(96, scalePosition(celsius))), label: display },
    bracket: null,
  };
}

function finite(value: number): number {
  if (value === Infinity) return 27;
  if (value === -Infinity) return SCALE_MIN_C;
  return value;
}

export function roomForTog(tog: number, unit: TempUnit): TogResult {
  const clamped = tog > MAX_CHART_TOG;
  const rating = Math.min(tog, MAX_CHART_TOG);
  const hints: TogHint[] = [];
  const exact = TOG_CHART.find((row) => row.tog === rating);
  let lo: number;
  let hi: number;
  let layers: string;
  let activeTogs: number[];
  let sub: string;
  if (exact) {
    ({ lo, hi } = exact);
    layers = LAYERS[exact.tog as keyof typeof LAYERS];
    activeTogs = [exact.tog];
    sub = exact.tog === 1.5 ? 'An all-season bag across two bands' : 'Room temperature';
  } else {
    const sorted = [...TOG_CHART].sort((a, b) => a.tog - b.tog);
    const lighter = sorted.filter((row) => row.tog < rating).at(-1)!;
    const heavier = sorted.find((row) => row.tog > rating)!;
    const fraction = (rating - lighter.tog) / (heavier.tog - lighter.tog);
    lo = Math.round(finite(lighter.lo) + (finite(heavier.lo) - finite(lighter.lo)) * fraction);
    hi = Math.round(finite(lighter.hi) + (finite(heavier.hi) - finite(lighter.hi)) * fraction);
    layers = LAYERS[lighter.tog as keyof typeof LAYERS];
    activeTogs = [lighter.tog, heavier.tog];
    sub = 'Estimated between two chart ratings';
    hints.push({ icon: 'brand', text: "Brands rate in-between bags differently. Check the label's own guide." });
  }
  if (clamped) {
    hints.push({ icon: 'clamp', text: 'This chart stops at 3.5 TOG, so it is read as a 3.5 TOG bag.' });
  }
  const mainTogs = TOG_BANDS.map((band) => band.tog);
  const lighterMain = mainTogs.filter((t) => t < rating).sort((a, b) => b - a)[0];
  const heavierMain = mainTogs.filter((t) => t > rating).sort((a, b) => a - b)[0];
  const outside: TogOutside[] = [];
  if (hi === Infinity) outside.push({ icon: 'sun', when: 'Very warm:', what: 'just a nappy under it.' });
  else if (lighterMain !== undefined) {
    outside.push({
      icon: 'sun',
      when: `Warmer than ${edgeText(hi, unit)} ${tempUnitLabel(unit)}:`,
      what: `use a ${formatTog(lighterMain)} TOG bag, or fewer layers underneath.`,
    });
  }
  if (lo !== -Infinity && heavierMain !== undefined) {
    outside.push({
      icon: 'snow',
      when: `Cooler than ${edgeText(lo, unit)} ${tempUnitLabel(unit)}:`,
      what: `use a ${formatTog(heavierMain)} TOG bag, or add a layer underneath.`,
    });
  }
  return {
    kicker: `A ${formatTog(tog)} TOG bag suits`,
    head: formatTempRange(lo, hi, unit),
    sub,
    other: formatTempRange(lo, hi, unit === 'f' ? 'c' : 'f'),
    layers,
    hints,
    outside,
    activeTogs,
    marker: null,
    bracket: { from: scalePosition(finite(lo)), to: scalePosition(hi === Infinity ? SCALE_MAX_C : hi) },
  };
}
