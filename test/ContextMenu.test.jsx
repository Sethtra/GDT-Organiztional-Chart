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

  it("survives a stray click on document immediately after opening", () => {
    const onClose = vi.fn();
    render(
      <ContextMenu x={20} y={30} isCollapsed={false} onClose={onClose} />,
    );

    // Regression test: on some Windows trackpad/mouse driver setups, the
    // right-click gesture that opens this menu is followed a few ms later
    // by a stray synthetic 'click' reaching document — which used to close
    // the menu instantly, before the user could read it.
    fireEvent.click(document);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("still closes on a genuine later click outside", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <ContextMenu x={20} y={30} isCollapsed={false} onClose={onClose} />,
    );

    vi.advanceTimersByTime(300);
    fireEvent.click(document);
    expect(onClose).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
