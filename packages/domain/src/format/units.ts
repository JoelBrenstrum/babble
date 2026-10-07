import type { Units } from '../events/types';

const GRAMS_PER_POUND = 453.59237;
const MM_PER_INCH = 25.4;
const ML_PER_OUNCE = 29.5735;

export function formatWeight(grams: number, units: Units): string {
  if (units === 'metric') return `${(grams / 1000).toFixed(2)} kg`;
  const totalOunces = Math.round((grams / GRAMS_PER_POUND) * 16);
  return `${Math.floor(totalOunces / 16)} lb ${totalOunces % 16} oz`;
}

export function formatLength(mm: number, units: Units): string {
  if (units === 'metric') return `${trimZero((mm / 10).toFixed(1))} cm`;
  return `${trimZero((mm / MM_PER_INCH).toFixed(1))} in`;
}

export function formatVolume(ml: number, units: Units): string {
  if (units === 'metric') return `${Math.round(ml)} ml`;
  return `${trimZero((ml / ML_PER_OUNCE).toFixed(1))} oz`;
}

export function volumeToMl(value: number, units: Units): number {
  return Math.round(units === 'metric' ? value : value * ML_PER_OUNCE);
}

export function weightToGrams(value: number, units: Units): number {
  return Math.round(units === 'metric' ? value * 1000 : value * GRAMS_PER_POUND);
}

export function lengthToMm(value: number, units: Units): number {
  return Math.round(units === 'metric' ? value * 10 : value * MM_PER_INCH);
}

function trimZero(value: string): string {
  return value.replace(/\.0$/, '');
}
