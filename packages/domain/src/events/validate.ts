import { stretchesError } from './awake-periods';
import { MAX_FOOD_LENGTH, MAX_FOODS } from './foods';
import type { EventDraft } from './types';
import { MINUTE_MS } from '../time/constants';

export type DraftErrorKey =
  | 'startedAt'
  | 'endedAt'
  | 'type'
  | 'pooColours'
  | 'dirty'
  | 'amountMl'
  | 'amountLeftMl'
  | 'details'
  | 'weightG'
  | 'lengthMm'
  | 'headCircumferenceMm'
  | 'foods'
  | 'title'
  | 'segments'
  | 'amounts'
  | 'awake';

export type DraftErrors = Partial<Record<DraftErrorKey, string>>;

export const FUTURE_TOLERANCE_MS = 5 * MINUTE_MS;
export const MAX_NAPPY_POO_COLOURS = 2;
export const MAX_VOLUME_ML = 2000;
export const MIN_WEIGHT_G = 200;
export const MAX_WEIGHT_G = 50_000;
export const MIN_LENGTH_MM = 200;
export const MAX_LENGTH_MM = 2000;
export const MIN_HEAD_CIRCUMFERENCE_MM = 150;
export const MAX_HEAD_CIRCUMFERENCE_MM = 700;

export function validateDraft(draft: EventDraft, now: Date): DraftErrors {
  const errors: DraftErrors = {};
  const start = Date.parse(draft.startedAt);
  const end = draft.endedAt ? Date.parse(draft.endedAt) : null;

  if (Number.isNaN(start)) errors.startedAt = 'Choose a start time.';
  else if (start > now.getTime() + FUTURE_TOLERANCE_MS) errors.startedAt = "That's in the future.";
  if (end !== null && !Number.isNaN(start) && end < start) errors.endedAt = 'The end must be after the start.';
  if (end !== null && end > now.getTime() + FUTURE_TOLERANCE_MS) errors.endedAt = "That's in the future.";

  switch (draft.type) {
    case 'nappy': {
      const { dirty, pooColours, pooSize, pooTextures, typePending } = draft.details;
      if (typePending) errors.type = 'Pick wet, dirty, both or dry.';
      if (pooColours.length > MAX_NAPPY_POO_COLOURS) errors.pooColours = 'Pick up to two colours.';
      if (!dirty && (pooColours.length > 0 || pooSize || pooTextures.length > 0)) {
        errors.dirty = 'Poo details need a dirty nappy.';
      }
      break;
    }
    case 'bottle': {
      const { amountMl, amountLeftMl } = draft.details;
      if (amountMl !== null && (amountMl < 0 || amountMl > MAX_VOLUME_ML)) {
        errors.amountMl = `Enter an amount up to ${MAX_VOLUME_ML} ml.`;
      }
      if (amountLeftMl !== null && amountMl !== null && amountLeftMl > amountMl) {
        errors.amountLeftMl = "Left over can't be more than the bottle.";
      }
      break;
    }
    case 'growth': {
      const { weightG, lengthMm, headCircumferenceMm } = draft.details;
      if (weightG === null && lengthMm === null && headCircumferenceMm === null) {
        errors.details = 'Enter at least one measurement.';
      }
      if (weightG !== null && (weightG < MIN_WEIGHT_G || weightG > MAX_WEIGHT_G))
        errors.weightG = 'That weight looks wrong.';
      if (lengthMm !== null && (lengthMm < MIN_LENGTH_MM || lengthMm > MAX_LENGTH_MM))
        errors.lengthMm = 'That length looks wrong.';
      if (
        headCircumferenceMm !== null &&
        (headCircumferenceMm < MIN_HEAD_CIRCUMFERENCE_MM || headCircumferenceMm > MAX_HEAD_CIRCUMFERENCE_MM)
      ) {
        errors.headCircumferenceMm = 'That head size looks wrong.';
      }
      break;
    }
    case 'solids': {
      const { foods } = draft.details;
      if (foods.length === 0) errors.foods = 'Add at least one food.';
      else if (foods.length > MAX_FOODS) errors.foods = `Add up to ${MAX_FOODS} foods.`;
      else if (foods.some((food) => !food.trim() || food.length > MAX_FOOD_LENGTH)) {
        errors.foods = `Keep each food under ${MAX_FOOD_LENGTH} characters.`;
      }
      break;
    }
    case 'custom':
      if (!draft.details.title.trim()) errors.title = 'Give it a title.';
      break;
    case 'breast_feed':
    case 'pump':
      for (const segment of draft.segments) {
        if (segment.endedAt && Date.parse(segment.endedAt) < Date.parse(segment.startedAt)) {
          errors.segments = 'Each side must end after it starts.';
        }
      }
      if (draft.type === 'pump') {
        const { leftMl, rightMl, totalMl } = draft.details;
        if ([leftMl, rightMl, totalMl].some((value) => value !== null && (value < 0 || value > MAX_VOLUME_ML))) {
          errors.amounts = `Enter amounts up to ${MAX_VOLUME_ML} ml.`;
        }
      }
      break;
    case 'sleep': {
      const awake = draft.endedAt ? stretchesError(draft.segments, draft.startedAt, draft.endedAt) : null;
      if (awake) errors.awake = awake;
      break;
    }
  }

  return errors;
}

export function needsChoice(draft: EventDraft): boolean {
  return draft.type === 'nappy' && draft.details.typePending === true;
}

export function hasErrors(errors: DraftErrors): boolean {
  return Object.keys(errors).length > 0;
}
