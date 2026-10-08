import type { BabyEvent } from '@babble/domain';
import type { BabyRow, Family, FamilyMemberRow, InstanceSettings } from './types';

export const sampleBaby: BabyRow = {
  id: 'baby-olivia',
  family_id: 'family-smith',
  name: 'Olivia',
  birth_date: '2026-09-26',
  timezone: 'Pacific/Auckland',
  day_start_minutes: 420,
  sex: 'female',
  created_at: '2026-09-26T09:00:00Z',
  updated_at: '2026-09-26T09:00:00Z',
};

export const sampleSibling: BabyRow = {
  ...sampleBaby,
  id: 'baby-jacob',
  name: 'Jacob',
  birth_date: '2025-08-03',
  sex: 'male',
};

export const sampleMembers: FamilyMemberRow[] = [
  {
    family_id: 'family-smith',
    user_id: 'user-john',
    role: 'owner',
    display_name: 'John',
    created_at: '2026-09-26T09:00:00Z',
  },
  {
    family_id: 'family-smith',
    user_id: 'user-jane',
    role: 'caregiver',
    display_name: 'Jane',
    created_at: '2026-09-26T09:05:00Z',
  },
];

export const sampleFamily: Family = {
  id: 'family-smith',
  name: 'The Smiths',
  plan: 'free',
  created_at: '2026-09-26T09:00:00Z',
  members: sampleMembers,
  babies: [sampleBaby, sampleSibling],
};

export const openSignup: InstanceSettings = { signupMode: 'open', hasUsers: true };
export const inviteOnlySignup: InstanceSettings = { signupMode: 'invite_only', hasUsers: true };

const minutesAgo = (now: Date, minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

function meta(id: string, createdBy = 'user-jane') {
  return {
    id,
    babyId: sampleBaby.id,
    createdBy,
    createdAt: '2026-10-06T00:00:00Z',
    updatedAt: '2026-10-06T00:00:00Z',
    deletedAt: null,
    source: 'manual' as const,
    sessionState: null,
    endedBy: null,
    endRecordedAt: null,
    notes: null,
  };
}

export function sampleRunningFeed(now: Date): BabyEvent {
  return {
    ...meta('event-running-feed'),
    type: 'breast_feed',
    sessionState: 'running',
    startedAt: minutesAgo(now, 26),
    endedAt: null,
    segments: [
      { side: 'left', startedAt: minutesAgo(now, 26), endedAt: minutesAgo(now, 15.5) },
      { side: 'right', startedAt: minutesAgo(now, 12.4), endedAt: null },
    ],
  };
}

export function sampleRunningSleep(now: Date): BabyEvent {
  return {
    ...meta('event-running-sleep', 'user-john'),
    type: 'sleep',
    segments: [],
    startedAt: minutesAgo(now, 72),
    endedAt: null,
    details: { locations: ['bassinet'], fallAsleep: null, startMoods: [], endMoods: [], wokenByCarer: false },
  };
}

export function sampleEvents(now: Date): BabyEvent[] {
  return [
    {
      ...meta('event-feed-1'),
      type: 'breast_feed',
      startedAt: minutesAgo(now, 160),
      endedAt: minutesAgo(now, 134),
      segments: [
        { side: 'left', startedAt: minutesAgo(now, 160), endedAt: minutesAgo(now, 150) },
        { side: 'right', startedAt: minutesAgo(now, 146), endedAt: minutesAgo(now, 134) },
      ],
    },
    {
      ...meta('event-sleep-1', 'user-john'),
      type: 'sleep',
      segments: [],
      startedAt: minutesAgo(now, 240),
      endedAt: minutesAgo(now, 140),
      details: {
        locations: ['cot'],
        fallAsleep: 'under_10_min',
        startMoods: ['happy'],
        endMoods: [],
        wokenByCarer: false,
      },
    },
    {
      ...meta('event-nappy-1'),
      type: 'nappy',
      startedAt: minutesAgo(now, 48),
      endedAt: minutesAgo(now, 48),
      details: {
        wet: true,
        dirty: true,
        wetSize: 'medium',
        pooSize: 'medium',
        pooColours: ['mustard', 'green'],
        pooTextures: ['seedy'],
        rash: false,
      },
    },
    {
      ...meta('event-bottle-1', 'user-john'),
      type: 'bottle',
      startedAt: minutesAgo(now, 300),
      endedAt: minutesAgo(now, 288),
      details: { content: 'formula', amountMl: 90, amountLeftMl: null },
    },
    {
      ...meta('event-pump-1'),
      type: 'pump',
      startedAt: minutesAgo(now, 362),
      endedAt: minutesAgo(now, 344),
      segments: [],
      details: { leftMl: 50, rightMl: 40, totalMl: null },
    },
    {
      ...meta('event-growth-1'),
      type: 'growth',
      startedAt: minutesAgo(now, 60 * 24 * 4),
      endedAt: minutesAgo(now, 60 * 24 * 4),
      details: { weightG: 3420, lengthMm: 510, headCircumferenceMm: 355 },
    },
    {
      ...meta('event-custom-1', 'user-john'),
      type: 'custom',
      startedAt: minutesAgo(now, 60 * 20),
      endedAt: minutesAgo(now, 60 * 20 - 15),
      details: { title: 'Bath', description: '' },
    },
  ];
}
