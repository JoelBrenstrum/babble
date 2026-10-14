import type { Database } from './database.types';

type PublicSchema = Database['public'];

export type FamilyRole = PublicSchema['Enums']['family_role'];
export type SignupMode = PublicSchema['Enums']['signup_mode'];
export type Units = PublicSchema['Enums']['units'];
export type FamilyRow = PublicSchema['Tables']['families']['Row'];
export type FamilyMemberRow = PublicSchema['Tables']['family_members']['Row'];
export type FormerMemberRow = PublicSchema['Tables']['former_members']['Row'];
export type Author = Pick<FamilyMemberRow, 'user_id' | 'display_name'>;
export type BabyRow = PublicSchema['Tables']['babies']['Row'];
export type FamilySettingsRow = PublicSchema['Tables']['family_settings']['Row'];
export type FamilySettings = Omit<FamilySettingsRow, 'family_id' | 'updated_at'>;
export type BabySettingsRow = PublicSchema['Tables']['baby_settings']['Row'];
export type BabySettings = BabySettingsRow & FamilySettings;
export type BabySettingsUpdate = Omit<PublicSchema['Tables']['baby_settings']['Update'], 'baby_id' | 'updated_at'>;

export interface Family extends FamilyRow {
  members: FamilyMemberRow[];
  former_members: FormerMemberRow[];
  babies: BabyRow[];
}

export interface InstanceSettings {
  signupMode: SignupMode;
  hasUsers: boolean;
}

export interface Invite {
  code: string;
  expiresAt: string;
}

export interface PendingInvite {
  id: string;
  code: string;
  role: FamilyRole;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
}

export interface InvitePreview {
  familyName: string;
  expiresAt: string;
}

export interface NewBaby {
  familyId: string;
  name: string;
  birthDate: string;
  timezone: string;
  dayStartMinutes: number;
  sex?: BabyRow['sex'];
}
