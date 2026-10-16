export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      babies: {
        Row: {
          birth_date: string;
          created_at: string;
          day_start_minutes: number;
          day_starts_at_night_end: boolean;
          family_id: string;
          id: string;
          name: string;
          sex: Database['public']['Enums']['baby_sex'] | null;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          birth_date: string;
          created_at?: string;
          day_start_minutes?: number;
          day_starts_at_night_end?: boolean;
          family_id: string;
          id?: string;
          name: string;
          sex?: Database['public']['Enums']['baby_sex'] | null;
          timezone: string;
          updated_at?: string;
        };
        Update: {
          birth_date?: string;
          created_at?: string;
          day_start_minutes?: number;
          day_starts_at_night_end?: boolean;
          family_id?: string;
          id?: string;
          name?: string;
          sex?: Database['public']['Enums']['baby_sex'] | null;
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
          baby_id: string;
          feed_reminder_at_night: boolean;
          feed_reminder_enabled: boolean;
          feed_reminder_interval_min: number | null;
          nappy_prompt: Database['public']['Enums']['nappy_prompt_timing'];
          night_end_minutes: number;
          night_start_minutes: number;
          updated_at: string;
        };
        Insert: {
          baby_id: string;
          feed_reminder_at_night?: boolean;
          feed_reminder_enabled?: boolean;
          feed_reminder_interval_min?: number | null;
          nappy_prompt?: Database['public']['Enums']['nappy_prompt_timing'];
          night_end_minutes?: number;
          night_start_minutes?: number;
          updated_at?: string;
        };
        Update: {
          baby_id?: string;
          feed_reminder_at_night?: boolean;
          feed_reminder_enabled?: boolean;
          feed_reminder_interval_min?: number | null;
          nappy_prompt?: Database['public']['Enums']['nappy_prompt_timing'];
          night_end_minutes?: number;
          night_start_minutes?: number;
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
      bottle_details: {
        Row: {
          amount_left_ml: number | null;
          amount_ml: number | null;
          content: Database['public']['Enums']['bottle_content'];
          event_id: string;
        };
        Insert: {
          amount_left_ml?: number | null;
          amount_ml?: number | null;
          content?: Database['public']['Enums']['bottle_content'];
          event_id: string;
        };
        Update: {
          amount_left_ml?: number | null;
          amount_ml?: number | null;
          content?: Database['public']['Enums']['bottle_content'];
          event_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bottle_details_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: true;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      custom_details: {
        Row: {
          description: string;
          event_id: string;
          title: string;
        };
        Insert: {
          description?: string;
          event_id: string;
          title: string;
        };
        Update: {
          description?: string;
          event_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'custom_details_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: true;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      device_links: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          code: string;
          consumed_at: string | null;
          created_at: string;
          device: string;
          expires_at: string;
          id: string;
          requested_from: string | null;
          secret_hash: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          code: string;
          consumed_at?: string | null;
          created_at?: string;
          device?: string;
          expires_at?: string;
          id?: string;
          requested_from?: string | null;
          secret_hash: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          code?: string;
          consumed_at?: string | null;
          created_at?: string;
          device?: string;
          expires_at?: string;
          id?: string;
          requested_from?: string | null;
          secret_hash?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          baby_id: string;
          created_at: string;
          created_by: string | null;
          created_device: string | null;
          deleted_at: string | null;
          end_recorded_at: string | null;
          ended_at: string | null;
          ended_by: string | null;
          id: string;
          notes: string | null;
          source: Database['public']['Enums']['event_source'];
          source_ref: string | null;
          started_at: string;
          type: Database['public']['Enums']['event_type'];
          updated_at: string;
        };
        Insert: {
          baby_id: string;
          created_at?: string;
          created_by?: string | null;
          created_device?: string | null;
          deleted_at?: string | null;
          end_recorded_at?: string | null;
          ended_at?: string | null;
          ended_by?: string | null;
          id?: string;
          notes?: string | null;
          source?: Database['public']['Enums']['event_source'];
          source_ref?: string | null;
          started_at: string;
          type: Database['public']['Enums']['event_type'];
          updated_at?: string;
        };
        Update: {
          baby_id?: string;
          created_at?: string;
          created_by?: string | null;
          created_device?: string | null;
          deleted_at?: string | null;
          end_recorded_at?: string | null;
          ended_at?: string | null;
          ended_by?: string | null;
          id?: string;
          notes?: string | null;
          source?: Database['public']['Enums']['event_source'];
          source_ref?: string | null;
          started_at?: string;
          type?: Database['public']['Enums']['event_type'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_baby_id_fkey';
            columns: ['baby_id'];
            isOneToOne: false;
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
          signed_up_at: string | null;
          signed_up_user_id: string | null;
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
          signed_up_at?: string | null;
          signed_up_user_id?: string | null;
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
          signed_up_at?: string | null;
          signed_up_user_id?: string | null;
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
      family_settings: {
        Row: {
          auto_end_paused_session_min: number;
          downtime_merge_threshold_sec: number;
          family_id: string;
          units: Database['public']['Enums']['units'];
          updated_at: string;
        };
        Insert: {
          auto_end_paused_session_min?: number;
          downtime_merge_threshold_sec?: number;
          family_id: string;
          units?: Database['public']['Enums']['units'];
          updated_at?: string;
        };
        Update: {
          auto_end_paused_session_min?: number;
          downtime_merge_threshold_sec?: number;
          family_id?: string;
          units?: Database['public']['Enums']['units'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'family_settings_family_id_fkey';
            columns: ['family_id'];
            isOneToOne: true;
            referencedRelation: 'families';
            referencedColumns: ['id'];
          },
        ];
      };
      former_members: {
        Row: {
          display_name: string;
          family_id: string;
          removed_at: string;
          user_id: string;
        };
        Insert: {
          display_name: string;
          family_id: string;
          removed_at?: string;
          user_id: string;
        };
        Update: {
          display_name?: string;
          family_id?: string;
          removed_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'former_members_family_id_fkey';
            columns: ['family_id'];
            isOneToOne: false;
            referencedRelation: 'families';
            referencedColumns: ['id'];
          },
        ];
      };
      growth_details: {
        Row: {
          event_id: string;
          head_circumference_mm: number | null;
          length_mm: number | null;
          weight_g: number | null;
        };
        Insert: {
          event_id: string;
          head_circumference_mm?: number | null;
          length_mm?: number | null;
          weight_g?: number | null;
        };
        Update: {
          event_id?: string;
          head_circumference_mm?: number | null;
          length_mm?: number | null;
          weight_g?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'growth_details_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: true;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      nappy_details: {
        Row: {
          dirty: boolean;
          event_id: string;
          poo_colours: Database['public']['Enums']['poo_colour'][];
          poo_size: Database['public']['Enums']['size'] | null;
          poo_textures: Database['public']['Enums']['poo_texture'][];
          rash: boolean;
          wet: boolean;
          wet_size: Database['public']['Enums']['size'] | null;
        };
        Insert: {
          dirty?: boolean;
          event_id: string;
          poo_colours?: Database['public']['Enums']['poo_colour'][];
          poo_size?: Database['public']['Enums']['size'] | null;
          poo_textures?: Database['public']['Enums']['poo_texture'][];
          rash?: boolean;
          wet?: boolean;
          wet_size?: Database['public']['Enums']['size'] | null;
        };
        Update: {
          dirty?: boolean;
          event_id?: string;
          poo_colours?: Database['public']['Enums']['poo_colour'][];
          poo_size?: Database['public']['Enums']['size'] | null;
          poo_textures?: Database['public']['Enums']['poo_texture'][];
          rash?: boolean;
          wet?: boolean;
          wet_size?: Database['public']['Enums']['size'] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'nappy_details_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: true;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      pump_details: {
        Row: {
          event_id: string;
          left_ml: number | null;
          right_ml: number | null;
          total_ml: number | null;
        };
        Insert: {
          event_id: string;
          left_ml?: number | null;
          right_ml?: number | null;
          total_ml?: number | null;
        };
        Update: {
          event_id?: string;
          left_ml?: number | null;
          right_ml?: number | null;
          total_ml?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pump_details_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: true;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      session_details: {
        Row: {
          event_id: string;
          state: Database['public']['Enums']['session_state'];
        };
        Insert: {
          event_id: string;
          state?: Database['public']['Enums']['session_state'];
        };
        Update: {
          event_id?: string;
          state?: Database['public']['Enums']['session_state'];
        };
        Relationships: [
          {
            foreignKeyName: 'session_details_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: true;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      session_devices: {
        Row: {
          name: string;
          session_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          name: string;
          session_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          name?: string;
          session_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      sleep_details: {
        Row: {
          end_moods: Database['public']['Enums']['mood'][];
          event_id: string;
          fall_asleep: Database['public']['Enums']['fall_asleep'] | null;
          locations: Database['public']['Enums']['sleep_location'][];
          start_moods: Database['public']['Enums']['mood'][];
          woken_by_carer: boolean;
        };
        Insert: {
          end_moods?: Database['public']['Enums']['mood'][];
          event_id: string;
          fall_asleep?: Database['public']['Enums']['fall_asleep'] | null;
          locations?: Database['public']['Enums']['sleep_location'][];
          start_moods?: Database['public']['Enums']['mood'][];
          woken_by_carer?: boolean;
        };
        Update: {
          end_moods?: Database['public']['Enums']['mood'][];
          event_id?: string;
          fall_asleep?: Database['public']['Enums']['fall_asleep'] | null;
          locations?: Database['public']['Enums']['sleep_location'][];
          start_moods?: Database['public']['Enums']['mood'][];
          woken_by_carer?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'sleep_details_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: true;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      solids_details: {
        Row: {
          amount: Database['public']['Enums']['solids_amount'] | null;
          event_id: string;
          foods: string[];
          reaction: Database['public']['Enums']['solids_reaction'] | null;
        };
        Insert: {
          amount?: Database['public']['Enums']['solids_amount'] | null;
          event_id: string;
          foods: string[];
          reaction?: Database['public']['Enums']['solids_reaction'] | null;
        };
        Update: {
          amount?: Database['public']['Enums']['solids_amount'] | null;
          event_id?: string;
          foods?: string[];
          reaction?: Database['public']['Enums']['solids_reaction'] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'solids_details_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: true;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      timed_segments: {
        Row: {
          ended_at: string | null;
          event_id: string;
          id: string;
          side: Database['public']['Enums']['side'] | null;
          started_at: string;
        };
        Insert: {
          ended_at?: string | null;
          event_id: string;
          id?: string;
          side?: Database['public']['Enums']['side'] | null;
          started_at: string;
        };
        Update: {
          ended_at?: string | null;
          event_id?: string;
          id?: string;
          side?: Database['public']['Enums']['side'] | null;
          started_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'timed_segments_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
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
      approve_device_link: { Args: { link_code: string }; Returns: undefined };
      check_invite: {
        Args: { invite_code: string };
        Returns: {
          expires_at: string;
          family_name: string;
        }[];
      };
      claim_device_link: {
        Args: { link_id: string; link_secret_hash: string };
        Returns: {
          email: string;
          status: string;
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
      device_link_details: {
        Args: { link_code: string };
        Returns: {
          device: string;
          expires_at: string;
        }[];
      };
      end_session: { Args: { end_at?: string; target_event_id: string }; Returns: undefined };
      family_devices: {
        Args: { target_family_id: string };
        Returns: {
          created_at: string;
          is_current: boolean;
          last_active: string;
          member_name: string;
          name: string;
          session_id: string;
          user_agent: string;
          user_id: string;
        }[];
      };
      get_instance_settings: {
        Args: Record<PropertyKey, never>;
        Returns: {
          has_users: boolean;
          signup_mode: Database['public']['Enums']['signup_mode'];
        }[];
      };
      import_events: {
        Args: { events: Json; target_baby_id: string };
        Returns: {
          imported: number;
          skipped: number;
        }[];
      };
      is_valid_timezone: { Args: { tz: string }; Returns: boolean };
      latest_events: {
        Args: { target_baby_id: string };
        Returns: {
          baby_id: string;
          created_at: string;
          created_by: string | null;
          created_device: string | null;
          deleted_at: string | null;
          end_recorded_at: string | null;
          ended_at: string | null;
          ended_by: string | null;
          id: string;
          notes: string | null;
          source: Database['public']['Enums']['event_source'];
          source_ref: string | null;
          started_at: string;
          type: Database['public']['Enums']['event_type'];
          updated_at: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'events';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      merge_feeds: { Args: { earlier_id: string; later_id: string }; Returns: undefined };
      pause_session: { Args: { target_event_id: string }; Returns: undefined };
      rename_device: { Args: { new_name: string; target_session_id: string }; Returns: undefined };
      resume_feed: {
        Args: { resume_side?: Database['public']['Enums']['side']; target_event_id: string };
        Returns: undefined;
      };
      resume_session: {
        Args: { resume_side?: Database['public']['Enums']['side']; target_event_id: string };
        Returns: undefined;
      };
      save_event: { Args: { event: Json }; Returns: string };
      save_sleep_details: { Args: { changes: Json; target_event_id: string }; Returns: undefined };
      server_time: { Args: Record<PropertyKey, never>; Returns: string };
      set_member_role: {
        Args: {
          member_user_id: string;
          new_role: Database['public']['Enums']['family_role'];
          target_family_id: string;
        };
        Returns: undefined;
      };
      set_session_start: { Args: { start_at: string; target_event_id: string }; Returns: undefined };
      set_switch_time: { Args: { switch_at: string; target_event_id: string }; Returns: undefined };
      sign_out_device: { Args: { target_session_id: string }; Returns: undefined };
      start_device_link: {
        Args: { new_code: string; new_device: string; new_requested_from?: string; new_secret_hash: string };
        Returns: {
          expires_at: string;
          id: string;
        }[];
      };
      start_session: {
        Args: {
          session_type: Database['public']['Enums']['event_type'];
          start_at?: string;
          start_side?: Database['public']['Enums']['side'];
          target_baby_id: string;
        };
        Returns: string;
      };
      switch_side: {
        Args: { new_side: Database['public']['Enums']['side']; target_event_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      baby_sex: 'female' | 'male';
      bottle_content: 'breast_milk' | 'formula' | 'mixed' | 'other';
      event_source: 'manual' | 'huckleberry_csv' | 'babble_export';
      event_type: 'sleep' | 'breast_feed' | 'bottle' | 'solids' | 'nappy' | 'pump' | 'growth' | 'custom';
      fall_asleep: 'under_10_min' | '10_to_20_min' | 'long_time';
      family_role: 'owner' | 'caregiver' | 'viewer';
      mood: 'happy' | 'upset';
      nappy_prompt_timing: 'feed_start' | 'first_side' | 'feed_end' | 'off';
      poo_colour: 'yellow' | 'mustard' | 'green' | 'dark_green' | 'brown' | 'orange' | 'black' | 'red' | 'white_grey';
      poo_texture: 'runny' | 'loose' | 'seedy' | 'pasty' | 'formed' | 'mucousy' | 'solid' | 'pebbles' | 'diarrhea';
      session_state: 'running' | 'paused' | 'ended';
      side: 'left' | 'right';
      signup_mode: 'open' | 'invite_only';
      size: 'tiny' | 'little' | 'medium' | 'large' | 'massive';
      sleep_location:
        | 'cot'
        | 'bassinet'
        | 'pram'
        | 'car'
        | 'swing'
        | 'held'
        | 'nursing'
        | 'bottle'
        | 'co_sleep'
        | 'next_to_carer'
        | 'other';
      solids_amount: 'taste' | 'some' | 'lots';
      solids_reaction: 'loved' | 'liked' | 'unsure' | 'disliked';
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
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
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
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
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
      baby_sex: ['female', 'male'],
      bottle_content: ['breast_milk', 'formula', 'mixed', 'other'],
      event_source: ['manual', 'huckleberry_csv', 'babble_export'],
      event_type: ['sleep', 'breast_feed', 'bottle', 'solids', 'nappy', 'pump', 'growth', 'custom'],
      fall_asleep: ['under_10_min', '10_to_20_min', 'long_time'],
      family_role: ['owner', 'caregiver', 'viewer'],
      mood: ['happy', 'upset'],
      nappy_prompt_timing: ['feed_start', 'first_side', 'feed_end', 'off'],
      poo_colour: ['yellow', 'mustard', 'green', 'dark_green', 'brown', 'orange', 'black', 'red', 'white_grey'],
      poo_texture: ['runny', 'loose', 'seedy', 'pasty', 'formed', 'mucousy', 'solid', 'pebbles', 'diarrhea'],
      session_state: ['running', 'paused', 'ended'],
      side: ['left', 'right'],
      signup_mode: ['open', 'invite_only'],
      size: ['tiny', 'little', 'medium', 'large', 'massive'],
      sleep_location: [
        'cot',
        'bassinet',
        'pram',
        'car',
        'swing',
        'held',
        'nursing',
        'bottle',
        'co_sleep',
        'next_to_carer',
        'other',
      ],
      solids_amount: ['taste', 'some', 'lots'],
      solids_reaction: ['loved', 'liked', 'unsure', 'disliked'],
      units: ['metric', 'imperial'],
    },
  },
} as const;
