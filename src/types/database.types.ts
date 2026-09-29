/*
 * Typed database schema derived from the DDL in migrations/.
 *
 * It models database boundaries compatible with Supabase client inference.
 * Explicit typed row types (StaffRow, OrgUnitRow, JobTitleRow, etc.)
 * are exported below for typed query projections and service boundaries.
 * Runtime contracts in src/contracts/ validate every RPC response.
 *
 * To regenerate from the live project:  npm run db:types
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

// ── Exported typed row definitions for application domain use ─────

export type ChartRow = {
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
  [key: string]: unknown;
};

export type StaffRow = {
  id: string;
  employee_id: string | null;
  name: string;
  name_en: string | null;
  date_of_birth: string | null;
  joined_date: string | null;
  retired_date: string | null;
  gender: "male" | "female" | "unspecified";
  status: "active" | "archived";
  education: string | null;
  major: string | null;
  phone: string | null;
  address: string | null;
  other_information: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
};

export type OrgUnitRow = {
  id: string;
  name: string;
  name_en: string | null;
  code: string | null;
  type: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  [key: string]: unknown;
};

export type OrgOfficeRow = {
  id: string;
  org_unit_id: string;
  name: string;
  name_en: string | null;
  sort_order: number;
  created_at: string;
  [key: string]: unknown;
};

export type JobTitleRow = {
  id: string;
  name: string;
  name_en: string | null;
  rank_order: number;
  position_scope: "department" | "office" | "individual";
  created_at: string;
  [key: string]: unknown;
};

export type PositionRow = {
  id: string;
  chart_id: string;
  node_id: string;
  job_title_id: string;
  org_unit_id: string | null;
  org_office_id: string | null;
  created_at: string;
  [key: string]: unknown;
};

export type PositionAssignmentRow = {
  id: string;
  position_id: string;
  staff_id: string;
  start_date: string;
  end_date: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
  [key: string]: unknown;
};

export type ChartVersionRow = {
  id: string;
  chart_id: string;
  nodes: Json;
  edges: Json;
  created_at: string;
  [key: string]: unknown;
};

export type ChartShareRow = {
  id: string;
  chart_id: string;
  shared_with_id: string;
  access_level: "view" | "edit";
  created_at: string;
  [key: string]: unknown;
};

// ── Database schema ───────────────────────────────────────────────

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
