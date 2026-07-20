export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          height_inches: number | null;
          calorie_goal: number | null;
          protein_goal: number | null;
          carbohydrate_goal: number | null;
          fat_goal: number | null;
          preferred_weight_unit: "lb" | "kg";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          height_inches?: number | null;
          calorie_goal?: number | null;
          protein_goal?: number | null;
          carbohydrate_goal?: number | null;
          fat_goal?: number | null;
          preferred_weight_unit?: "lb" | "kg";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          height_inches?: number | null;
          calorie_goal?: number | null;
          protein_goal?: number | null;
          carbohydrate_goal?: number | null;
          fat_goal?: number | null;
          preferred_weight_unit?: "lb" | "kg";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
            referencedSchema: "auth";
          },
        ];
      };
      weight_entries: {
        Row: {
          id: string;
          user_id: string;
          weight: number;
          unit: "lb" | "kg";
          entry_date: string;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          weight: number;
          unit?: "lb" | "kg";
          entry_date: string;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          weight?: number;
          unit?: "lb" | "kg";
          entry_date?: string;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "weight_entries_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
            referencedSchema: "auth";
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
