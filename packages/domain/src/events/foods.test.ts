import { describe, expect, it } from 'vitest';
import {
  addFood,
  foodSuggestions,
  hasFood,
  newFoods,
  normaliseFood,
  recentFoods,
  STARTER_FOODS,
  toggleFood,
} from './foods';
import { makeEvent } from './test-events';

const solids = (id: string, startedAt: string, foods: string[], deletedAt: string | null = null) =>
  makeEvent('solids', {
    id,
    startedAt,
    endedAt: startedAt,
    deletedAt,
    details: { foods, amount: null, reaction: null },
  });

describe('foods', () => {
  it('tidies spacing in a food name', () => {
    expect(normaliseFood('  sweet   potato ')).toBe('sweet potato');
  });

  it('adds a food once, ignoring case and blanks', () => {
    expect(addFood(['Avocado'], ' banana ')).toEqual(['Avocado', 'banana']);
    expect(addFood(['Avocado'], 'avocado')).toEqual(['Avocado']);
    expect(addFood(['Avocado'], '   ')).toEqual(['Avocado']);
  });

  it('caps the name length and the number of foods', () => {
    expect(addFood([], 'a'.repeat(50))[0]).toHaveLength(40);
    const twenty = Array.from({ length: 20 }, (_, index) => `Food ${index}`);
    expect(addFood(twenty, 'One more')).toHaveLength(20);
  });

  it('toggles a food on and off', () => {
    expect(toggleFood(['Pear'], 'Apple')).toEqual(['Pear', 'Apple']);
    expect(toggleFood(['Pear', 'Apple'], 'apple')).toEqual(['Pear']);
    expect(hasFood(['Pear'], 'PEAR')).toBe(true);
  });

  it('lists recent foods, newest first, without repeats or deleted meals', () => {
    const events = [
      solids('a', '2026-10-01T09:00:00Z', ['Avocado', 'Banana']),
      solids('b', '2026-10-03T09:00:00Z', ['banana', 'Pear']),
      solids('c', '2026-10-04T09:00:00Z', ['Kumara'], '2026-10-04T10:00:00Z'),
      makeEvent('nappy'),
    ];
    expect(recentFoods(events)).toEqual(['banana', 'Pear', 'Avocado']);
    expect(recentFoods(events, 2)).toEqual(['banana', 'Pear']);
  });

  it('finds foods tried for the first time', () => {
    const first = solids('a', '2026-10-01T09:00:00Z', ['Avocado']);
    const second = solids('b', '2026-10-03T09:00:00Z', ['avocado', 'Egg']);
    const meal = (event: typeof first) => ({ id: event.id, startedAt: event.startedAt, foods: event.details.foods });
    expect(newFoods(meal(second), [first, second])).toEqual(['Egg']);
    expect(newFoods(meal(first), [first, second])).toEqual(['Avocado']);
    expect(newFoods({ startedAt: '2026-10-05T09:00:00Z', foods: ['Avocado', 'Rice'] }, [first, second])).toEqual([
      'Rice',
    ]);
  });

  it('suggests recent foods, then common first foods, keeping anything already picked', () => {
    expect(foodSuggestions([], [])).toEqual(STARTER_FOODS);
    expect(foodSuggestions(['Egg', 'Mango'], [], 4)).toEqual(['Egg', 'Mango', 'Avocado', 'Banana']);
    expect(foodSuggestions(['avocado'], ['Tofu'], 2)).toEqual(['avocado', 'Banana', 'Tofu']);
  });
});
