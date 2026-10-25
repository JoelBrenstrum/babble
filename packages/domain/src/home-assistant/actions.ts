import { emptyDraft } from '../events/drafts';
import { SIZES } from '../events/labels';
import { otherSide, segmentTotals } from '../events/segments';
import type { SessionAction } from '../events/session-actions';
import type {
  BabyEvent,
  BottleContent,
  EventDraft,
  PooColour,
  PooTexture,
  Side,
  Size,
  SolidsAmount,
  SolidsReaction,
} from '../events/types';
import { hasErrors, validateDraft } from '../events/validate';
import { MINUTE_MS } from '../time/constants';

export type ActionStep =
  | { kind: 'start'; type: 'sleep' | 'breast_feed'; side: Side; startAt?: string }
  | { kind: 'session'; eventId: string; action: SessionAction }
  | { kind: 'delete'; eventId: string }
  | { kind: 'save'; draft: EventDraft };

export type ActionPlan = { ok: true; step: ActionStep } | { ok: false; status: 400 | 404 | 409; error: string };

const SIDES = ['left', 'right'] as const;
const CONTENTS = ['breast_milk', 'formula', 'mixed', 'other'] as const;
const COLOURS = ['yellow', 'mustard', 'green', 'dark_green', 'brown', 'orange', 'black', 'red', 'white_grey'] as const;
const TEXTURES = ['runny', 'loose', 'seedy', 'pasty', 'formed', 'mucousy', 'solid', 'pebbles', 'diarrhea'] as const;
const AMOUNTS = ['taste', 'some', 'lots'] as const;
const REACTIONS = ['loved', 'liked', 'unsure', 'disliked'] as const;

class BadInput extends Error {}

type Body = Record<string, unknown>;

function optional<T>(body: Body, key: string, read: (value: unknown) => T): T | undefined {
  const value = body[key];
  return value === undefined || value === null || value === '' ? undefined : read(value);
}

const fail = (message: string): never => {
  throw new BadInput(message);
};

const time = (key: string) => (value: unknown) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value))
    ? new Date(value).toISOString()
    : fail(`${key} must be a date and time.`);

const number = (key: string) => (value: unknown) => {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : fail(`${key} must be a number.`);
};

const flag = (key: string) => (value: unknown) =>
  typeof value === 'boolean' ? value : fail(`${key} must be true or false.`);

const text = (key: string) => (value: unknown) => (typeof value === 'string' ? value : fail(`${key} must be text.`));

const oneOf =
  <T extends string>(key: string, values: readonly T[]) =>
  (value: unknown): T =>
    values.includes(value as T) ? (value as T) : fail(`${key} must be one of ${values.join(', ')}.`);

const listOf =
  <T>(key: string, item: (value: unknown) => T) =>
  (value: unknown): T[] => {
    const items = typeof value === 'string' ? value.split(',').map((part) => part.trim()) : value;
    return Array.isArray(items) ? items.filter((part) => part !== '').map(item) : fail(`${key} must be a list.`);
  };

const gramsFromKg = (kg: number | undefined) => (kg === undefined ? null : Math.round(kg * 1000));
const mmFromCm = (cm: number | undefined) => (cm === undefined ? null : Math.round(cm * 10));

function running(events: readonly BabyEvent[], type: 'sleep' | 'breast_feed'): BabyEvent | undefined {
  return events.find((event) => event.type === type && event.endedAt === null && !event.deletedAt);
}

function onRunning(
  events: readonly BabyEvent[],
  type: 'sleep' | 'breast_feed',
  make: (event: BabyEvent) => ActionStep,
): ActionPlan {
  const event = running(events, type);
  if (!event)
    return { ok: false, status: 409, error: type === 'sleep' ? 'No sleep is running.' : 'No feed is running.' };
  return { ok: true, step: make(event) };
}

function save(draft: EventDraft, now: Date): ActionPlan {
  const errors = validateDraft(draft, now);
  return hasErrors(errors)
    ? { ok: false, status: 400, error: Object.values(errors).join(' ') }
    : { ok: true, step: { kind: 'save', draft } };
}

function at(body: Body, now: Date): string {
  return optional(body, 'started_at', time('started_at')) ?? now.toISOString();
}

