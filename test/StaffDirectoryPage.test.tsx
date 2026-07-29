import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/services/staffService", () => ({
  archiveStaff: vi.fn(),
  listHrStaff: vi.fn(async () => [
    {
      id: "00000000-0000-4000-8000-000000000001",
      employeeId: "GDT-001",
      name: "Test Officer",
      nameEn: null,
      age: 30,
      gender: "unspecified",
      status: "active",
      currentPosition: null,
      education: null,
      phone: null,
      email: null,
      address: null,
      maritalStatus: "unspecified",
      nationalId: null,
      createdAt: "2026-07-29T02:36:10+00:00",
      updatedAt: "2026-07-29T02:36:10+00:00",
    },
  ]),
}));

vi.mock("../src/services/staffProfileService", () => ({
  loadStaffProfile: vi.fn(async () => ({
    access: "hr",
    id: "00000000-0000-4000-8000-000000000001",
    employeeId: "GDT-001",
    name: "Test Officer",
    nameEn: null,
    age: 30,
    gender: "unspecified",
    status: "active",
    currentPosition: null,
    phone: null,
    email: null,
    address: null,
    maritalStatus: "unspecified",
    education: null,
    assignmentHistory: [],
    skills: [],
    nationalId: null,
  })),
}));

import StaffDirectoryPage from "../src/pages/StaffDirectoryPage";

describe("Staff Directory profile action", () => {
  it("opens the selected HR staff profile", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <StaffDirectoryPage />
      </MemoryRouter>,
    );

    await user.click(
      await screen.findByRole("button", {
        name: "View profile for Test Officer",
      }),
    );

    expect(
      await screen.findByRole("dialog", { name: "Staff Profile" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Test Officer").length).toBeGreaterThan(0);
  });
});
