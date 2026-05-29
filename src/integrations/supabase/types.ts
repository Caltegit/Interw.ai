export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      candidate_message_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          key: string
          organization_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          key: string
          organization_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          key?: string
          organization_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_message_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          parts?: Json
          role: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "copilot_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_threads: {
        Row: {
          created_at: string
          created_by: string
          id: string
          mode: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          mode?: string
          project_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          mode?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_threads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      criteria_templates: {
        Row: {
          anchors: Json | null
          applies_to: Database["public"]["Enums"]["criteria_scope"]
          category: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          label: string
          organization_id: string
          scoring_scale: Database["public"]["Enums"]["scoring_scale_type"]
          weight: number
        }
        Insert: {
          anchors?: Json | null
          applies_to?: Database["public"]["Enums"]["criteria_scope"]
          category?: string | null
          created_at?: string
          created_by: string
          description?: string
          id?: string
          label: string
          organization_id: string
          scoring_scale?: Database["public"]["Enums"]["scoring_scale_type"]
          weight?: number
        }
        Update: {
          anchors?: Json | null
          applies_to?: Database["public"]["Enums"]["criteria_scope"]
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          label?: string
          organization_id?: string
          scoring_scale?: Database["public"]["Enums"]["scoring_scale_type"]
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "criteria_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_purge_log: {
        Row: {
          candidate_email: string | null
          details: Json | null
          id: string
          performed_at: string
          performed_by: string | null
          session_id: string
          source: string
        }
        Insert: {
          candidate_email?: string | null
          details?: Json | null
          id?: string
          performed_at?: string
          performed_by?: string | null
          session_id: string
          source: string
        }
        Update: {
          candidate_email?: string | null
          details?: Json | null
          id?: string
          performed_at?: string
          performed_by?: string | null
          session_id?: string
          source?: string
        }
        Relationships: []
      }
      email_alert_config: {
        Row: {
          cooldown_hours: number
          enabled: boolean
          failure_threshold: number
          id: number
          updated_at: string
          window_minutes: number
        }
        Insert: {
          cooldown_hours?: number
          enabled?: boolean
          failure_threshold?: number
          id?: number
          updated_at?: string
          window_minutes?: number
        }
        Update: {
          cooldown_hours?: number
          enabled?: boolean
          failure_threshold?: number
          id?: number
          updated_at?: string
          window_minutes?: number
        }
        Relationships: []
      }
      email_alert_log: {
        Row: {
          details: Json | null
          failure_count: number
          id: string
          recipients_notified: number
          threshold: number
          triggered_at: string
          window_minutes: number
        }
        Insert: {
          details?: Json | null
          failure_count: number
          id?: string
          recipients_notified?: number
          threshold: number
          triggered_at?: string
          window_minutes: number
        }
        Update: {
          details?: Json | null
          failure_count?: number
          id?: string
          recipients_notified?: number
          threshold?: number
          triggered_at?: string
          window_minutes?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_template_overrides: {
        Row: {
          created_at: string
          enabled: boolean
          html_body: string
          id: string
          organization_id: string
          subject: string
          template_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          html_body?: string
          id?: string
          organization_id: string
          subject?: string
          template_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          html_body?: string
          id?: string
          organization_id?: string
          subject?: string
          template_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_template_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      evaluation_criteria: {
        Row: {
          anchors: Json | null
          applies_to: Database["public"]["Enums"]["criteria_scope"]
          created_at: string
          description: string
          id: string
          label: string
          order_index: number
          project_id: string
          scoring_scale: Database["public"]["Enums"]["scoring_scale_type"]
          weight: number
        }
        Insert: {
          anchors?: Json | null
          applies_to?: Database["public"]["Enums"]["criteria_scope"]
          created_at?: string
          description?: string
          id?: string
          label: string
          order_index?: number
          project_id: string
          scoring_scale?: Database["public"]["Enums"]["scoring_scale_type"]
          weight?: number
        }
        Update: {
          anchors?: Json | null
          applies_to?: Database["public"]["Enums"]["criteria_scope"]
          created_at?: string
          description?: string
          id?: string
          label?: string
          order_index?: number
          project_id?: string
          scoring_scale?: Database["public"]["Enums"]["scoring_scale_type"]
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_criteria_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_messages: {
        Row: {
          author_id: string
          author_role: string
          content: string
          created_at: string
          id: string
          read_by_recipient_at: string | null
          thread_id: string
        }
        Insert: {
          author_id: string
          author_role: string
          content: string
          created_at?: string
          id?: string
          read_by_recipient_at?: string | null
          thread_id: string
        }
        Update: {
          author_id?: string
          author_role?: string
          content?: string
          created_at?: string
          id?: string
          read_by_recipient_at?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "feedback_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          organization_id: string | null
          status: Database["public"]["Enums"]["feedback_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          organization_id?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          organization_id?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interview_template_criteria: {
        Row: {
          anchors: Json | null
          applies_to: Database["public"]["Enums"]["criteria_scope"]
          created_at: string
          description: string
          id: string
          label: string
          order_index: number
          scoring_scale: Database["public"]["Enums"]["scoring_scale_type"]
          template_id: string
          weight: number
        }
        Insert: {
          anchors?: Json | null
          applies_to?: Database["public"]["Enums"]["criteria_scope"]
          created_at?: string
          description?: string
          id?: string
          label: string
          order_index?: number
          scoring_scale?: Database["public"]["Enums"]["scoring_scale_type"]
          template_id: string
          weight?: number
        }
        Update: {
          anchors?: Json | null
          applies_to?: Database["public"]["Enums"]["criteria_scope"]
          created_at?: string
          description?: string
          id?: string
          label?: string
          order_index?: number
          scoring_scale?: Database["public"]["Enums"]["scoring_scale_type"]
          template_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "interview_template_criteria_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "interview_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_template_questions: {
        Row: {
          audio_url: string | null
          avatar_image_url: string | null
          category: string | null
          content: string
          created_at: string
          follow_up_enabled: boolean
          hint_text: string | null
          id: string
          max_follow_ups: number
          max_response_seconds: number | null
          order_index: number
          relance_level: string
          template_id: string
          title: string
          type: string
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          avatar_image_url?: string | null
          category?: string | null
          content: string
          created_at?: string
          follow_up_enabled?: boolean
          hint_text?: string | null
          id?: string
          max_follow_ups?: number
          max_response_seconds?: number | null
          order_index?: number
          relance_level?: string
          template_id: string
          title?: string
          type?: string
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          avatar_image_url?: string | null
          category?: string | null
          content?: string
          created_at?: string
          follow_up_enabled?: boolean
          hint_text?: string | null
          id?: string
          max_follow_ups?: number
          max_response_seconds?: number | null
          order_index?: number
          relance_level?: string
          template_id?: string
          title?: string
          type?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_template_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "interview_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          default_duration_minutes: number
          default_language: Database["public"]["Enums"]["project_language"]
          description: string
          id: string
          job_title: string
          name: string
          organization_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          default_duration_minutes?: number
          default_language?: Database["public"]["Enums"]["project_language"]
          description?: string
          id?: string
          job_title?: string
          name: string
          organization_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          default_duration_minutes?: number
          default_language?: Database["public"]["Enums"]["project_language"]
          description?: string
          id?: string
          job_title?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      intro_templates: {
        Row: {
          audio_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          intro_text: string | null
          name: string
          organization_id: string
          tts_voice_id: string | null
          type: string
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          intro_text?: string | null
          name: string
          organization_id: string
          tts_voice_id?: string | null
          type: string
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          intro_text?: string | null
          name?: string
          organization_id?: string
          tts_voice_id?: string | null
          type?: string
          video_url?: string | null
        }
        Relationships: []
      }
      organization_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          client_notes: string | null
          created_at: string
          enable_bias_detection: boolean
          id: string
          logo_url: string | null
          name: string
          owner_id: string | null
          pricing: string | null
          session_credits_total: number | null
          session_credits_unlimited: boolean
          slug: string
        }
        Insert: {
          client_notes?: string | null
          created_at?: string
          enable_bias_detection?: boolean
          id?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
          pricing?: string | null
          session_credits_total?: number | null
          session_credits_unlimited?: boolean
          slug: string
        }
        Update: {
          client_notes?: string | null
          created_at?: string
          enable_bias_detection?: boolean
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          pricing?: string | null
          session_credits_total?: number | null
          session_credits_unlimited?: boolean
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cloned_voice_consent_at: string | null
          cloned_voice_created_at: string | null
          cloned_voice_id: string | null
          cloned_voice_name: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          organization_id: string | null
          user_id: string
        }
        Insert: {
          cloned_voice_consent_at?: string | null
          cloned_voice_created_at?: string | null
          cloned_voice_id?: string | null
          cloned_voice_name?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          organization_id?: string | null
          user_id: string
        }
        Update: {
          cloned_voice_consent_at?: string | null
          cloned_voice_created_at?: string | null
          cloned_voice_id?: string | null
          cloned_voice_name?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          organization_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_public_pages: {
        Row: {
          content: Json
          cover_image_url: string | null
          created_at: string
          enabled: boolean
          id: string
          project_id: string
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug_public: string
          updated_at: string
        }
        Insert: {
          content?: Json
          cover_image_url?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          project_id: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug_public: string
          updated_at?: string
        }
        Update: {
          content?: Json
          cover_image_url?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          project_id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug_public?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          ai_intro_custom_text: string | null
          ai_intro_enabled: boolean
          ai_intro_mode: string
          ai_persona_name: string
          ai_question_transitions_custom_text: string | null
          ai_question_transitions_enabled: boolean
          ai_question_transitions_mode: string
          ai_voice: Database["public"]["Enums"]["ai_voice_type"]
          allow_pause: boolean
          allow_skip_question: boolean
          audio_analysis_enabled: boolean
          auto_skip_silence: boolean
          avatar_image_url: string | null
          completion_message: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          intro_audio_url: string | null
          intro_enabled: boolean
          intro_first_screen: boolean
          intro_mode: string | null
          intro_text: string | null
          job_title: string
          language: Database["public"]["Enums"]["project_language"]
          max_duration_minutes: number
          organization_id: string
          pre_session_message: string | null
          presentation_video_url: string | null
          record_audio: boolean
          record_video: boolean
          report_recipient_user_ids: string[]
          show_question_timer: boolean
          slug: string | null
          status: Database["public"]["Enums"]["project_status"]
          title: string
          tts_provider: string
          tts_voice_gender: string
          tts_voice_id: string | null
        }
        Insert: {
          ai_intro_custom_text?: string | null
          ai_intro_enabled?: boolean
          ai_intro_mode?: string
          ai_persona_name?: string
          ai_question_transitions_custom_text?: string | null
          ai_question_transitions_enabled?: boolean
          ai_question_transitions_mode?: string
          ai_voice?: Database["public"]["Enums"]["ai_voice_type"]
          allow_pause?: boolean
          allow_skip_question?: boolean
          audio_analysis_enabled?: boolean
          auto_skip_silence?: boolean
          avatar_image_url?: string | null
          completion_message?: string | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          intro_audio_url?: string | null
          intro_enabled?: boolean
          intro_first_screen?: boolean
          intro_mode?: string | null
          intro_text?: string | null
          job_title?: string
          language?: Database["public"]["Enums"]["project_language"]
          max_duration_minutes?: number
          organization_id: string
          pre_session_message?: string | null
          presentation_video_url?: string | null
          record_audio?: boolean
          record_video?: boolean
          report_recipient_user_ids?: string[]
          show_question_timer?: boolean
          slug?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          tts_provider?: string
          tts_voice_gender?: string
          tts_voice_id?: string | null
        }
        Update: {
          ai_intro_custom_text?: string | null
          ai_intro_enabled?: boolean
          ai_intro_mode?: string
          ai_persona_name?: string
          ai_question_transitions_custom_text?: string | null
          ai_question_transitions_enabled?: boolean
          ai_question_transitions_mode?: string
          ai_voice?: Database["public"]["Enums"]["ai_voice_type"]
          allow_pause?: boolean
          allow_skip_question?: boolean
          audio_analysis_enabled?: boolean
          auto_skip_silence?: boolean
          avatar_image_url?: string | null
          completion_message?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          intro_audio_url?: string | null
          intro_enabled?: boolean
          intro_first_screen?: boolean
          intro_mode?: string | null
          intro_text?: string | null
          job_title?: string
          language?: Database["public"]["Enums"]["project_language"]
          max_duration_minutes?: number
          organization_id?: string
          pre_session_message?: string | null
          presentation_video_url?: string | null
          record_audio?: boolean
          record_video?: boolean
          report_recipient_user_ids?: string[]
          show_question_timer?: boolean
          slug?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          tts_provider?: string
          tts_voice_gender?: string
          tts_voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      question_templates: {
        Row: {
          audio_url: string | null
          avatar_image_url: string | null
          category: string | null
          content: string
          created_at: string
          created_by: string
          follow_up_enabled: boolean
          hint_text: string | null
          id: string
          max_follow_ups: number
          max_response_seconds: number | null
          organization_id: string
          relance_level: string
          title: string
          type: string
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          avatar_image_url?: string | null
          category?: string | null
          content: string
          created_at?: string
          created_by: string
          follow_up_enabled?: boolean
          hint_text?: string | null
          id?: string
          max_follow_ups?: number
          max_response_seconds?: number | null
          organization_id: string
          relance_level?: string
          title?: string
          type?: string
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          avatar_image_url?: string | null
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string
          follow_up_enabled?: boolean
          hint_text?: string | null
          id?: string
          max_follow_ups?: number
          max_response_seconds?: number | null
          organization_id?: string
          relance_level?: string
          title?: string
          type?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          archived_at: string | null
          audio_url: string | null
          avatar_image_url: string | null
          content: string
          created_at: string
          follow_up_enabled: boolean
          hint_text: string | null
          id: string
          max_follow_ups: number
          max_response_seconds: number | null
          order_index: number
          project_id: string
          relance_level: string
          scoring_criteria_ids: string[] | null
          title: string
          type: Database["public"]["Enums"]["question_type"]
          video_url: string | null
        }
        Insert: {
          archived_at?: string | null
          audio_url?: string | null
          avatar_image_url?: string | null
          content: string
          created_at?: string
          follow_up_enabled?: boolean
          hint_text?: string | null
          id?: string
          max_follow_ups?: number
          max_response_seconds?: number | null
          order_index?: number
          project_id: string
          relance_level?: string
          scoring_criteria_ids?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["question_type"]
          video_url?: string | null
        }
        Update: {
          archived_at?: string | null
          audio_url?: string | null
          avatar_image_url?: string | null
          content?: string
          created_at?: string
          follow_up_enabled?: boolean
          hint_text?: string | null
          id?: string
          max_follow_ups?: number
          max_response_seconds?: number | null
          order_index?: number
          project_id?: string
          relance_level?: string
          scoring_criteria_ids?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["question_type"]
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      report_shares: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          report_id: string
          share_token: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          report_id: string
          share_token?: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          report_id?: string
          share_token?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_shares_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          areas_for_improvement: string[] | null
          audio_health: Json | null
          coherence: Json | null
          criteria_scores: Json | null
          executive_summary: string
          executive_summary_short: string | null
          flagged_moments: Json | null
          followup_questions: Json | null
          generated_at: string
          highlight_clips: Json
          highlights: Json | null
          id: string
          motivation_scores: Json | null
          nonverbal_analysis: Json | null
          overall_grade: string | null
          overall_score: number
          paraverbal_analysis: Json | null
          personality_profile: Json | null
          question_evaluations: Json | null
          recommendation:
            | Database["public"]["Enums"]["recommendation_type"]
            | null
          red_flags: Json | null
          reliability: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string
          soft_skills: Json | null
          stats: Json
          strengths: string[] | null
          timeline: Json | null
        }
        Insert: {
          areas_for_improvement?: string[] | null
          audio_health?: Json | null
          coherence?: Json | null
          criteria_scores?: Json | null
          executive_summary?: string
          executive_summary_short?: string | null
          flagged_moments?: Json | null
          followup_questions?: Json | null
          generated_at?: string
          highlight_clips?: Json
          highlights?: Json | null
          id?: string
          motivation_scores?: Json | null
          nonverbal_analysis?: Json | null
          overall_grade?: string | null
          overall_score?: number
          paraverbal_analysis?: Json | null
          personality_profile?: Json | null
          question_evaluations?: Json | null
          recommendation?:
            | Database["public"]["Enums"]["recommendation_type"]
            | null
          red_flags?: Json | null
          reliability?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id: string
          soft_skills?: Json | null
          stats?: Json
          strengths?: string[] | null
          timeline?: Json | null
        }
        Update: {
          areas_for_improvement?: string[] | null
          audio_health?: Json | null
          coherence?: Json | null
          criteria_scores?: Json | null
          executive_summary?: string
          executive_summary_short?: string | null
          flagged_moments?: Json | null
          followup_questions?: Json | null
          generated_at?: string
          highlight_clips?: Json
          highlights?: Json | null
          id?: string
          motivation_scores?: Json | null
          nonverbal_analysis?: Json | null
          overall_grade?: string | null
          overall_score?: number
          paraverbal_analysis?: Json | null
          personality_profile?: Json | null
          question_evaluations?: Json | null
          recommendation?:
            | Database["public"]["Enums"]["recommendation_type"]
            | null
          red_flags?: Json | null
          reliability?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string
          soft_skills?: Json | null
          stats?: Json
          strengths?: string[] | null
          timeline?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_attempts: {
        Row: {
          block_reason: string | null
          browser: string | null
          browser_version: string | null
          compat_level: string
          created_at: string
          device_type: string | null
          has_audio_context: boolean
          has_get_user_media: boolean
          has_media_recorder: boolean
          id: string
          is_in_app_webview: boolean
          language: string | null
          os: string | null
          proceeded_anyway: boolean
          screen_h: number | null
          screen_w: number | null
          session_id: string
          user_agent: string
          viewport_h: number | null
          viewport_w: number | null
          webview_host: string | null
        }
        Insert: {
          block_reason?: string | null
          browser?: string | null
          browser_version?: string | null
          compat_level?: string
          created_at?: string
          device_type?: string | null
          has_audio_context?: boolean
          has_get_user_media?: boolean
          has_media_recorder?: boolean
          id?: string
          is_in_app_webview?: boolean
          language?: string | null
          os?: string | null
          proceeded_anyway?: boolean
          screen_h?: number | null
          screen_w?: number | null
          session_id: string
          user_agent?: string
          viewport_h?: number | null
          viewport_w?: number | null
          webview_host?: string | null
        }
        Update: {
          block_reason?: string | null
          browser?: string | null
          browser_version?: string | null
          compat_level?: string
          created_at?: string
          device_type?: string | null
          has_audio_context?: boolean
          has_get_user_media?: boolean
          has_media_recorder?: boolean
          id?: string
          is_in_app_webview?: boolean
          language?: string | null
          os?: string | null
          proceeded_anyway?: boolean
          screen_h?: number | null
          screen_w?: number | null
          session_id?: string
          user_agent?: string
          viewport_h?: number | null
          viewport_w?: number | null
          webview_host?: string | null
        }
        Relationships: []
      }
      session_messages: {
        Row: {
          audio_quality: Json | null
          audio_segment_url: string | null
          content: string
          content_raw: string | null
          id: string
          is_follow_up: boolean
          organization_id: string
          question_id: string | null
          role: Database["public"]["Enums"]["message_role"]
          session_id: string
          timestamp: string
          transcribed_at: string | null
          transcript_segments: Json | null
          transcription_status: string
          video_chunks_manifest_url: string | null
          video_segment_url: string | null
        }
        Insert: {
          audio_quality?: Json | null
          audio_segment_url?: string | null
          content: string
          content_raw?: string | null
          id?: string
          is_follow_up?: boolean
          organization_id: string
          question_id?: string | null
          role: Database["public"]["Enums"]["message_role"]
          session_id: string
          timestamp?: string
          transcribed_at?: string | null
          transcript_segments?: Json | null
          transcription_status?: string
          video_chunks_manifest_url?: string | null
          video_segment_url?: string | null
        }
        Update: {
          audio_quality?: Json | null
          audio_segment_url?: string | null
          content?: string
          content_raw?: string | null
          id?: string
          is_follow_up?: boolean
          organization_id?: string
          question_id?: string | null
          role?: Database["public"]["Enums"]["message_role"]
          session_id?: string
          timestamp?: string
          transcribed_at?: string | null
          transcript_segments?: Json | null
          transcription_status?: string
          video_chunks_manifest_url?: string | null
          video_segment_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_messages_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          assigned_to: string | null
          audio_recording_url: string | null
          cancelled_at: string | null
          candidate_cv_filename: string | null
          candidate_cv_url: string | null
          candidate_email: string
          candidate_linkedin_url: string | null
          candidate_name: string
          completed_at: string | null
          consent_accepted_at: string | null
          consent_given_at: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          is_demo: boolean
          last_activity_at: string | null
          last_candidate_email_key: string | null
          last_question_index: number
          organization_id: string
          project_id: string
          recruiter_decision: Database["public"]["Enums"]["recruiter_decision_type"]
          recruiter_decision_at: string | null
          recruiter_decision_by: string | null
          recruiter_note: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          thumbnail_url: string | null
          token: string
          video_recording_url: string | null
          video_viewed_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          audio_recording_url?: string | null
          cancelled_at?: string | null
          candidate_cv_filename?: string | null
          candidate_cv_url?: string | null
          candidate_email: string
          candidate_linkedin_url?: string | null
          candidate_name: string
          completed_at?: string | null
          consent_accepted_at?: string | null
          consent_given_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_demo?: boolean
          last_activity_at?: string | null
          last_candidate_email_key?: string | null
          last_question_index?: number
          organization_id: string
          project_id: string
          recruiter_decision?: Database["public"]["Enums"]["recruiter_decision_type"]
          recruiter_decision_at?: string | null
          recruiter_decision_by?: string | null
          recruiter_note?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          thumbnail_url?: string | null
          token?: string
          video_recording_url?: string | null
          video_viewed_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          audio_recording_url?: string | null
          cancelled_at?: string | null
          candidate_cv_filename?: string | null
          candidate_cv_url?: string | null
          candidate_email?: string
          candidate_linkedin_url?: string | null
          candidate_name?: string
          completed_at?: string | null
          consent_accepted_at?: string | null
          consent_given_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_demo?: boolean
          last_activity_at?: string | null
          last_candidate_email_key?: string | null
          last_question_index?: number
          organization_id?: string
          project_id?: string
          recruiter_decision?: Database["public"]["Enums"]["recruiter_decision_type"]
          recruiter_decision_at?: string | null
          recruiter_decision_by?: string | null
          recruiter_note?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          thumbnail_url?: string | null
          token?: string
          video_recording_url?: string | null
          video_viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          created_at: string
          duration_seconds: number
          formatted_text: string
          full_text: string
          id: string
          language: string
          session_id: string
          word_count: number
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          formatted_text?: string
          full_text?: string
          id?: string
          language?: string
          session_id: string
          word_count?: number
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          formatted_text?: string
          full_text?: string
          id?: string
          language?: string
          session_id?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { _token: string; _user_id: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_project: { Args: { _project_id: string }; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_session_id_by_token: { Args: { _token: string }; Returns: string }
      get_user_organization_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      mark_attempt_proceeded: {
        Args: { _attempt_id: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      seed_default_criteria_templates: {
        Args: { _created_by: string; _org_id: string }
        Returns: undefined
      }
      seed_default_interview_templates: {
        Args: { _created_by: string; _org_id: string }
        Returns: undefined
      }
      seed_default_intro_templates: {
        Args: { _created_by: string; _org_id: string }
        Returns: undefined
      }
      seed_default_question_templates: {
        Args: { _created_by: string; _org_id: string }
        Returns: undefined
      }
      seed_demo_project: {
        Args: { _created_by: string; _org_id: string }
        Returns: undefined
      }
      slugify: { Args: { input: string }; Returns: string }
      switch_active_organization: { Args: { _org_id: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      ai_voice_type: "female_fr" | "male_fr" | "female_en" | "male_en"
      app_role: "admin" | "recruiter" | "viewer" | "super_admin"
      criteria_scope: "all_questions" | "specific_questions"
      feedback_status: "open" | "in_progress" | "archived"
      invitation_status: "pending" | "accepted" | "expired"
      message_role: "ai" | "candidate"
      project_language: "fr" | "en"
      project_status: "draft" | "active" | "archived"
      question_type: "open" | "situational" | "motivation" | "technical"
      recommendation_type: "strong_yes" | "yes" | "maybe" | "no"
      recruiter_decision_type:
        | "none"
        | "in_progress"
        | "accepted"
        | "shortlisted"
        | "rejected"
        | "second_opinion"
      scoring_scale_type: "0-5" | "0-10" | "ABC"
      session_status:
        | "pending"
        | "video_viewed"
        | "in_progress"
        | "completed"
        | "expired"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_voice_type: ["female_fr", "male_fr", "female_en", "male_en"],
      app_role: ["admin", "recruiter", "viewer", "super_admin"],
      criteria_scope: ["all_questions", "specific_questions"],
      feedback_status: ["open", "in_progress", "archived"],
      invitation_status: ["pending", "accepted", "expired"],
      message_role: ["ai", "candidate"],
      project_language: ["fr", "en"],
      project_status: ["draft", "active", "archived"],
      question_type: ["open", "situational", "motivation", "technical"],
      recommendation_type: ["strong_yes", "yes", "maybe", "no"],
      recruiter_decision_type: [
        "none",
        "in_progress",
        "accepted",
        "shortlisted",
        "rejected",
        "second_opinion",
      ],
      scoring_scale_type: ["0-5", "0-10", "ABC"],
      session_status: [
        "pending",
        "video_viewed",
        "in_progress",
        "completed",
        "expired",
        "cancelled",
      ],
    },
  },
} as const
