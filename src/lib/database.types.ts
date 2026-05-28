// Auto-generated Supabase database types
// Regenerate with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      students: {
        Row: {
          id: string
          full_name: string
          student_id: string
          section: string
          email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          student_id: string
          section: string
          email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          student_id?: string
          section?: string
          email?: string | null
          created_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          student_id: string
          appointment_date: string
          appointment_time: string
          status: 'pending' | 'approved' | 'rejected' | 'evaluated' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          appointment_date: string
          appointment_time: string
          status?: 'pending' | 'approved' | 'rejected' | 'evaluated' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          appointment_date?: string
          appointment_time?: string
          status?: 'pending' | 'approved' | 'rejected' | 'evaluated' | 'cancelled'
          created_at?: string
        }
      }
      evaluations: {
        Row: {
          id: string
          appointment_id: string
          evaluator_id: string
          functionality_score: number
          data_structure_score: number
          algorithm_score: number
          file_handling_score: number
          dataset_score: number
          ui_score: number
          code_quality_score: number
          documentation_score: number
          presentation_score: number
          total_score: number
          evaluator_comments: string
          recommendation: 'passed' | 'passed_with_revisions' | 'needs_major_revision' | 'failed'
          evaluated_at: string
        }
        Insert: {
          id?: string
          appointment_id: string
          evaluator_id: string
          functionality_score: number
          data_structure_score: number
          algorithm_score: number
          file_handling_score: number
          dataset_score: number
          ui_score: number
          code_quality_score: number
          documentation_score: number
          presentation_score: number
          total_score: number
          evaluator_comments: string
          recommendation: 'passed' | 'passed_with_revisions' | 'needs_major_revision' | 'failed'
          evaluated_at?: string
        }
        Update: Partial<Database['public']['Tables']['evaluations']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          admin_id: string
          action: string
          target_type: 'appointment' | 'evaluation' | 'student'
          target_id: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          target_type: 'appointment' | 'evaluation' | 'student'
          target_id: string
          metadata?: Json | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }
    }
    Views: {
      daily_slot_counts: {
        Row: {
          appointment_date: string
          booked_count: number
        }
      }
    }
    Functions: {
      get_daily_slot_info: {
        Args: { p_date: string }
        Returns: {
          appointment_date: string
          booked: number
          remaining: number
          is_full: boolean
        }[]
      }
    }
  }
}
