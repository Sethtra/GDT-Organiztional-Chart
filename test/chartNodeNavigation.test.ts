import { describe, expect, it } from "vitest";

import {
  buildChartNodePath,
  readChartNodeFocusId,
} from "../src/utils/chartNodeNavigation";

describe("chart node navigation", () => {
  it("builds and reads a safely encoded node locator", () => {
    const path = buildChartNodePath("chart-id", "node / Khmer តេស្ត");

    expect(path).toBe(
      "/chart/chart-id?focusNode=node%20%2F%20Khmer%20%E1%9E%8F%E1%9F%81%E1%9E%9F%E1%9F%92%E1%9E%8F",
    );
    expect(readChartNodeFocusId(path.slice(path.indexOf("?")))).toBe(
      "node / Khmer តេស្ត",
    );
  });

  it("rejects missing and oversized node identifiers", () => {
    expect(readChartNodeFocusId("")).toBeNull();
    expect(readChartNodeFocusId("?focusNode=")).toBeNull();
    expect(
      readChartNodeFocusId(`?focusNode=${"x".repeat(201)}`),
    ).toBeNull();
  });
});
