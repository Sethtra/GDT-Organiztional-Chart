import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, session: null, loading: false }),
}));

vi.mock("../src/services/staffService", () => ({
  archiveStaff: vi.fn(),
  findStaffDuplicates: vi.fn(async () => []),
  saveStaff: vi.fn(),
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
    education: null,
    otherInformation: null,
    assignmentHistory: [
      {
        id: "00000000-0000-4000-8000-000000000020",
        staffId: "00000000-0000-4000-8000-000000000001",
        position: {
          positionId: "00000000-0000-4000-8000-000000000030",
          chartId: "00000000-0000-4000-8000-000000000040",
          nodeId: "node-department-director",
          title: "Department Director Node",
          departmentId: "00000000-0000-4000-8000-000000000004",
          departmentName: "Wrong Chart Department",
          officeId: "00000000-0000-4000-8000-000000000005",
          officeName: "Wrong Chart Office",
        },
        joinedDate: "2026-07-29",
        leftDate: null,
        reason: "assigned",
        notes: null,
      },
      {
        id: "00000000-0000-4000-8000-000000000021",
        staffId: "00000000-0000-4000-8000-000000000001",
        position: {
          positionId: "00000000-0000-4000-8000-000000000031",
          chartId: "00000000-0000-4000-8000-000000000041",
          nodeId: "node-office-chief",
          title: "Office Chief Node",
          departmentId: null,
          departmentName: "Another Wrong Chart Department",
          officeId: null,
          officeName: null,
        },
        joinedDate: "2026-07-29",
        leftDate: null,
        reason: "assigned",
        notes: null,
      },
    ],
    skills: [],
  })),
}));

vi.mock("../src/services/promotionReadinessService", () => ({
  listPromotionReadiness: vi.fn(async () => [
    {
      staffId: "00000000-0000-4000-8000-000000000001",
      employeeId: "GDT-001",
      name: "Test Officer",
      nameEn: null,
      photoUrl: null,
      departmentName: "Finance and Personnel",
      officeName: null,
      currentJobTitle: {
        id: "00000000-0000-4000-8000-000000000014",
        name: "Officer",
        nameEn: "Officer",
        rankOrder: 50,
        positionScope: "individual",
      },
      targetJobTitle: {
        id: "00000000-0000-4000-8000-000000000013",
        name: "អនុប្រធានការិយាល័យ",
        nameEn: "Deputy Office Chief",
        rankOrder: 40,
        positionScope: "office",
      },
      requiredSkillCount: 2,
      metSkillCount: 2,
      status: "ready",
    },
  ]),
  loadPromotionReadiness: vi.fn(async () => ({
    staffId: "00000000-0000-4000-8000-000000000001",
    employeeId: "GDT-001",
    name: "Test Officer",
    nameEn: null,
    photoUrl: null,
    departmentName: "Finance and Personnel",
    officeName: null,
    currentJobTitle: {
      id: "00000000-0000-4000-8000-000000000014",
      name: "Officer",
      nameEn: "Officer",
      rankOrder: 50,
      positionScope: "individual",
    },
    targetJobTitle: {
      id: "00000000-0000-4000-8000-000000000013",
      name: "អនុប្រធានការិយាល័យ",
      nameEn: "Deputy Office Chief",
      rankOrder: 40,
      positionScope: "office",
    },
    requiredSkillCount: 2,
    metSkillCount: 2,
    status: "ready",
  })),
}));

vi.mock("../src/hooks/useOrgStructure", () => ({
  useOrgStructure: () => ({
    units: [
      {
        id: "00000000-0000-4000-8000-000000000004",
        name: "Finance and Personnel",
        type: "department",
        sort_order: 1,
        offices: [
          {
            id: "00000000-0000-4000-8000-000000000005",
            name: "Personnel Office",
            sort_order: 1,
          },
        ],
      },
    ],
    loading: false,
    error: null,
    refetch: vi.fn(),
    getOfficesForUnit: vi.fn(),
  }),
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
    {
      id: "00000000-0000-4000-8000-000000000016",
      code: "TRAINEE_OFFICER",
      name: "មន្ត្រីកម្មសិក្សា",
      nameEn: "Trainee Officer",
      rankOrder: 70,
      positionScope: "individual",
      isActive: true,
      requirements: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000017",
      code: "BRANCH_HEAD",
      name: "ប្រធានសាខា",
      nameEn: "Branch Director",
      rankOrder: 25,
      positionScope: "department",
      isActive: true,
      requirements: [],
    },
  ]),
}));


import StaffDirectoryPage from "../src/pages/StaffDirectoryPage";
import { listPromotionReadiness } from "../src/services/promotionReadinessService";
import { listHrStaff } from "../src/services/staffService";