function plan(name: string, body: Body, events: readonly BabyEvent[], now: Date): ActionPlan {
  switch (name) {
    case 'start_sleep':
      return {
        ok: true,
        step: { kind: 'start', type: 'sleep', side: 'left', startAt: optional(body, 'started_at', time('started_at')) },
      };
    case 'pause_sleep':
      return onRunning(events, 'sleep', (event) => ({ kind: 'session', eventId: event.id, action: { kind: 'pause' } }));
    case 'resume_sleep':
      return onRunning(events, 'sleep', (event) => ({
        kind: 'session',
        eventId: event.id,
        action: { kind: 'resume' },
      }));
    case 'end_sleep':
    case 'end_nursing': {
      const endAt = optional(body, 'ended_at', time('ended_at'));
      return onRunning(events, name === 'end_sleep' ? 'sleep' : 'breast_feed', (event) => ({
        kind: 'session',
        eventId: event.id,
        action: { kind: 'end', at: endAt },
      }));
    }
    case 'cancel_sleep':
      return onRunning(events, 'sleep', (event) => ({ kind: 'delete', eventId: event.id }));
    case 'start_nursing':
      return {
        ok: true,
        step: {
          kind: 'start',
          type: 'breast_feed',
          side: optional(body, 'side', oneOf('side', SIDES)) ?? 'left',
          startAt: optional(body, 'started_at', time('started_at')),
        },
      };
    case 'switch_nursing_side':
      return onRunning(events, 'breast_feed', (event) => {
        const totals = segmentTotals(event.type === 'breast_feed' ? event.segments : [], now);
        const side = totals.openSide ?? totals.lastSide;
        return {
          kind: 'session',
          eventId: event.id,
          action: { kind: 'switch', side: side ? otherSide(side) : 'left' },
        };
      });
    case 'pause_nursing':
      return onRunning(events, 'breast_feed', (event) => ({
        kind: 'session',
        eventId: event.id,
        action: { kind: 'pause' },
      }));
    case 'resume_nursing': {
      const side = optional(body, 'side', oneOf('side', SIDES));
      return onRunning(events, 'breast_feed', (event) => ({
        kind: 'session',
        eventId: event.id,
        action: { kind: 'resume', side },
      }));
    }
    case 'cancel_nursing':
      return onRunning(events, 'breast_feed', (event) => ({ kind: 'delete', eventId: event.id }));
    case 'log_bottle': {
      const startedAt = at(body, now);
      return save(
        {
          ...emptyDraft('bottle', now),
          startedAt,
          endedAt: startedAt,
          details: {
            content: optional(body, 'content', oneOf<BottleContent>('content', CONTENTS)) ?? 'breast_milk',
            amountMl: number('amount_ml')(body.amount_ml),
            amountLeftMl: optional(body, 'left_over_ml', number('left_over_ml')) ?? null,
          },
        },
        now,
      );
    }
    case 'log_nappy': {
      const startedAt = at(body, now);
      return save(
        {
          ...emptyDraft('nappy', now),
          startedAt,
          endedAt: startedAt,
          notes: optional(body, 'notes', text('notes')) ?? null,
          details: {
            wet: optional(body, 'wet', flag('wet')) ?? false,
            dirty: optional(body, 'dirty', flag('dirty')) ?? false,
            wetSize: optional(body, 'wet_size', oneOf<Size>('wet_size', SIZES)) ?? null,
            pooSize: optional(body, 'poo_size', oneOf<Size>('poo_size', SIZES)) ?? null,
            pooColours: optional(body, 'colours', listOf('colours', oneOf<PooColour>('colours', COLOURS))) ?? [],
            pooTextures: optional(body, 'textures', listOf('textures', oneOf<PooTexture>('textures', TEXTURES))) ?? [],
            rash: optional(body, 'rash', flag('rash')) ?? false,
          },
        },
        now,
      );
    }
    case 'log_solids': {
      const startedAt = at(body, now);
      return save(
        {
          ...emptyDraft('solids', now),
          startedAt,
          endedAt: startedAt,
          notes: optional(body, 'notes', text('notes')) ?? null,
          details: {
            foods: optional(body, 'foods', listOf('foods', text('foods'))) ?? [],
            amount: optional(body, 'amount', oneOf<SolidsAmount>('amount', AMOUNTS)) ?? null,
            reaction: optional(body, 'reaction', oneOf<SolidsReaction>('reaction', REACTIONS)) ?? null,
          },
        },
        now,
      );
    }
    case 'log_pump': {
      const endedAt = optional(body, 'ended_at', time('ended_at')) ?? now.toISOString();
      const minutes = optional(body, 'duration_min', number('duration_min')) ?? 0;
      return save(
        {
          ...emptyDraft('pump', now),
          startedAt: new Date(Date.parse(endedAt) - minutes * MINUTE_MS).toISOString(),
          endedAt,
          details: {
            leftMl: optional(body, 'left_ml', number('left_ml')) ?? null,
            rightMl: optional(body, 'right_ml', number('right_ml')) ?? null,
            totalMl: optional(body, 'total_ml', number('total_ml')) ?? null,
          },
        },
        now,
      );
    }
    case 'log_growth': {
      const startedAt = at(body, now);
      return save(
        {
          ...emptyDraft('growth', now),
          startedAt,
          endedAt: startedAt,
          details: {
            weightG: gramsFromKg(optional(body, 'weight_kg', number('weight_kg'))),
            lengthMm: mmFromCm(optional(body, 'length_cm', number('length_cm'))),
            headCircumferenceMm: mmFromCm(optional(body, 'head_cm', number('head_cm'))),
          },
        },
        now,
      );
    }
    default:
      return { ok: false, status: 404, error: `Unknown action ${name}.` };
  }
}

export function planHomeAssistantAction(
  name: string,
  body: unknown,
  events: readonly BabyEvent[],
  now: Date,
): ActionPlan {
  const fields = body && typeof body === 'object' && !Array.isArray(body) ? (body as Body) : {};
  try {
    return plan(name, fields, events, now);
  } catch (error) {
    if (error instanceof BadInput) return { ok: false, status: 400, error: error.message };
    throw error;
  }
}
