import type { BabyEvent } from './types';

export const MAX_FOODS = 20;
export const MAX_FOOD_LENGTH = 40;

export function normaliseFood(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function sameFood(a: string, b: string): boolean {
  return a.toLocaleLowerCase() === b.toLocaleLowerCase();
}

export function addFood(foods: readonly string[], text: string): string[] {
  const food = normaliseFood(text).slice(0, MAX_FOOD_LENGTH);
  if (!food || foods.length >= MAX_FOODS || foods.some((existing) => sameFood(existing, food))) return [...foods];
  return [...foods, food];
}

export function toggleFood(foods: readonly string[], food: string): string[] {
  return foods.some((existing) => sameFood(existing, food))
    ? foods.filter((existing) => !sameFood(existing, food))
    : addFood(foods, food);
}

export function hasFood(foods: readonly string[], food: string): boolean {
  return foods.some((existing) => sameFood(existing, food));
}

export function recentFoods(events: readonly BabyEvent[], limit = 12): string[] {
  const foods: string[] = [];
  const latestFirst = [...events]
    .filter((event) => event.type === 'solids' && !event.deletedAt)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  for (const event of latestFirst) {
    if (event.type !== 'solids') continue;
    for (const food of event.details.foods) {
      if (foods.length >= limit) return foods;
      if (!hasFood(foods, food)) foods.push(food);
    }
  }
  return foods;
}

export function newFoods(
  meal: { id?: string; startedAt: string; foods: readonly string[] },
  history: readonly BabyEvent[],
): string[] {
  const before = history.filter(
    (other) =>
      other.type === 'solids' &&
      !other.deletedAt &&
      other.id !== meal.id &&
      Date.parse(other.startedAt) < Date.parse(meal.startedAt),
  );
  return meal.foods.filter(
    (food) => !before.some((other) => other.type === 'solids' && hasFood(other.details.foods, food)),
  );
}

export const STARTER_FOODS = ['Avocado', 'Banana', 'Kūmara', 'Pumpkin', 'Apple', 'Pear', 'Carrot', 'Egg', 'Yoghurt'];

export function foodSuggestions(recent: readonly string[], selected: readonly string[], limit = 12): string[] {
  const suggestions = [...recent, ...STARTER_FOODS].reduce<string[]>(
    (list, food) => (list.length < limit && !hasFood(list, food) ? [...list, food] : list),
    [],
  );
  return [...suggestions, ...selected.filter((food) => !hasFood(suggestions, food))];
}
