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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      credit_transactions: {
        Row: {
          amount: number
          created_at: string | null
          credit_type: string
          description: string | null
          id: string
          transaction_type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          credit_type: string
          description?: string | null
          id?: string
          transaction_type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          credit_type?: string
          description?: string | null
          id?: string
          transaction_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      builder_conversations: {
        Row: {
          id: string
          user_id: string
          lecture_id: string | null
          messages: Json
          original_prompt: string | null
          target_audience: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lecture_id?: string | null
          messages: Json
          original_prompt?: string | null
          target_audience?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lecture_id?: string | null
          messages?: Json
          original_prompt?: string | null
          target_audience?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      lectures: {
        Row: {
          created_at: string
          current_slide_index: number
          id: string
          lecture_code: string
          settings: Json | null
          slides: Json
          status: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_slide_index?: number
          id?: string
          lecture_code: string
          settings?: Json | null
          slides?: Json
          status?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_slide_index?: number
          id?: string
          lecture_code?: string
          settings?: Json | null
          slides?: Json
          status?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          answered_at: string | null
          created_at: string
          id: string
          is_answered: boolean
          lecture_id: string
          question: string
          student_id: string | null
        }
        Insert: {
          answered_at?: string | null
          created_at?: string
          id?: string
          is_answered?: boolean
          lecture_id: string
          question: string
          student_id?: string | null
        }
        Update: {
          answered_at?: string | null
          created_at?: string
          id?: string
          is_answered?: boolean
          lecture_id?: string
          question?: string
          student_id?: string | null
        }
        Relationships: []
      }
      responses: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean | null
          lecture_id: string
          points_earned: number | null
          response_data: Json
          slide_index: number
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          lecture_id: string
          points_earned?: number | null
          response_data: Json
          slide_index: number
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          lecture_id?: string
          points_earned?: number | null
          response_data?: Json
          slide_index?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          emoji: string
          id: string
          is_active: boolean
          lecture_id: string
          name: string
          points: number
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          is_active?: boolean
          lecture_id: string
          name: string
          points?: number
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          is_active?: boolean
          lecture_id?: string
          name?: string
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "students_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          features: Json | null
          id: string
          max_lectures: number | null
          max_slides: number | null
          monthly_ai_tokens: number
          monthly_vibe_credits: number
          name: string
          price_monthly_usd: number
          price_yearly_usd: number
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id?: string
          max_lectures?: number | null
          max_slides?: number | null
          monthly_ai_tokens?: number
          monthly_vibe_credits?: number
          name: string
          price_monthly_usd?: number
          price_yearly_usd?: number
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: string
          max_lectures?: number | null
          max_slides?: number | null
          monthly_ai_tokens?: number
          monthly_vibe_credits?: number
          name?: string
          price_monthly_usd?: number
          price_yearly_usd?: number
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          ai_tokens_balance: number
          ai_tokens_consumed: number
          last_refill_date: string | null
          presentations_created: number
          slides_created: number
          updated_at: string | null
          user_id: string
          vibe_credits_balance: number
        }
        Insert: {
          ai_tokens_balance?: number
          ai_tokens_consumed?: number
          last_refill_date?: string | null
          presentations_created?: number
          slides_created?: number
          updated_at?: string | null
          user_id: string
          vibe_credits_balance?: number
        }
        Update: {
          ai_tokens_balance?: number
          ai_tokens_consumed?: number
          last_refill_date?: string | null
          presentations_created?: number
          slides_created?: number
          updated_at?: string | null
          user_id?: string
          vibe_credits_balance?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          paypal_payer_id: string | null
          paypal_subscription_id: string | null
          plan_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          paypal_payer_id?: string | null
          paypal_subscription_id?: string | null
          plan_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          paypal_payer_id?: string | null
          paypal_subscription_id?: string | null
          plan_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
