export type DeviceKind = "desktop" | "mobile" | "tablet";

export type DeviceSessionDescription = {
  browser: string;
  operatingSystem: string;
  kind: DeviceKind;
  label: string;
};

function browserName(userAgent: string): string {
  if (/SamsungBrowser\//i.test(userAgent)) return "Samsung Internet";
  if (/Edg(?:A|iOS)?\//i.test(userAgent)) return "Microsoft Edge";
  if (/FxiOS\//i.test(userAgent) || /Firefox\//i.test(userAgent)) {
    return "Firefox";
  }
  if (/CriOS\//i.test(userAgent) || /Chrome\//i.test(userAgent)) {
    return "Google Chrome";
  }
  if (/Safari\//i.test(userAgent) && /Version\//i.test(userAgent)) {
    return "Safari";
  }
  return "Web browser";
}

function operatingSystemName(userAgent: string, platform: string): string {
  const android = userAgent.match(/Android\s+([\d.]+)/i);
  if (android?.[1]) return `Android ${android[1]}`;

  const ios = userAgent.match(/(?:iPhone OS|CPU OS)\s+([\d_]+)/i);
  if (ios?.[1]) return `iOS ${ios[1].replaceAll("_", ".")}`;

  const macOS = userAgent.match(/Mac OS X\s+([\d_]+)/i);
  if (macOS?.[1]) return `macOS ${macOS[1].replaceAll("_", ".")}`;

  if (/Windows/i.test(userAgent) || /Win/i.test(platform)) return "Windows";
  if (/CrOS/i.test(userAgent)) return "ChromeOS";
  if (/Linux/i.test(userAgent) || /Linux/i.test(platform)) return "Linux";
  return platform || "Unknown operating system";
}

function deviceKind(userAgent: string): DeviceKind {
  if (/iPad|Tablet|PlayBook/i.test(userAgent)) return "tablet";
  if (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent)) return "tablet";
  if (/Mobi|iPhone|Android/i.test(userAgent)) return "mobile";
  return "desktop";
}

export function describeDeviceSession(
  userAgent: string,
  platform = "",
): DeviceSessionDescription {
  const browser = browserName(userAgent);
  const operatingSystem = operatingSystemName(userAgent, platform);
  return {
    browser,
    operatingSystem,
    kind: deviceKind(userAgent),
    label: `${browser} on ${operatingSystem}`,
  };
}
