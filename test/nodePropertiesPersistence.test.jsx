import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/hooks/useAuth", () => ({
  useAuth: () => ({ user: null }),
}));

import NodePropertiesPanel from "../src/components/properties/NodePropertiesPanel";

describe("NodePropertiesPanel persistence handoff", () => {
  it("commits a pending text edit before the panel closes", () => {
    const onUpdateNodes = vi.fn();
    const onSave = vi.fn();

    render(
      <NodePropertiesPanel
        chartId="chart-1"
        nodes={[
          {
            id: "node-1",
            selected: true,
            data: { name: "Old name", orgType: "orgNode" },
          },
        ]}
        onUpdateNodes={onUpdateNodes}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("ឈ្មោះ..."), {
      target: { value: "Saved name" },
    });
    fireEvent.click(screen.getByTitle("Save and close"));

    expect(onUpdateNodes).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "Saved name" }),
    );
    expect(onSave).toHaveBeenCalledOnce();
  });
});
