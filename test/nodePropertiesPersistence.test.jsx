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

  it("removes the old fill when converting a node to a geometric shape", () => {
    const onUpdateNodes = vi.fn();

    render(
      <NodePropertiesPanel
        chartId="chart-1"
        nodes={[
          {
            id: "node-1",
            selected: true,
            data: { name: "Filled node", orgType: "orgNode", color: "#136232" },
          },
        ]}
        onUpdateNodes={onUpdateNodes}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Use SQUARE node shape" }));
    fireEvent.click(screen.getByTitle("Save and close"));

    expect(onUpdateNodes).toHaveBeenLastCalledWith(
      expect.objectContaining({
        orgType: "squareNode",
        color: "transparent",
        borderColor: "#475569",
        borderWidth: 2,
      }),
    );
  });

  it("allows a geometric shape outline to be transparent", () => {
    const onUpdateNodes = vi.fn();

    render(
      <NodePropertiesPanel
        chartId="chart-1"
        nodes={[
          {
            id: "shape-1",
            selected: true,
            data: {
              orgType: "squareNode",
              color: "#136232",
              borderColor: "#475569",
              borderWidth: 4,
            },
          },
        ]}
        onUpdateNodes={onUpdateNodes}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "No Outline" }));
    fireEvent.click(screen.getByTitle("Save and close"));

    expect(onUpdateNodes).toHaveBeenLastCalledWith(
      expect.objectContaining({
        borderColor: "transparent",
        borderWidth: 4,
      }),
    );
  });

  it("can unlink a saved chart that is missing from the available chart list", () => {
    const onUpdateNodes = vi.fn();
    const linkedChartId = "11111111-1111-4111-8111-111111111111";

    render(
      <NodePropertiesPanel
        chartId="chart-1"
        nodes={[
          {
            id: "node-1",
            selected: true,
            data: { orgType: "orgNode", linkedChartId },
          },
        ]}
        onUpdateNodes={onUpdateNodes}
      />,
    );

    expect(screen.getByLabelText("Linked chart")).toHaveValue(linkedChartId);
    expect(screen.getByText("Linked chart unavailable")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Unlink Chart" }));
    fireEvent.click(screen.getByTitle("Save and close"));

    expect(onUpdateNodes).toHaveBeenLastCalledWith(
      expect.objectContaining({ linkedChartId: "" }),
    );
  });
});
