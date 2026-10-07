import type { EventDraft } from './types';

export type DraftErrors = Partial<Record<string, string>>;

const FUTURE_TOLERANCE_MS = 5 * 60_000;

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
      const { dirty, pooColours, pooSize, pooTextures } = draft.details;
      if (pooColours.length > 2) errors.pooColours = 'Pick up to two colours.';
      if (!dirty && (pooColours.length > 0 || pooSize || pooTextures.length > 0)) {
        errors.dirty = 'Poo details need a dirty nappy.';
      }
      break;
    }
    case 'bottle': {
      const { amountMl, amountLeftMl } = draft.details;
      if (amountMl !== null && (amountMl < 0 || amountMl > 2000)) errors.amountMl = 'Enter an amount up to 2000 ml.';
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
      if (weightG !== null && (weightG < 200 || weightG > 50_000)) errors.weightG = 'That weight looks wrong.';
      if (lengthMm !== null && (lengthMm < 200 || lengthMm > 2000)) errors.lengthMm = 'That length looks wrong.';
      if (headCircumferenceMm !== null && (headCircumferenceMm < 150 || headCircumferenceMm > 700)) {
        errors.headCircumferenceMm = 'That head size looks wrong.';
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
        if ([leftMl, rightMl, totalMl].some((value) => value !== null && (value < 0 || value > 2000))) {
          errors.amounts = 'Enter amounts up to 2000 ml.';
        }
      }
      break;
    case 'sleep':
      break;
  }

  return errors;
}

export function hasErrors(errors: DraftErrors): boolean {
  return Object.keys(errors).length > 0;
}
