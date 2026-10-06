import type { BabyRow, Family, FamilyMemberRow, InstanceSettings } from './types';

export const sampleBaby: BabyRow = {
  id: 'baby-adaline',
  family_id: 'family-brenstrum',
  name: 'Adaline',
  birth_date: '2026-09-26',
  timezone: 'Pacific/Auckland',
  day_start_minutes: 420,
  created_at: '2026-09-26T09:00:00Z',
  updated_at: '2026-09-26T09:00:00Z',
};

export const sampleMembers: FamilyMemberRow[] = [
  {
    family_id: 'family-brenstrum',
    user_id: 'user-joel',
    role: 'owner',
    display_name: 'Joel',
    created_at: '2026-09-26T09:00:00Z',
  },
  {
    family_id: 'family-brenstrum',
    user_id: 'user-jaimi',
    role: 'caregiver',
    display_name: 'Jaimi',
    created_at: '2026-09-26T09:05:00Z',
  },
];

export const sampleFamily: Family = {
  id: 'family-brenstrum',
  name: 'The Brenstrums',
  plan: 'free',
  created_at: '2026-09-26T09:00:00Z',
  members: sampleMembers,
  babies: [sampleBaby],
};

export const openSignup: InstanceSettings = { signupMode: 'open', hasUsers: true };
export const inviteOnlySignup: InstanceSettings = { signupMode: 'invite_only', hasUsers: true };
