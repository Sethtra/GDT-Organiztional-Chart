import { z } from "zod";

import {
  HrStaffDirectoryRecordSchema,
  StaffDuplicateSchema,
  StaffInputSchema,
} from "../contracts/hr";
import type {
  HrStaffDirectoryRecord,
  StaffDuplicate,
  StaffInput,
} from "../contracts/hr";
import { supabase } from "../supabaseClient";

const DirectorySchema = z.array(HrStaffDirectoryRecordSchema);
const DuplicateListSchema = z.array(StaffDuplicateSchema);

function nullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function listHrStaff(
  includeArchived = false,
): Promise<HrStaffDirectoryRecord[]> {
  const { data, error } = await supabase.rpc("get_hr_staff_directory", {
    include_archived: includeArchived,
  });
  if (error) throw error;

  const parsed = DirectorySchema.safeParse(data ?? []);
  if (!parsed.success) {
    throw new Error("The staff directory response was malformed.");
  }
  return parsed.data;
}

export async function findStaffDuplicates(
  input: StaffInput,
  excludedStaffId: string | null = null,
): Promise<StaffDuplicate[]> {
  const validated = StaffInputSchema.parse(input);
  const { data, error } = await supabase.rpc("find_staff_duplicates", {
    candidate_employee_id: validated.employeeId,
    candidate_name: validated.name,
    candidate_date_of_birth: validated.dateOfBirth,
    excluded_staff_id: excludedStaffId,
  });
  if (error) throw error;

  const parsed = DuplicateListSchema.safeParse(data ?? []);
  if (!parsed.success) {
    throw new Error("The duplicate-check response was malformed.");
  }
  return parsed.data;
}

export async function saveStaff(
  input: StaffInput,
  staffId: string | null = null,
): Promise<string> {
  const validated = StaffInputSchema.parse(input);
  const { data, error } = await supabase.rpc("save_staff_record", {
    target_staff_id: staffId,
    employee_id_value: validated.employeeId,
    name_value: validated.name,
    name_en_value: nullable(validated.nameEn),
    job_title_id_value: validated.jobTitleId,
    date_of_birth_value: validated.dateOfBirth,
    joined_date_value: validated.joinedDate,
    retired_date_value: validated.retiredDate,
    gender_value: validated.gender,
    education_value: nullable(validated.education),
    phone_value: nullable(validated.phone),
    address_value: nullable(validated.address),
    marital_status_value: validated.maritalStatus,
    other_information_value: nullable(validated.otherInformation),
  });
  if (error) throw error;
  if (typeof data !== "string") {
    throw new Error("The staff save operation returned an invalid identifier.");
  }
  return data;
}

export async function archiveStaff(staffId: string): Promise<void> {
  const { error } = await supabase.rpc("archive_staff_record", {
    target_staff_id: staffId,
  });
  if (error) throw error;
}
