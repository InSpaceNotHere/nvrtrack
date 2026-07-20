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
      exercise_catalog: {
        Row: {
          aliases: string[]
          body_region: string | null
          created_at: string
          equipment: string
          id: string
          instructions: string | null
          is_active: boolean
          muscle_metadata_version: number
          movement_pattern: string
          name: string
          normalized_name: string
          primary_muscle_group: string
          primary_muscles: string[]
          secondary_muscle_groups: string[]
          secondary_muscles: string[]
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          body_region?: string | null
          created_at?: string
          equipment: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          muscle_metadata_version?: number
          movement_pattern: string
          name: string
          normalized_name: string
          primary_muscle_group: string
          primary_muscles?: string[]
          secondary_muscle_groups?: string[]
          secondary_muscles?: string[]
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          body_region?: string | null
          created_at?: string
          equipment?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          muscle_metadata_version?: number
          movement_pattern?: string
          name?: string
          normalized_name?: string
          primary_muscle_group?: string
          primary_muscles?: string[]
          secondary_muscle_groups?: string[]
          secondary_muscles?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          body_region: string | null
          created_at: string
          equipment: string | null
          id: string
          muscle_group: string | null
          muscle_metadata_version: number
          movement_pattern: string | null
          name: string
          notes: string | null
          primary_muscles: string[]
          secondary_muscles: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          body_region?: string | null
          created_at?: string
          equipment?: string | null
          id?: string
          muscle_group?: string | null
          muscle_metadata_version?: number
          movement_pattern?: string | null
          name: string
          notes?: string | null
          primary_muscles?: string[]
          secondary_muscles?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          body_region?: string | null
          created_at?: string
          equipment?: string | null
          id?: string
          muscle_group?: string | null
          muscle_metadata_version?: number
          movement_pattern?: string | null
          name?: string
          notes?: string | null
          primary_muscles?: string[]
          secondary_muscles?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_catalog: {
        Row: {
          aliases: string[]
          brand_name: string | null
          brand_owner: string | null
          calories_per_100g: number | null
          carbohydrate_g_per_100g: number | null
          created_at: string
          data_type: string
          description: string
          fat_g_per_100g: number | null
          fdc_id: number
          fiber_g_per_100g: number | null
          food_category: string | null
          gtin_upc: string | null
          id: string
          ingredients: string | null
          is_active: boolean
          normalized_name: string
          protein_g_per_100g: number | null
          retrieved_at: string
          serving_size: number | null
          serving_unit: string | null
          serving_weight_grams: number | null
          sodium_mg_per_100g: number | null
          source_modified_date: string | null
          source_published_date: string | null
          sugar_g_per_100g: number | null
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          brand_name?: string | null
          brand_owner?: string | null
          calories_per_100g?: number | null
          carbohydrate_g_per_100g?: number | null
          created_at?: string
          data_type: string
          description: string
          fat_g_per_100g?: number | null
          fdc_id: number
          fiber_g_per_100g?: number | null
          food_category?: string | null
          gtin_upc?: string | null
          id?: string
          ingredients?: string | null
          is_active?: boolean
          normalized_name: string
          protein_g_per_100g?: number | null
          retrieved_at?: string
          serving_size?: number | null
          serving_unit?: string | null
          serving_weight_grams?: number | null
          sodium_mg_per_100g?: number | null
          source_modified_date?: string | null
          source_published_date?: string | null
          sugar_g_per_100g?: number | null
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          brand_name?: string | null
          brand_owner?: string | null
          calories_per_100g?: number | null
          carbohydrate_g_per_100g?: number | null
          created_at?: string
          data_type?: string
          description?: string
          fat_g_per_100g?: number | null
          fdc_id?: number
          fiber_g_per_100g?: number | null
          food_category?: string | null
          gtin_upc?: string | null
          id?: string
          ingredients?: string | null
          is_active?: boolean
          normalized_name?: string
          protein_g_per_100g?: number | null
          retrieved_at?: string
          serving_size?: number | null
          serving_unit?: string | null
          serving_weight_grams?: number | null
          sodium_mg_per_100g?: number | null
          source_modified_date?: string | null
          source_published_date?: string | null
          sugar_g_per_100g?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      food_entries: {
        Row: {
          amount_grams: number | null
          amount_unit: string | null
          amount_value: number | null
          brand_name: string | null
          calories_per_100g: number | null
          calories_per_serving: number
          carbohydrate_g_per_100g: number | null
          carbohydrate_per_serving_g: number
          catalog_food_id: string | null
          created_at: string
          entry_date: string
          fat_g_per_100g: number | null
          fat_per_serving_g: number
          fdc_id: number | null
          fiber_g_per_100g: number | null
          fiber_per_serving_g: number | null
          food_id: string | null
          food_name: string
          id: string
          meal_type: string
          note: string | null
          protein_g_per_100g: number | null
          protein_per_serving_g: number
          serving_size: number
          serving_unit: string
          servings: number
          sodium_mg_per_100g: number | null
          source_brand: string | null
          source_data_type: string | null
          source_description: string | null
          source_gtin_upc: string | null
          source_name: string | null
          source_retrieved_at: string | null
          source_serving_quantity: number | null
          source_serving_unit: string | null
          source_serving_weight_grams: number | null
          source_status: string | null
          sugar_g_per_100g: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_grams?: number | null
          amount_unit?: string | null
          amount_value?: number | null
          brand_name?: string | null
          calories_per_100g?: number | null
          calories_per_serving: number
          carbohydrate_g_per_100g?: number | null
          carbohydrate_per_serving_g?: number
          catalog_food_id?: string | null
          created_at?: string
          entry_date: string
          fat_g_per_100g?: number | null
          fat_per_serving_g?: number
          fdc_id?: number | null
          fiber_g_per_100g?: number | null
          fiber_per_serving_g?: number | null
          food_id?: string | null
          food_name: string
          id?: string
          meal_type: string
          note?: string | null
          protein_g_per_100g?: number | null
          protein_per_serving_g?: number
          serving_size: number
          serving_unit: string
          servings?: number
          sodium_mg_per_100g?: number | null
          source_brand?: string | null
          source_data_type?: string | null
          source_description?: string | null
          source_gtin_upc?: string | null
          source_name?: string | null
          source_retrieved_at?: string | null
          source_serving_quantity?: number | null
          source_serving_unit?: string | null
          source_serving_weight_grams?: number | null
          source_status?: string | null
          sugar_g_per_100g?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_grams?: number | null
          amount_unit?: string | null
          amount_value?: number | null
          brand_name?: string | null
          calories_per_100g?: number | null
          calories_per_serving?: number
          carbohydrate_g_per_100g?: number | null
          carbohydrate_per_serving_g?: number
          catalog_food_id?: string | null
          created_at?: string
          entry_date?: string
          fat_g_per_100g?: number | null
          fat_per_serving_g?: number
          fdc_id?: number | null
          fiber_g_per_100g?: number | null
          fiber_per_serving_g?: number | null
          food_id?: string | null
          food_name?: string
          id?: string
          meal_type?: string
          note?: string | null
          protein_g_per_100g?: number | null
          protein_per_serving_g?: number
          serving_size?: number
          serving_unit?: string
          servings?: number
          sodium_mg_per_100g?: number | null
          source_brand?: string | null
          source_data_type?: string | null
          source_description?: string | null
          source_gtin_upc?: string | null
          source_name?: string | null
          source_retrieved_at?: string | null
          source_serving_quantity?: number | null
          source_serving_unit?: string | null
          source_serving_weight_grams?: number | null
          source_status?: string | null
          sugar_g_per_100g?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_entries_catalog_food_id_fkey"
            columns: ["catalog_food_id"]
            isOneToOne: false
            referencedRelation: "food_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_entries_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          brand: string | null
          calories: number
          calories_per_100g: number | null
          carbohydrate_g: number
          carbohydrate_g_per_100g: number | null
          catalog_food_id: string | null
          created_at: string
          fat_g: number
          fat_g_per_100g: number | null
          fdc_id: number | null
          fiber_g: number | null
          fiber_g_per_100g: number | null
          id: string
          name: string
          protein_g: number
          protein_g_per_100g: number | null
          serving_size: number
          serving_unit: string
          serving_weight_grams: number | null
          sodium_mg_per_100g: number | null
          source_brand: string | null
          source_data_type: string | null
          source_description: string | null
          source_gtin_upc: string | null
          source_name: string | null
          source_retrieved_at: string | null
          source_status: string | null
          sugar_g_per_100g: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          calories: number
          calories_per_100g?: number | null
          carbohydrate_g?: number
          carbohydrate_g_per_100g?: number | null
          catalog_food_id?: string | null
          created_at?: string
          fat_g?: number
          fat_g_per_100g?: number | null
          fdc_id?: number | null
          fiber_g?: number | null
          fiber_g_per_100g?: number | null
          id?: string
          name: string
          protein_g?: number
          protein_g_per_100g?: number | null
          serving_size: number
          serving_unit: string
          serving_weight_grams?: number | null
          sodium_mg_per_100g?: number | null
          source_brand?: string | null
          source_data_type?: string | null
          source_description?: string | null
          source_gtin_upc?: string | null
          source_name?: string | null
          source_retrieved_at?: string | null
          source_status?: string | null
          sugar_g_per_100g?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          calories?: number
          calories_per_100g?: number | null
          carbohydrate_g?: number
          carbohydrate_g_per_100g?: number | null
          catalog_food_id?: string | null
          created_at?: string
          fat_g?: number
          fat_g_per_100g?: number | null
          fdc_id?: number | null
          fiber_g?: number | null
          fiber_g_per_100g?: number | null
          id?: string
          name?: string
          protein_g?: number
          protein_g_per_100g?: number | null
          serving_size?: number
          serving_unit?: string
          serving_weight_grams?: number | null
          sodium_mg_per_100g?: number | null
          source_brand?: string | null
          source_data_type?: string | null
          source_description?: string | null
          source_gtin_upc?: string | null
          source_name?: string | null
          source_retrieved_at?: string | null
          source_status?: string | null
          sugar_g_per_100g?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "foods_catalog_food_id_fkey"
            columns: ["catalog_food_id"]
            isOneToOne: false
            referencedRelation: "food_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          calorie_goal: number | null
          carbohydrate_goal: number | null
          created_at: string
          display_name: string | null
          fat_goal: number | null
          height_inches: number | null
          id: string
          preferred_weight_unit: string
          protein_goal: number | null
          updated_at: string
        }
        Insert: {
          calorie_goal?: number | null
          carbohydrate_goal?: number | null
          created_at?: string
          display_name?: string | null
          fat_goal?: number | null
          height_inches?: number | null
          id: string
          preferred_weight_unit?: string
          protein_goal?: number | null
          updated_at?: string
        }
        Update: {
          calorie_goal?: number | null
          carbohydrate_goal?: number | null
          created_at?: string
          display_name?: string | null
          fat_goal?: number | null
          height_inches?: number | null
          id?: string
          preferred_weight_unit?: string
          protein_goal?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      weight_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          note: string | null
          unit: string
          updated_at: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          entry_date: string
          id?: string
          note?: string | null
          unit?: string
          updated_at?: string
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          note?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          catalog_exercise_id: string | null
          created_at: string
          exercise_id: string | null
          exercise_name: string
          id: string
          notes: string | null
          position: number
          source_body_region: string | null
          source_movement_pattern: string | null
          source_muscle_metadata_version: number | null
          source_primary_muscles: string[]
          source_secondary_muscles: string[]
          updated_at: string
          user_id: string
          workout_id: string
        }
        Insert: {
          catalog_exercise_id?: string | null
          created_at?: string
          exercise_id?: string | null
          exercise_name: string
          id?: string
          notes?: string | null
          position: number
          source_body_region?: string | null
          source_movement_pattern?: string | null
          source_muscle_metadata_version?: number | null
          source_primary_muscles?: string[]
          source_secondary_muscles?: string[]
          updated_at?: string
          user_id: string
          workout_id: string
        }
        Update: {
          catalog_exercise_id?: string | null
          created_at?: string
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          notes?: string | null
          position?: number
          source_body_region?: string | null
          source_movement_pattern?: string | null
          source_muscle_metadata_version?: number | null
          source_primary_muscles?: string[]
          source_secondary_muscles?: string[]
          updated_at?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_catalog_exercise_id_fkey"
            columns: ["catalog_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_owner_fkey"
            columns: ["workout_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          notes: string | null
          position: number
          reps: number | null
          rpe: number | null
          set_type: string
          updated_at: string
          user_id: string
          weight: number | null
          weight_unit: string | null
          workout_exercise_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          position: number
          reps?: number | null
          rpe?: number | null
          set_type?: string
          updated_at?: string
          user_id: string
          weight?: number | null
          weight_unit?: string | null
          workout_exercise_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          position?: number
          reps?: number | null
          rpe?: number | null
          set_type?: string
          updated_at?: string
          user_id?: string
          weight?: number | null
          weight_unit?: string | null
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_exercise_owner_fkey"
            columns: ["workout_exercise_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      workouts: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          started_at: string | null
          updated_at: string
          user_id: string
          workout_date: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          started_at?: string | null
          updated_at?: string
          user_id: string
          workout_date: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          started_at?: string | null
          updated_at?: string
          user_id?: string
          workout_date?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
