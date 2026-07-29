/*
 * Bootstrap database type used until `npm run db:types` can connect to the
 * Supabase project and replace this file with the generated schema.
 *
 * It intentionally models JSON and database boundaries as unknown rather than
 * pretending handwritten row shapes are generated truth. Runtime contracts in
 * src/contracts validate every new RPC response.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type GenericTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

type GenericFunction = {
  Args: Record<string, unknown>;
  Returns: Json;
};

export type Database = {
  public: {
    Tables: {
      charts: {
        Row: {
          id: string;
          owner_id: string;
          folder_id: string | null;
          name: string;
          nodes: Json;
          edges: Json;
          thumbnail_url: string | null;
          is_public: boolean;
          public_access_level: "view" | "edit";
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      chart_folders: GenericTable;
      chart_shares: GenericTable;
      chart_versions: GenericTable;
      org_units: GenericTable;
      org_offices: GenericTable;
      positions: GenericTable;
      position_assignments: GenericTable;
      staff: GenericTable;
      staff_import_batches: GenericTable;
      staff_placements: GenericTable;
      staff_sensitive: GenericTable;
      job_titles: GenericTable;
      skills: GenericTable;
      staff_skill_history: GenericTable;
      job_title_skill_requirements: GenericTable;
      user_roles: GenericTable;
    };
    Views: Record<string, never>;
    Functions: Record<string, GenericFunction>;
    Enums: {
      app_role: "hr_admin";
    };
    CompositeTypes: Record<string, never>;
  };
};
