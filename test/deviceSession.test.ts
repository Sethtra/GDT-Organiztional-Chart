import { describe, expect, it } from "vitest";

import { describeDeviceSession } from "../src/utils/deviceSession";

describe("describeDeviceSession", () => {
  it("identifies a Windows Chrome desktop", () => {
    expect(
      describeDeviceSession(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",
        "Win32",
      ),
    ).toEqual({
      browser: "Google Chrome",
      operatingSystem: "Windows",
      kind: "desktop",
      label: "Google Chrome on Windows",
    });
  });

  it("identifies an iPhone Safari session", () => {
    expect(
      describeDeviceSession(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1",
        "iPhone",
      ),
    ).toMatchObject({
      browser: "Safari",
      operatingSystem: "iOS 18.5",
      kind: "mobile",
    });
  });

  it("distinguishes an Android tablet from a phone", () => {
    expect(
      describeDeviceSession(
        "Mozilla/5.0 (Linux; Android 15; Pixel Tablet) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",
        "Linux",
      ).kind,
    ).toBe("tablet");
  });
});
