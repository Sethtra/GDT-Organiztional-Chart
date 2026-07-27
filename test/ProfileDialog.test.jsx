import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ProfileDrawer from "../src/components/ProfileDrawer";

const personNode = {
  id: "position-1",
  data: {
    orgType: "individualNode",
    name: "Example Staff",
    position: "Officer",
    office: "Example Office",
  },
};

describe("staff profile dialog", () => {
  it("renders as a named, centered modal dialog", () => {
    render(
      <ProfileDrawer
        node={personNode}
        teamSize={0}
        canEdit={false}
        onEdit={() => {}}
        onClose={() => {}}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Staff Profile" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Example Staff")).toBeInTheDocument();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();

    render(
      <ProfileDrawer
        node={personNode}
        teamSize={0}
        canEdit={false}
        onEdit={() => {}}
        onClose={onClose}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
