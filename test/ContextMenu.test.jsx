import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ContextMenu from "../src/components/ContextMenu";

describe("ContextMenu profile access", () => {
  it("offers View Details to an invited viewer without editor actions", () => {
    const onViewDetails = vi.fn();

    render(
      <ContextMenu
        x={20}
        y={30}
        isCollapsed={false}
        onViewDetails={onViewDetails}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("menuitem", { name: "View Details" }));

    expect(onViewDetails).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("menuitem", { name: "Edit Properties" }),
    ).not.toBeInTheDocument();
  });

  it("does not expose profile details to a public-only visitor", () => {
    render(
      <ContextMenu
        x={20}
        y={30}
        isCollapsed={false}
        profileRestricted
        onClose={() => {}}
      />,
    );

    const restricted = screen.getByRole("menuitem", {
      name: "Profile requires invitation",
    });

    expect(restricted).toBeDisabled();
    expect(
      screen.queryByRole("menuitem", { name: "View Details" }),
    ).not.toBeInTheDocument();
  });
});
