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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          created_at: string
          description: string | null
          id: string
          module_id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          module_id: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          course_id: string
          id: string
          issued_at: string
          pdf_url: string | null
          user_id: string
          verification_code: string
        }
        Insert: {
          certificate_number: string
          course_id: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          user_id: string
          verification_code: string
        }
        Update: {
          certificate_number?: string
          course_id?: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          user_id?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          instructor_id: string
          is_approved: boolean
          is_published: boolean
          period_end: string | null
          period_start: string | null
          slug: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instructor_id: string
          is_approved?: boolean
          is_published?: boolean
          period_end?: string | null
          period_start?: string | null
          slug: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instructor_id?: string
          is_approved?: boolean
          is_published?: boolean
          period_end?: string | null
          period_start?: string | null
          slug?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          progress_percentage: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          progress_percentage?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          progress_percentage?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string | null
          created_at: string
          document_url: string | null
          duration_minutes: number | null
          id: string
          lesson_type: Database["public"]["Enums"]["lesson_type"]
          module_id: string
          chapter_id: string | null
          order_index: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          document_url?: string | null
          duration_minutes?: number | null
          id?: string
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          module_id: string
          chapter_id?: string | null
          order_index: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          document_url?: string | null
          duration_minutes?: number | null
          id?: string
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          module_id?: string
          chapter_id?: string | null
          order_index?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          category_id: string | null
          certifications: string[] | null
          created_at: string
          experience_years: number | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          category_id?: string | null
          certifications?: string[] | null
          created_at?: string
          experience_years?: number | null
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          category_id?: string | null
          certifications?: string[] | null
          created_at?: string
          experience_years?: number | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          attempted_at: string
          id: string
          passed: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          answers: Json
          attempted_at?: string
          id?: string
          passed: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Update: {
          answers?: Json
          attempted_at?: string
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          id: string
          options: Json
          order_index: number
          question_text: string
          question_type: string
          quiz_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          id?: string
          options: Json
          order_index: number
          question_text: string
          question_type?: string
          quiz_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          id?: string
          options?: Json
          order_index?: number
          question_text?: string
          question_type?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          lesson_id: string | null
          module_id: string | null
          course_id: string | null
          passing_score: number
          title: string
          is_final_assessment: boolean
          time_limit_minutes: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          module_id?: string | null
          course_id?: string | null
          passing_score?: number
          title: string
          is_final_assessment?: boolean
          time_limit_minutes?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          module_id?: string | null
          course_id?: string | null
          passing_score?: number
          title?: string
          is_final_assessment?: boolean
          time_limit_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      // ============================================================
      // INCUBATION TABLES
      // ============================================================
      startup_profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          sector: string
          stage: Database["public"]["Enums"]["incubation_stage"]
          team_size: number
          founded_at: string | null
          website_url: string | null
          description: string | null
          logo_url: string | null
          equity_signed: boolean
          equity_signed_at: string | null
          coach_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          sector: string
          stage?: Database["public"]["Enums"]["incubation_stage"]
          team_size?: number
          founded_at?: string | null
          website_url?: string | null
          description?: string | null
          logo_url?: string | null
          equity_signed?: boolean
          equity_signed_at?: string | null
          coach_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          sector?: string
          stage?: Database["public"]["Enums"]["incubation_stage"]
          team_size?: number
          founded_at?: string | null
          website_url?: string | null
          description?: string | null
          logo_url?: string | null
          equity_signed?: boolean
          equity_signed_at?: string | null
          coach_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      diagnostic_submissions: {
        Row: {
          id: string
          startup_id: string
          answers: Json
          sector: string
          submitted_at: string
          reviewed_by: string | null
          reviewed_at: string | null
          status: string
        }
        Insert: {
          id?: string
          startup_id: string
          answers?: Json
          sector: string
          submitted_at?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          startup_id?: string
          answers?: Json
          sector?: string
          submitted_at?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_submissions_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startup_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_scores: {
        Row: {
          id: string
          submission_id: string
          startup_id: string
          score_team: number
          score_market: number
          score_feasibility: number
          score_innovation: number
          score_total: number
          strengths: string[] | null
          improvements: string[] | null
          recommendation: string | null
          pdf_url: string | null
          calculated_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          startup_id: string
          score_team?: number
          score_market?: number
          score_feasibility?: number
          score_innovation?: number
          strengths?: string[] | null
          improvements?: string[] | null
          recommendation?: string | null
          pdf_url?: string | null
          calculated_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          startup_id?: string
          score_team?: number
          score_market?: number
          score_feasibility?: number
          score_innovation?: number
          strengths?: string[] | null
          improvements?: string[] | null
          recommendation?: string | null
          pdf_url?: string | null
          calculated_at?: string
        }
        Relationships: []
      }
      incubation_roadmaps: {
        Row: {
          id: string
          startup_id: string
          title: string
          description: string | null
          start_date: string
          end_date: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          startup_id: string
          title?: string
          description?: string | null
          start_date?: string
          end_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          startup_id?: string
          title?: string
          description?: string | null
          start_date?: string
          end_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      roadmap_milestones: {
        Row: {
          id: string
          roadmap_id: string
          title: string
          description: string | null
          due_date: string | null
          order_index: number
          status: string
          category: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          roadmap_id: string
          title: string
          description?: string | null
          due_date?: string | null
          order_index?: number
          status?: string
          category?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          roadmap_id?: string
          title?: string
          description?: string | null
          due_date?: string | null
          order_index?: number
          status?: string
          category?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      coaching_bookings: {
        Row: {
          id: string
          startup_id: string
          coach_id: string
          booked_by: string
          scheduled_at: string
          duration_min: number
          topic: string | null
          notes: string | null
          meeting_url: string | null
          status: string
          feedback: string | null
          rating: number | null
          created_at: string
        }
        Insert: {
          id?: string
          startup_id: string
          coach_id: string
          booked_by: string
          scheduled_at: string
          duration_min?: number
          topic?: string | null
          notes?: string | null
          meeting_url?: string | null
          status?: string
          feedback?: string | null
          rating?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          startup_id?: string
          coach_id?: string
          booked_by?: string
          scheduled_at?: string
          duration_min?: number
          topic?: string | null
          notes?: string | null
          meeting_url?: string | null
          status?: string
          feedback?: string | null
          rating?: number | null
          created_at?: string
        }
        Relationships: []
      }
      kpi_reports: {
        Row: {
          id: string
          startup_id: string
          report_month: string
          revenue: number
          revenue_target: number | null
          active_users: number
          active_users_target: number | null
          retention_rate: number
          retention_rate_target: number | null
          prototype_progress: number
          extra_metrics: Json
          notes: string | null
          submitted_by: string | null
          submitted_at: string
          is_late: boolean
          early_warning_triggered: boolean
        }
        Insert: {
          id?: string
          startup_id: string
          report_month: string
          revenue?: number
          revenue_target?: number | null
          active_users?: number
          active_users_target?: number | null
          retention_rate?: number
          retention_rate_target?: number | null
          prototype_progress?: number
          extra_metrics?: Json
          notes?: string | null
          submitted_by?: string | null
          submitted_at?: string
          is_late?: boolean
          early_warning_triggered?: boolean
        }
        Update: {
          id?: string
          startup_id?: string
          report_month?: string
          revenue?: number
          revenue_target?: number | null
          active_users?: number
          active_users_target?: number | null
          retention_rate?: number
          retention_rate_target?: number | null
          prototype_progress?: number
          extra_metrics?: Json
          notes?: string | null
          submitted_by?: string | null
          submitted_at?: string
          is_late?: boolean
          early_warning_triggered?: boolean
        }
        Relationships: []
      }
      fablab_machines: {
        Row: {
          id: string
          name: string
          type: string
          description: string | null
          is_available: boolean
          image_url: string | null
          location: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          description?: string | null
          is_available?: boolean
          image_url?: string | null
          location?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          description?: string | null
          is_available?: boolean
          image_url?: string | null
          location?: string | null
          created_at?: string
        }
        Relationships: []
      }
      fablab_reservations: {
        Row: {
          id: string
          startup_id: string
          machine_id: string
          reserved_by: string
          start_at: string
          end_at: string
          purpose: string | null
          status: string
          access_code: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          startup_id: string
          machine_id: string
          reserved_by: string
          start_at: string
          end_at: string
          purpose?: string | null
          status?: string
          access_code?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          startup_id?: string
          machine_id?: string
          reserved_by?: string
          start_at?: string
          end_at?: string
          purpose?: string | null
          status?: string
          access_code?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      incubation_messages: {
        Row: {
          id: string
          startup_id: string
          sender_id: string
          channel: string
          content: string
          attachments: Json
          is_pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          startup_id: string
          sender_id: string
          channel?: string
          content: string
          attachments?: Json
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          startup_id?: string
          sender_id?: string
          channel?: string
          content?: string
          attachments?: Json
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      jury_evaluations: {
        Row: {
          id: string
          startup_id: string
          juror_id: string
          score_pitch: number | null
          score_financials: number | null
          score_market: number | null
          score_team: number | null
          score_innovation: number | null
          score_total: number
          comments: string | null
          recommendation: string | null
          evaluated_at: string
        }
        Insert: {
          id?: string
          startup_id: string
          juror_id: string
          score_pitch?: number | null
          score_financials?: number | null
          score_market?: number | null
          score_team?: number | null
          score_innovation?: number | null
          comments?: string | null
          recommendation?: string | null
          evaluated_at?: string
        }
        Update: {
          id?: string
          startup_id?: string
          juror_id?: string
          score_pitch?: number | null
          score_financials?: number | null
          score_market?: number | null
          score_team?: number | null
          score_innovation?: number | null
          comments?: string | null
          recommendation?: string | null
          evaluated_at?: string
        }
        Relationships: []
      }
      incubation_labels: {
        Row: {
          id: string
          startup_id: string
          label_number: string
          issued_at: string
          issued_by: string | null
          verification_code: string
          pdf_url: string | null
          average_jury_score: number | null
          is_revoked: boolean
          revoked_at: string | null
          revoked_reason: string | null
        }
        Insert: {
          id?: string
          startup_id: string
          label_number: string
          issued_at?: string
          issued_by?: string | null
          verification_code?: string
          pdf_url?: string | null
          average_jury_score?: number | null
          is_revoked?: boolean
          revoked_at?: string | null
          revoked_reason?: string | null
        }
        Update: {
          id?: string
          startup_id?: string
          label_number?: string
          issued_at?: string
          issued_by?: string | null
          verification_code?: string
          pdf_url?: string | null
          average_jury_score?: number | null
          is_revoked?: boolean
          revoked_at?: string | null
          revoked_reason?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      check_password_reset_rate_limit: {
        Args: {
          user_email: string
        }
        Returns: boolean
      }
      log_password_reset_attempt: {
        Args: {
          p_email: string
        }
        Returns: void
      }
    }
    Enums: {
      app_role: "apprenant" | "formateur" | "superviseur" | "superadmin" | "editeur" | "incube"
      lesson_type: "video" | "text" | "document" | "quiz" | "live"
      priority_level: "low" | "medium" | "high"
      incubation_stage: "diagnostic" | "onboarding" | "acceleration" | "pilotage" | "labellisation" | "certifie"
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
      app_role: ["apprenant", "formateur", "superviseur", "superadmin", "editeur", "incube"],
      lesson_type: ["video", "text", "document", "quiz", "live"],
      priority_level: ["low", "medium", "high"],
      incubation_stage: ["diagnostic", "onboarding", "acceleration", "pilotage", "labellisation", "certifie"],
    },
  },
} as const
