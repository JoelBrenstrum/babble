// Hand-written to match packages/db migrations until `pnpm --filter @babble/db gen:types` can run against a local database.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      families: {
        Row: { id: string; name: string; plan: string; created_at: string };
        Insert: { id?: string; name: string; plan?: string; created_at?: string };
        Update: { id?: string; name?: string; plan?: string; created_at?: string };
        Relationships: [];
      };
      family_members: {
        Row: {
          family_id: string;
          user_id: string;
          role: Database['public']['Enums']['family_role'];
          display_name: string;
          created_at: string;
        };
        Insert: {
          family_id: string;
          user_id: string;
          role?: Database['public']['Enums']['family_role'];
          display_name: string;
          created_at?: string;
        };
        Update: {
          family_id?: string;
          user_id?: string;
          role?: Database['public']['Enums']['family_role'];
          display_name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'family_members_family_id_fkey';
            columns: ['family_id'];
            isOneToOne: false;
            referencedRelation: 'families';
            referencedColumns: ['id'];
          },
        ];
      };
      babies: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          birth_date: string;
          timezone: string;
          day_start_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          name: string;
          birth_date: string;
          timezone: string;
          day_start_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          name?: string;
          birth_date?: string;
          timezone?: string;
          day_start_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'babies_family_id_fkey';
            columns: ['family_id'];
            isOneToOne: false;
            referencedRelation: 'families';
            referencedColumns: ['id'];
          },
        ];
      };
      baby_settings: {
        Row: {
          baby_id: string;
          feed_reminder_interval_min: number | null;
          feed_reminder_enabled: boolean;
          downtime_merge_threshold_sec: number;
          auto_end_paused_session_min: number;
          night_start_minutes: number;
          night_end_minutes: number;
          units: Database['public']['Enums']['units'];
          updated_at: string;
        };
        Insert: {
          baby_id: string;
          feed_reminder_interval_min?: number | null;
          feed_reminder_enabled?: boolean;
          downtime_merge_threshold_sec?: number;
          auto_end_paused_session_min?: number;
          night_start_minutes?: number;
          night_end_minutes?: number;
          units?: Database['public']['Enums']['units'];
          updated_at?: string;
        };
        Update: {
          baby_id?: string;
          feed_reminder_interval_min?: number | null;
          feed_reminder_enabled?: boolean;
          downtime_merge_threshold_sec?: number;
          auto_end_paused_session_min?: number;
          night_start_minutes?: number;
          night_end_minutes?: number;
          units?: Database['public']['Enums']['units'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'baby_settings_baby_id_fkey';
            columns: ['baby_id'];
            isOneToOne: true;
            referencedRelation: 'babies';
            referencedColumns: ['id'];
          },
        ];
      };
      family_invites: {
        Row: {
          id: string;
          family_id: string;
          code: string;
          role: Database['public']['Enums']['family_role'];
          created_by: string;
          created_at: string;
          expires_at: string;
          used_by: string | null;
          used_at: string | null;
        };
        Insert: {
          id?: string;
          family_id: string;
          code: string;
          role?: Database['public']['Enums']['family_role'];
          created_by: string;
          created_at?: string;
          expires_at?: string;
          used_by?: string | null;
          used_at?: string | null;
        };
        Update: {
          id?: string;
          family_id?: string;
          code?: string;
          role?: Database['public']['Enums']['family_role'];
          created_by?: string;
          created_at?: string;
          expires_at?: string;
          used_by?: string | null;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'family_invites_family_id_fkey';
            columns: ['family_id'];
            isOneToOne: false;
            referencedRelation: 'families';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      accept_invite: { Args: { invite_code: string; display_name: string }; Returns: string };
      check_invite: { Args: { invite_code: string }; Returns: { family_name: string; expires_at: string }[] };
      create_family: { Args: { family_name: string; display_name: string }; Returns: string };
      create_invite: {
        Args: { target_family_id: string; invite_role?: Database['public']['Enums']['family_role'] };
        Returns: { code: string; expires_at: string }[];
      };
      delete_my_account: { Args: Record<PropertyKey, never>; Returns: undefined };
      get_instance_settings: {
        Args: Record<PropertyKey, never>;
        Returns: { signup_mode: Database['public']['Enums']['signup_mode']; has_users: boolean }[];
      };
      is_valid_timezone: { Args: { tz: string }; Returns: boolean };
    };
    Enums: {
      family_role: 'owner' | 'caregiver' | 'viewer';
      signup_mode: 'open' | 'invite_only';
      units: 'metric' | 'imperial';
    };
    CompositeTypes: { [_ in never]: never };
  };
};
