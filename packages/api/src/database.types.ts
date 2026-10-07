export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      babies: {
        Row: {
          birth_date: string;
          created_at: string;
          day_start_minutes: number;
          family_id: string;
          id: string;
          name: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          birth_date: string;
          created_at?: string;
          day_start_minutes?: number;
          family_id: string;
          id?: string;
          name: string;
          timezone: string;
          updated_at?: string;
        };
        Update: {
          birth_date?: string;
          created_at?: string;
          day_start_minutes?: number;
          family_id?: string;
          id?: string;
          name?: string;
          timezone?: string;
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
          auto_end_paused_session_min: number;
          baby_id: string;
          downtime_merge_threshold_sec: number;
          feed_reminder_enabled: boolean;
          feed_reminder_interval_min: number | null;
          night_end_minutes: number;
          night_start_minutes: number;
          units: Database['public']['Enums']['units'];
          updated_at: string;
        };
        Insert: {
          auto_end_paused_session_min?: number;
          baby_id: string;
          downtime_merge_threshold_sec?: number;
          feed_reminder_enabled?: boolean;
          feed_reminder_interval_min?: number | null;
          night_end_minutes?: number;
          night_start_minutes?: number;
          units?: Database['public']['Enums']['units'];
          updated_at?: string;
        };
        Update: {
          auto_end_paused_session_min?: number;
          baby_id?: string;
          downtime_merge_threshold_sec?: number;
          feed_reminder_enabled?: boolean;
          feed_reminder_interval_min?: number | null;
          night_end_minutes?: number;
          night_start_minutes?: number;
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
      families: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          plan: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          plan?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          plan?: string;
        };
        Relationships: [];
      };
      family_invites: {
        Row: {
          code: string;
          created_at: string;
          created_by: string;
          expires_at: string;
          family_id: string;
          id: string;
          role: Database['public']['Enums']['family_role'];
          used_at: string | null;
          used_by: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by: string;
          expires_at?: string;
          family_id: string;
          id?: string;
          role?: Database['public']['Enums']['family_role'];
          used_at?: string | null;
          used_by?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          family_id?: string;
          id?: string;
          role?: Database['public']['Enums']['family_role'];
          used_at?: string | null;
          used_by?: string | null;
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
      family_members: {
        Row: {
          created_at: string;
          display_name: string;
          family_id: string;
          role: Database['public']['Enums']['family_role'];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          family_id: string;
          role?: Database['public']['Enums']['family_role'];
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          family_id?: string;
          role?: Database['public']['Enums']['family_role'];
          user_id?: string;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invite: { Args: { display_name: string; invite_code: string }; Returns: string };
      check_invite: {
        Args: { invite_code: string };
        Returns: {
          expires_at: string;
          family_name: string;
        }[];
      };
      create_family: { Args: { display_name: string; family_name: string }; Returns: string };
      create_invite: {
        Args: { invite_role?: Database['public']['Enums']['family_role']; target_family_id: string };
        Returns: {
          code: string;
          expires_at: string;
        }[];
      };
      delete_my_account: { Args: Record<PropertyKey, never>; Returns: undefined };
      get_instance_settings: {
        Args: Record<PropertyKey, never>;
        Returns: {
          has_users: boolean;
          signup_mode: Database['public']['Enums']['signup_mode'];
        }[];
      };
      is_valid_timezone: { Args: { tz: string }; Returns: boolean };
    };
    Enums: {
      family_role: 'owner' | 'caregiver' | 'viewer';
      signup_mode: 'open' | 'invite_only';
      units: 'metric' | 'imperial';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      family_role: ['owner', 'caregiver', 'viewer'],
      signup_mode: ['open', 'invite_only'],
      units: ['metric', 'imperial'],
    },
  },
} as const;