describe("Staff Directory", () => {
  it("applies the Ready to Promote URL filter and can clear it", async () => {
    const user = userEvent.setup();
    const readyOfficer = (await vi.mocked(listHrStaff)(true))[0]!;
    vi.mocked(listHrStaff).mockResolvedValueOnce([
      readyOfficer,
      {
        ...readyOfficer,
        id: "00000000-0000-4000-8000-000000000002",
        employeeId: "GDT-002",
        name: "Not Ready Officer",
      },
    ]);

    render(
      <MemoryRouter initialEntries={["/admin/staff?promotion=ready"]}>
        <StaffDirectoryPage />
      </MemoryRouter>,
    );

    const filter = await screen.findByRole("combobox", {
      name: "Filter by promotion readiness",
    });
    expect(filter).toHaveValue("ready");

    const readyName = await screen.findByText("Test Officer");
    expect(screen.queryByText("Not Ready Officer")).not.toBeInTheDocument();
    const readyRow = readyName.closest("tr");
    expect(readyRow).not.toBeNull();
    expect(within(readyRow!).getByText("Ready to Promote")).toBeInTheDocument();

    await user.selectOptions(filter, "all");
    expect(await screen.findByText("Not Ready Officer")).toBeInTheDocument();
  });

  it("shows a recoverable error when the promotion filter cannot load", async () => {
    vi.mocked(listPromotionReadiness).mockRejectedValueOnce(
      new Error("RPC unavailable"),
    );

    render(
      <MemoryRouter initialEntries={["/admin/staff?promotion=ready"]}>
        <StaffDirectoryPage />
      </MemoryRouter>,
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Promotion readiness is unavailable");
    expect(
      within(alert).getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  it("opens the officer profile named in the dashboard link", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/admin/staff?profile=00000000-0000-4000-8000-000000000001",
        ]}
      >
        <StaffDirectoryPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("dialog", { name: "Officer profile" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Test Officer").length).toBeGreaterThan(0);
  });

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
    expect(
      await screen.findByRole("status", {
        name: /Ready to Promote to អនុប្រធានការិយាល័យ/,
      }),
    ).toBeInTheDocument();
  });

  it("locates assigned nodes without showing chart filters as staff history", async () => {
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

    await user.click(
      await screen.findByRole("button", { name: /History/ }),
    );

    const duplicateWarning = await screen.findByRole("alert");
    expect(duplicateWarning).toHaveTextContent(
      "Multiple active node assignments found",
    );
    expect(duplicateWarning).toHaveTextContent("linked to 2 current nodes");
    expect(screen.queryByText("Wrong Chart Department")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Another Wrong Chart Department"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Go to node for Department Director Node",
      }),
    ).toHaveAttribute(
      "href",
      "/chart/00000000-0000-4000-8000-000000000040?focusNode=node-department-director",
    );
  });

  it("shows the approved positions in the requested dropdown order", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <StaffDirectoryPage />
      </MemoryRouter>,
    );

    await user.click(
      await screen.findByRole("button", { name: "New Officer" }),
    );

    await user.click(
      await screen.findByRole("button", { name: "Employment" }),
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
      "មន្ត្រីកម្មសិក្សា — Trainee Officer",
      "ប្រធានសាខា — Branch Director",
    ]);
  });


  it("falls back to standard English label if position record has null nameEn", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <StaffDirectoryPage />
      </MemoryRouter>,
    );

    await user.click(
      await screen.findByRole("button", { name: "New Officer" }),
    );

    await user.click(
      await screen.findByRole("button", { name: "Employment" }),
    );

    const positionSelect = await screen.findByRole("combobox", {
      name: "Position *",
    });

    expect(
      positionSelect.querySelector("option[value='00000000-0000-4000-8000-000000000016']"),
    ).toHaveTextContent("មន្ត្រីកម្មសិក្សា — Trainee Officer");
  });



  it("selects a department first and keeps office optional", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <StaffDirectoryPage />
      </MemoryRouter>,
    );

    await user.click(
      await screen.findByRole("button", { name: "New Officer" }),
    );

    await user.click(
      await screen.findByRole("button", { name: "Employment" }),
    );

    const department = screen.getByRole("combobox", {
      name: "Department *",
    });
    const office = screen.getByRole("combobox", {
      name: "Office (optional)",
    });

    expect(office).toBeDisabled();
    await user.selectOptions(
      department,
      "00000000-0000-4000-8000-000000000004",
    );
    expect(office).toBeEnabled();
    expect(
      screen.getByRole("option", { name: "No office assigned" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Personnel Office" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Marital status" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save & manage skills" }),
    ).toBeInTheDocument();
  });

  it("shows a labeled skills action for every officer", async () => {
    render(
      <MemoryRouter>
        <StaffDirectoryPage />
      </MemoryRouter>,
    );

    const skillsButton = await screen.findByRole("button", {
      name: "Manage skills for Test Officer",
    });
    expect(skillsButton).toHaveAttribute("title", "Manage skills");
  });
});
