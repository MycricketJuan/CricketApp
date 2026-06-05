// Generado con: pnpm db:types
// Regenerar tras cada migración. Este archivo refleja el schema en supabase/migrations/cricket_001_initial_schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      superadmins: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          sector: Database['public']['Enums']['sector_type']
          claude_config: Json
          ih_policies: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sector: Database['public']['Enums']['sector_type']
          claude_config?: Json
          ih_policies?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sector?: Database['public']['Enums']['sector_type']
          claude_config?: Json
          ih_policies?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenant_users: {
        Row: {
          id: string
          tenant_id: string
          role: Database['public']['Enums']['user_role']
          full_name: string | null
          permissions: Json
          is_active: boolean
          last_seen_at: string | null
          created_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          role?: Database['public']['Enums']['user_role']
          full_name?: string | null
          permissions?: Json
          is_active?: boolean
          last_seen_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          role?: Database['public']['Enums']['user_role']
          full_name?: string | null
          permissions?: Json
          is_active?: boolean
          last_seen_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tenant_users_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      tenant_invitations: {
        Row: {
          id: string
          tenant_id: string
          email: string
          role: Database['public']['Enums']['user_role']
          token: string
          status: Database['public']['Enums']['invitation_status']
          invited_by: string | null
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          email: string
          role?: Database['public']['Enums']['user_role']
          token?: string
          status?: Database['public']['Enums']['invitation_status']
          invited_by?: string | null
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          role?: Database['public']['Enums']['user_role']
          token?: string
          status?: Database['public']['Enums']['invitation_status']
          invited_by?: string | null
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tenant_modules: {
        Row: {
          id: string
          tenant_id: string
          module_type: Database['public']['Enums']['module_type']
          is_active: boolean
          fallback_type: Database['public']['Enums']['fallback_type']
          fallback_config: Json
          config: Json
          activated_at: string | null
          deactivated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          module_type: Database['public']['Enums']['module_type']
          is_active?: boolean
          fallback_type?: Database['public']['Enums']['fallback_type']
          fallback_config?: Json
          config?: Json
          activated_at?: string | null
          deactivated_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          module_type?: Database['public']['Enums']['module_type']
          is_active?: boolean
          fallback_type?: Database['public']['Enums']['fallback_type']
          fallback_config?: Json
          config?: Json
          activated_at?: string | null
          deactivated_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      end_users: {
        Row: {
          id: string
          tenant_id: string
          external_id: string | null
          channel_ids: Json
          profile: Json
          consent_given: boolean
          last_seen_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          external_id?: string | null
          channel_ids?: Json
          profile?: Json
          consent_given?: boolean
          last_seen_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          external_id?: string | null
          channel_ids?: Json
          profile?: Json
          consent_given?: boolean
          last_seen_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      journey_templates: {
        Row: {
          id: string
          tenant_id: string
          sector: Database['public']['Enums']['sector_type']
          name: string
          stages_config: Json
          ih_checkpoints: Json
          is_active: boolean
          is_default: boolean
          version: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          sector: Database['public']['Enums']['sector_type']
          name: string
          stages_config?: Json
          ih_checkpoints?: Json
          is_active?: boolean
          is_default?: boolean
          version?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          sector?: Database['public']['Enums']['sector_type']
          name?: string
          stages_config?: Json
          ih_checkpoints?: Json
          is_active?: boolean
          is_default?: boolean
          version?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          tenant_id: string
          end_user_id: string
          template_id: string | null
          current_stage: Database['public']['Enums']['module_type'] | null
          channel: Database['public']['Enums']['channel_type']
          status: Database['public']['Enums']['session_status']
          actor_control: Database['public']['Enums']['actor_control']
          assigned_operator: string | null
          metadata: Json
          started_at: string
          last_activity_at: string
          closed_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          end_user_id: string
          template_id?: string | null
          current_stage?: Database['public']['Enums']['module_type'] | null
          channel: Database['public']['Enums']['channel_type']
          status?: Database['public']['Enums']['session_status']
          actor_control?: Database['public']['Enums']['actor_control']
          assigned_operator?: string | null
          metadata?: Json
          started_at?: string
          last_activity_at?: string
          closed_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          end_user_id?: string
          template_id?: string | null
          current_stage?: Database['public']['Enums']['module_type'] | null
          channel?: Database['public']['Enums']['channel_type']
          status?: Database['public']['Enums']['session_status']
          actor_control?: Database['public']['Enums']['actor_control']
          assigned_operator?: string | null
          metadata?: Json
          started_at?: string
          last_activity_at?: string
          closed_at?: string | null
        }
        Relationships: []
      }
      interactions: {
        Row: {
          id: string
          session_id: string
          tenant_id: string
          actor_type: Database['public']['Enums']['actor_type']
          actor_id: string | null
          content: string
          stage: Database['public']['Enums']['module_type'] | null
          channel: Database['public']['Enums']['channel_type'] | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          tenant_id: string
          actor_type: Database['public']['Enums']['actor_type']
          actor_id?: string | null
          content: string
          stage?: Database['public']['Enums']['module_type'] | null
          channel?: Database['public']['Enums']['channel_type'] | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          tenant_id?: string
          actor_type?: Database['public']['Enums']['actor_type']
          actor_id?: string | null
          content?: string
          stage?: Database['public']['Enums']['module_type'] | null
          channel?: Database['public']['Enums']['channel_type'] | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      ai_decisions: {
        Row: {
          id: string
          interaction_id: string
          tenant_id: string
          agent_type: string
          model: string
          confidence: number | null
          reasoning: string | null
          action_taken: string | null
          tools_used: Json
          prompt_tokens: number | null
          completion_tokens: number | null
          latency_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          interaction_id: string
          tenant_id: string
          agent_type: string
          model?: string
          confidence?: number | null
          reasoning?: string | null
          action_taken?: string | null
          tools_used?: Json
          prompt_tokens?: number | null
          completion_tokens?: number | null
          latency_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          interaction_id?: string
          tenant_id?: string
          agent_type?: string
          model?: string
          confidence?: number | null
          reasoning?: string | null
          action_taken?: string | null
          tools_used?: Json
          prompt_tokens?: number | null
          completion_tokens?: number | null
          latency_ms?: number | null
          created_at?: string
        }
        Relationships: []
      }
      cognitive_checkpoints: {
        Row: {
          id: string
          session_id: string
          tenant_id: string
          assigned_to: string | null
          trigger_reason: string
          status: Database['public']['Enums']['checkpoint_status']
          ai_recommendation: string | null
          confidence_at_trigger: number | null
          ih_decision: string | null
          ih_override_reason: string | null
          resolved_at: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          tenant_id: string
          assigned_to?: string | null
          trigger_reason: string
          status?: Database['public']['Enums']['checkpoint_status']
          ai_recommendation?: string | null
          confidence_at_trigger?: number | null
          ih_decision?: string | null
          ih_override_reason?: string | null
          resolved_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          tenant_id?: string
          assigned_to?: string | null
          trigger_reason?: string
          status?: Database['public']['Enums']['checkpoint_status']
          ai_recommendation?: string | null
          confidence_at_trigger?: number | null
          ih_decision?: string | null
          ih_override_reason?: string | null
          resolved_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      escalations: {
        Row: {
          id: string
          session_id: string
          tenant_id: string
          assigned_to: string | null
          trigger_reason: string
          confidence_at_trigger: number | null
          customer_sentiment: string | null
          context_summary: string | null
          outcome: Database['public']['Enums']['escalation_outcome'] | null
          resolved_by: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          tenant_id: string
          assigned_to?: string | null
          trigger_reason: string
          confidence_at_trigger?: number | null
          customer_sentiment?: string | null
          context_summary?: string | null
          outcome?: Database['public']['Enums']['escalation_outcome'] | null
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          tenant_id?: string
          assigned_to?: string | null
          trigger_reason?: string
          confidence_at_trigger?: number | null
          customer_sentiment?: string | null
          context_summary?: string | null
          outcome?: Database['public']['Enums']['escalation_outcome'] | null
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          tenant_id: string | null
          session_id: string | null
          actor_type: Database['public']['Enums']['actor_type']
          actor_id: string | null
          event_type: string
          payload: Json
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          session_id?: string | null
          actor_type: Database['public']['Enums']['actor_type']
          actor_id?: string | null
          event_type: string
          payload?: Json
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          session_id?: string | null
          actor_type?: Database['public']['Enums']['actor_type']
          actor_id?: string | null
          event_type?: string
          payload?: Json
          ip_address?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      sector_type: 'banking' | 'retail' | 'health' | 'telecom' | 'government'
      module_type: 'consultation' | 'sales' | 'transactions' | 'feedback'
      channel_type: 'whatsapp' | 'web_chat' | 'email'
      actor_type: 'AI' | 'HUMAN' | 'SYSTEM'
      actor_control: 'AI' | 'HUMAN' | 'MIXED'
      session_status: 'active' | 'escalated' | 'human_takeover' | 'completed' | 'abandoned'
      checkpoint_status: 'pending' | 'approved' | 'rejected' | 'overridden' | 'expired'
      escalation_outcome: 'resolved_by_human' | 'returned_to_ai' | 'closed' | 'transferred'
      user_role: 'superadmin' | 'tenant_admin' | 'supervisor' | 'operator'
      fallback_type: 'ih_handoff' | 'redirect_url' | 'skip'
      invitation_status: 'pending' | 'accepted' | 'expired' | 'revoked'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
