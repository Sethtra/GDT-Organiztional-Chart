import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDeleteJobTitle = vi.fn();
const mockRemoveJobTitleRequirement = vi.fn();
const mockDeleteSkillCatalogItem = vi.fn();

const mockTitles = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "ប្រធាននាយកដ្ឋាន",
    nameEn: "Department Director",
    code: "DEPT_HEAD",
    rankOrder: 10,
    positionScope: "department",
    isActive: true,
    requirements: [
      {
        id: "00000000-0000-4000-8000-000000000011",
        minimumProficiency: 4,
        isRequired: true,
        orgUnitId: null,
        skill: {
          id: "00000000-0000-4000-8000-000000000021",
          name: "Strategic Leadership",
          description: "Leadership competency",
          isActive: true,
        },
      },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "មន្ត្រីកម្មសិក្សា",
    nameEn: "Trainee Officer",
    code: "TRAINEE_OFFICER",
    rankOrder: 70,
    positionScope: "individual",
    isActive: true,
    requirements: [],
  },
];

const mockSkills = [
  {
    id: "00000000-0000-4000-8000-000000000021",
    name: "Strategic Leadership",
    description: "Leadership competency",
    isActive: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000022",
    name: "Data Analytics",
    description: "Analytics competency",
    isActive: true,
  },
];

vi.mock("../src/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, session: null, loading: false }),
}));

vi.mock("../src/services/jobArchitectureService", () => ({
  listJobArchitecture: vi.fn(async () => mockTitles),
  saveJobTitle: vi.fn(),
  setJobTitleRequirement: vi.fn(),
  deleteJobTitle: (...args: unknown[]) => mockDeleteJobTitle(...args),
  removeJobTitleRequirement: (...args: unknown[]) =>
    mockRemoveJobTitleRequirement(...args),
}));

vi.mock("../src/services/skillService", () => ({
  listSkillCatalog: vi.fn(async () => mockSkills),
  saveSkillCatalogItem: vi.fn(),
  deleteSkillCatalogItem: (...args: unknown[]) =>
    mockDeleteSkillCatalogItem(...args),
}));

import JobArchitecturePage from "../src/pages/JobArchitecturePage";

describe("JobArchitecturePage Delete Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteJobTitle.mockResolvedValue(undefined);
    mockRemoveJobTitleRequirement.mockResolvedValue(undefined);
    mockDeleteSkillCatalogItem.mockResolvedValue(undefined);
  });

  it("renders job architecture and displays Delete Title button for selected position", async () => {
    render(
      <MemoryRouter>
        <JobArchitecturePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Job Architecture" })).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /Delete ប្រធាននាយកដ្ឋាន/i });
    expect(deleteBtn).toBeInTheDocument();
  });

  it("opens confirmation modal and deletes a job title", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <JobArchitecturePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Delete ប្រធាននាយកដ្ឋាន/i })).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /Delete ប្រធាននាយកដ្ឋាន/i });
    await user.click(deleteBtn);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete "ប្រធាននាយកដ្ឋាន"/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "Delete Title" });
    await user.click(confirmBtn);

    expect(mockDeleteJobTitle).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001");
  });

  it("removes a skill requirement when clicking the requirement trash button", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <JobArchitecturePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Remove Strategic Leadership requirement/i }),
      ).toBeInTheDocument();
    });

    const removeReqBtn = screen.getByRole("button", {
      name: /Remove Strategic Leadership requirement/i,
    });
    await user.click(removeReqBtn);

    expect(mockRemoveJobTitleRequirement).toHaveBeenCalledWith({
      jobTitleId: "00000000-0000-4000-8000-000000000001",
      skillId: "00000000-0000-4000-8000-000000000021",
    });
  });

  it("opens skill catalog modal and allows deleting a catalog skill with confirmation", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <JobArchitecturePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Manage Skill Catalog/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Manage Skill Catalog/i }));

    expect(screen.getByText("Skill Competency Catalog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /All Skills/i }));

    const deleteSkillBtn = screen.getByRole("button", {
      name: /Delete Data Analytics from catalog/i,
    });
    expect(deleteSkillBtn).toBeInTheDocument();

    await user.click(deleteSkillBtn);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete the skill "Data Analytics"/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "Delete Skill" });
    await user.click(confirmBtn);

    expect(mockDeleteSkillCatalogItem).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000022");
  });

  it("renders standardized proficiency level labels in the level selector and cards", async () => {
    render(
      <MemoryRouter>
        <JobArchitecturePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Select minimum skill level" })).toBeInTheDocument();
    });

    expect(screen.getByRole("option", { name: "1 · Basic awareness" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "2 · Working guidance" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "3 · Proficient" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "4 · Advanced" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "5 · Expert" })).toBeInTheDocument();

    expect(
      screen.getByText(/Minimum Required Proficiency: 4 · Advanced/i),
    ).toBeInTheDocument();
  });
});
