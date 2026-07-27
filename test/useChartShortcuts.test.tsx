import { fireEvent, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useChartShortcuts } from "../src/hooks/useChartShortcuts";

function actions() {
  return {
    undo: vi.fn(),
    redo: vi.fn(),
    save: vi.fn(),
    toggleSearch: vi.fn(),
    toggleHelp: vi.fn(),
    closeOverlays: vi.fn(),
    duplicateSelection: vi.fn(),
    copySelection: vi.fn(),
    pasteSelection: vi.fn(),
    deleteSelection: vi.fn(),
    setShiftHeld: vi.fn(),
  };
}

describe("useChartShortcuts", () => {
  it("responds only for the active chart", () => {
    const inactive = actions();
    const active = actions();
    renderHook(() => useChartShortcuts(false, inactive));
    renderHook(() => useChartShortcuts(true, active));

    fireEvent.keyDown(document, { key: "z", code: "KeyZ", ctrlKey: true });

    expect(inactive.undo).not.toHaveBeenCalled();
    expect(active.undo).toHaveBeenCalledOnce();
  });

  it("does not run chart actions while typing, except Escape", () => {
    const current = actions();
    renderHook(() => useChartShortcuts(true, current));
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();

    fireEvent.keyDown(input, { key: "Delete" });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(current.deleteSelection).not.toHaveBeenCalled();
    expect(current.closeOverlays).toHaveBeenCalledOnce();
    expect(document.activeElement).not.toBe(input);
    input.remove();
  });
});
