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
      dateOfBirth: "1996-01-15",
      joinedDate: "2020-03-01",
      retiredDate: null,
      gender: "unspecified",
      status: "active",
      jobTitle: {
        id: "00000000-0000-4000-8000-000000000006",
        name: "មន្ត្រី",
        nameEn: "Officer",
        rankOrder: 50,
        positionScope: "individual",
      },
      currentPosition: null,
      organizationalPlacement: {
        departmentId: "00000000-0000-4000-8000-000000000004",
        departmentName: "Finance and Personnel",
        officeId: null,
        officeName: null,
      },
      education: null,
      phone: null,
      address: null,
      maritalStatus: "unspecified",
      otherInformation: null,
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
    dateOfBirth: "1996-01-15",
    joinedDate: "2020-03-01",
    retiredDate: null,
    gender: "unspecified",
    status: "active",
    jobTitle: {
      id: "00000000-0000-4000-8000-000000000006",
      name: "មន្ត្រី",
      nameEn: "Officer",
      rankOrder: 50,
      positionScope: "individual",
    },
    currentPosition: null,
    organizationalPlacement: {
      departmentId: "00000000-0000-4000-8000-000000000004",
      departmentName: "Finance and Personnel",
      officeId: null,
      officeName: null,
    },
    phone: null,
    address: null,
    maritalStatus: "unspecified",
    education: null,
    otherInformation: null,
    assignmentHistory: [],
    skills: [],
  })),
}));

vi.mock("../src/services/jobArchitectureService", () => ({
  listJobArchitecture: vi.fn(async () => [
    {
      id: "00000000-0000-4000-8000-000000000010",
      code: "DEPARTMENT_HEAD",
      name: "ប្រធាននាយកដ្ឋាន",
      nameEn: "Department Director",
      rankOrder: 10,
      positionScope: "department",
      isActive: true,
      requirements: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000011",
      code: "DEPARTMENT_DEPUTY",
      name: "អនុប្រធាននាយកដ្ឋាន",
      nameEn: "Deputy Department Director",
      rankOrder: 20,
      positionScope: "department",
      isActive: true,
      requirements: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000012",
      code: "OFFICE_HEAD",
      name: "ប្រធានការិយាល័យ",
      nameEn: "Office Chief",
      rankOrder: 30,
      positionScope: "office",
      isActive: true,
      requirements: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000013",
      code: "OFFICE_DEPUTY",
      name: "អនុប្រធានការិយាល័យ",
      nameEn: "Deputy Office Chief",
      rankOrder: 40,
      positionScope: "office",
      isActive: true,
      requirements: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000014",
      code: "OFFICER",
      name: "មន្ត្រី",
      nameEn: "Officer",
      rankOrder: 50,
      positionScope: "individual",
      isActive: true,
      requirements: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000015",
      code: "CONTRACT_OFFICER",
      name: "មន្ត្រីកិច្ចសន្យា",
      nameEn: "Contract Officer",
      rankOrder: 60,
      positionScope: "individual",
      isActive: true,
      requirements: [],
    },
  ]),
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
      await screen.findByRole("dialog", { name: "Officer profile" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Test Officer").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Finance and Personnel").length,
    ).toBeGreaterThan(0);
  });

  it("shows the approved positions in the requested dropdown order", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <StaffDirectoryPage />
      </MemoryRouter>,
    );

    await user.click(
      await screen.findByRole("button", { name: "Add officer" }),
    );

    const positionSelect = await screen.findByRole("combobox", {
      name: "Position *",
    });
    const labels = Array.from(positionSelect.querySelectorAll("option"))
      .slice(1)
      .map((option) => option.textContent);

    expect(labels).toEqual([
      "ប្រធាននាយកដ្ឋាន — Department Director",
      "អនុប្រធាននាយកដ្ឋាន — Deputy Department Director",
      "ប្រធានការិយាល័យ — Office Chief",
      "អនុប្រធានការិយាល័យ — Deputy Office Chief",
      "មន្ត្រី — Officer",
      "មន្ត្រីកិច្ចសន្យា — Contract Officer",
    ]);
  });
});
