// Placeholder — regenerar con: pnpm db:types
// Este archivo es sobreescrito automáticamente por Supabase CLI

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T] extends { Row: infer R } ? R : never

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
