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
      ai_decisions: {
        Row: {
          action_taken: string | null
          agent_type: string
          completion_tokens: number | null
          confidence: number | null
          created_at: string
          id: string
          interaction_id: string
          latency_ms: number | null
          model: string
          prompt_tokens: number | null
          reasoning: string | null
          tenant_id: string
          tools_used: Json | null
        }
        Insert: {
          action_taken?: string | null
          agent_type: string
          completion_tokens?: number | null
          confidence?: number | null
          created_at?: string
          id?: string
          interaction_id: string
          latency_ms?: number | null
          model?: string
          prompt_tokens?: number | null
          reasoning?: string | null
          tenant_id: string
          tools_used?: Json | null
        }
        Update: {
          action_taken?: string | null
          agent_type?: string
          completion_tokens?: number | null
          confidence?: number | null
          created_at?: string
          id?: string
          interaction_id?: string
          latency_ms?: number | null
          model?: string
          prompt_tokens?: number | null
          reasoning?: string | null
          tenant_id?: string
          tools_used?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_decisions_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_decisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          payload: Json
          session_id: string | null
          tenant_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown
          payload?: Json
          session_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          payload?: Json
          session_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cognitive_checkpoints: {
        Row: {
          ai_recommendation: string | null
          assigned_to: string | null
          confidence_at_trigger: number | null
          created_at: string
          expires_at: string | null
          id: string
          ih_decision: string | null
          ih_override_reason: string | null
          resolved_at: string | null
          session_id: string
          status: Database["public"]["Enums"]["checkpoint_status"]
          tenant_id: string
          trigger_reason: string
        }
        Insert: {
          ai_recommendation?: string | null
          assigned_to?: string | null
          confidence_at_trigger?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ih_decision?: string | null
          ih_override_reason?: string | null
          resolved_at?: string | null
          session_id: string
          status?: Database["public"]["Enums"]["checkpoint_status"]
          tenant_id: string
          trigger_reason: string
        }
        Update: {
          ai_recommendation?: string | null
          assigned_to?: string | null
          confidence_at_trigger?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ih_decision?: string | null
          ih_override_reason?: string | null
          resolved_at?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["checkpoint_status"]
          tenant_id?: string
          trigger_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "cognitive_checkpoints_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "tenant_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cognitive_checkpoints_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cognitive_checkpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      end_users: {
        Row: {
          channel_ids: Json
          consent_given: boolean
          created_at: string
          external_id: string | null
          id: string
          last_seen_at: string | null
          profile: Json
          tenant_id: string
        }
        Insert: {
          channel_ids?: Json
          consent_given?: boolean
          created_at?: string
          external_id?: string | null
          id?: string
          last_seen_at?: string | null
          profile?: Json
          tenant_id: string
        }
        Update: {
          channel_ids?: Json
          consent_given?: boolean
          created_at?: string
          external_id?: string | null
          id?: string
          last_seen_at?: string | null
          profile?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "end_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      escalations: {
        Row: {
          assigned_to: string | null
          confidence_at_trigger: number | null
          context_summary: string | null
          created_at: string
          customer_sentiment: string | null
          id: string
          outcome: Database["public"]["Enums"]["escalation_outcome"] | null
          resolved_at: string | null
          resolved_by: string | null
          session_id: string
          tenant_id: string
          trigger_reason: string
        }
        Insert: {
          assigned_to?: string | null
          confidence_at_trigger?: number | null
          context_summary?: string | null
          created_at?: string
          customer_sentiment?: string | null
          id?: string
          outcome?: Database["public"]["Enums"]["escalation_outcome"] | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id: string
          tenant_id: string
          trigger_reason: string
        }
        Update: {
          assigned_to?: string | null
          confidence_at_trigger?: number | null
          context_summary?: string | null
          created_at?: string
          customer_sentiment?: string | null
          id?: string
          outcome?: Database["public"]["Enums"]["escalation_outcome"] | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string
          tenant_id?: string
          trigger_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "tenant_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalations_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "tenant_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          channel: Database["public"]["Enums"]["channel_type"] | null
          content: string
          created_at: string
          id: string
          metadata: Json
          session_id: string
          stage: Database["public"]["Enums"]["module_type"] | null
          tenant_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          channel?: Database["public"]["Enums"]["channel_type"] | null
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          session_id: string
          stage?: Database["public"]["Enums"]["module_type"] | null
          tenant_id: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          channel?: Database["public"]["Enums"]["channel_type"] | null
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          session_id?: string
          stage?: Database["public"]["Enums"]["module_type"] | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          ih_checkpoints: Json
          is_active: boolean
          is_default: boolean
          name: string
          sector: Database["public"]["Enums"]["sector_type"]
          stages_config: Json
          tenant_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          ih_checkpoints?: Json
          is_active?: boolean
          is_default?: boolean
          name: string
          sector: Database["public"]["Enums"]["sector_type"]
          stages_config?: Json
          tenant_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          ih_checkpoints?: Json
          is_active?: boolean
          is_default?: boolean
          name?: string
          sector?: Database["public"]["Enums"]["sector_type"]
          stages_config?: Json
          tenant_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "journey_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tenant_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json
          tenant_id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          tenant_id: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          tenant_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          tenant_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_documents: {
        Row: {
          chunk_count: number
          created_at: string
          error_msg: string | null
          file_name: string | null
          id: string
          source_type: string
          source_url: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          chunk_count?: number
          created_at?: string
          error_msg?: string | null
          file_name?: string | null
          id?: string
          source_type: string
          source_url?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          chunk_count?: number
          created_at?: string
          error_msg?: string | null
          file_name?: string | null
          id?: string
          source_type?: string
          source_url?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_responses: {
        Row: {
          channel: string | null
          created_at: string
          csat_score: number | null
          end_user_id: string
          id: string
          metadata: Json
          nps_category: string | null
          nps_score: number
          session_id: string
          stage_reached: string | null
          tenant_id: string
          verbatim: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          csat_score?: number | null
          end_user_id: string
          id?: string
          metadata?: Json
          nps_category?: string | null
          nps_score: number
          session_id: string
          stage_reached?: string | null
          tenant_id: string
          verbatim?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          csat_score?: number | null
          end_user_id?: string
          id?: string
          metadata?: Json
          nps_category?: string | null
          nps_score?: number
          session_id?: string
          stage_reached?: string | null
          tenant_id?: string
          verbatim?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nps_responses_end_user_id_fkey"
            columns: ["end_user_id"]
            isOneToOne: false
            referencedRelation: "end_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string
          features: Json
          id: string
          is_active: boolean
          metadata: Json
          name: string
          price: number | null
          segments: Json
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description: string
          features?: Json
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          price?: number | null
          segments?: Json
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string
          features?: Json
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          price?: number | null
          segments?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          actor_control: Database["public"]["Enums"]["actor_control"]
          assigned_operator: string | null
          channel: Database["public"]["Enums"]["channel_type"]
          closed_at: string | null
          current_stage: Database["public"]["Enums"]["module_type"] | null
          end_user_id: string
          id: string
          last_activity_at: string
          metadata: Json
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          template_id: string | null
          tenant_id: string
        }
        Insert: {
          actor_control?: Database["public"]["Enums"]["actor_control"]
          assigned_operator?: string | null
          channel: Database["public"]["Enums"]["channel_type"]
          closed_at?: string | null
          current_stage?: Database["public"]["Enums"]["module_type"] | null
          end_user_id: string
          id?: string
          last_activity_at?: string
          metadata?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          template_id?: string | null
          tenant_id: string
        }
        Update: {
          actor_control?: Database["public"]["Enums"]["actor_control"]
          assigned_operator?: string | null
          channel?: Database["public"]["Enums"]["channel_type"]
          closed_at?: string | null
          current_stage?: Database["public"]["Enums"]["module_type"] | null
          end_user_id?: string
          id?: string
          last_activity_at?: string
          metadata?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          template_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_assigned_operator_fkey"
            columns: ["assigned_operator"]
            isOneToOne: false
            referencedRelation: "tenant_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_end_user_id_fkey"
            columns: ["end_user_id"]
            isOneToOne: false
            referencedRelation: "end_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "journey_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      superadmins: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "tenant_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_modules: {
        Row: {
          activated_at: string | null
          config: Json
          created_at: string
          deactivated_at: string | null
          fallback_config: Json
          fallback_type: Database["public"]["Enums"]["fallback_type"]
          id: string
          is_active: boolean
          module_type: Database["public"]["Enums"]["module_type"]
          tenant_id: string
        }
        Insert: {
          activated_at?: string | null
          config?: Json
          created_at?: string
          deactivated_at?: string | null
          fallback_config?: Json
          fallback_type?: Database["public"]["Enums"]["fallback_type"]
          id?: string
          is_active?: boolean
          module_type: Database["public"]["Enums"]["module_type"]
          tenant_id: string
        }
        Update: {
          activated_at?: string | null
          config?: Json
          created_at?: string
          deactivated_at?: string | null
          fallback_config?: Json
          fallback_type?: Database["public"]["Enums"]["fallback_type"]
          id?: string
          is_active?: boolean
          module_type?: Database["public"]["Enums"]["module_type"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          last_seen_at: string | null
          permissions: Json
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          last_seen_at?: string | null
          permissions?: Json
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          permissions?: Json
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          claude_config: Json
          created_at: string
          id: string
          ih_policies: Json
          is_active: boolean
          name: string
          sector: Database["public"]["Enums"]["sector_type"]
          slug: string
          updated_at: string
        }
        Insert: {
          claude_config?: Json
          created_at?: string
          id?: string
          ih_policies?: Json
          is_active?: boolean
          name: string
          sector: Database["public"]["Enums"]["sector_type"]
          slug: string
          updated_at?: string
        }
        Update: {
          claude_config?: Json
          created_at?: string
          id?: string
          ih_policies?: Json
          is_active?: boolean
          name?: string
          sector?: Database["public"]["Enums"]["sector_type"]
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_tenant_id: { Args: never; Returns: string }
      auth_user_role: { Args: never; Returns: string }
      cricket_custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_tenant_stages: {
        Args: { p_tenant_id: string }
        Returns: {
          config: Json
          fallback_config: Json
          fallback_type: Database["public"]["Enums"]["fallback_type"]
          is_active: boolean
          module_type: Database["public"]["Enums"]["module_type"]
        }[]
      }
      is_superadmin: { Args: never; Returns: boolean }
      is_tenant_admin: { Args: never; Returns: boolean }
      search_knowledge_base: {
        Args: { p_embedding: string; p_limit?: number; p_tenant_id: string }
        Returns: {
          chunk_id: string
          content: string
          document_id: string
          similarity: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      actor_control: "AI" | "HUMAN" | "MIXED"
      actor_type: "AI" | "HUMAN" | "SYSTEM"
      channel_type: "whatsapp" | "web_chat" | "email"
      checkpoint_status:
        | "pending"
        | "approved"
        | "rejected"
        | "overridden"
        | "expired"
      escalation_outcome:
        | "resolved_by_human"
        | "returned_to_ai"
        | "closed"
        | "transferred"
      fallback_type: "ih_handoff" | "redirect_url" | "skip"
      invitation_status: "pending" | "accepted" | "expired" | "revoked"
      module_type: "consultation" | "sales" | "transactions" | "feedback"
      sector_type: "banking" | "retail" | "health" | "telecom" | "government"
      session_status:
        | "active"
        | "escalated"
        | "human_takeover"
        | "completed"
        | "abandoned"
      user_role: "superadmin" | "tenant_admin" | "supervisor" | "operator"
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
      actor_control: ["AI", "HUMAN", "MIXED"],
      actor_type: ["AI", "HUMAN", "SYSTEM"],
      channel_type: ["whatsapp", "web_chat", "email"],
      checkpoint_status: [
        "pending",
        "approved",
        "rejected",
        "overridden",
        "expired",
      ],
      escalation_outcome: [
        "resolved_by_human",
        "returned_to_ai",
        "closed",
        "transferred",
      ],
      fallback_type: ["ih_handoff", "redirect_url", "skip"],
      invitation_status: ["pending", "accepted", "expired", "revoked"],
      module_type: ["consultation", "sales", "transactions", "feedback"],
      sector_type: ["banking", "retail", "health", "telecom", "government"],
      session_status: [
        "active",
        "escalated",
        "human_takeover",
        "completed",
        "abandoned",
      ],
      user_role: ["superadmin", "tenant_admin", "supervisor", "operator"],
    },
  },
} as const
