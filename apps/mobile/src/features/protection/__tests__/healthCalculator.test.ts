import { computeProtectionHealth } from "../utils/healthCalculator";

describe("computeProtectionHealth", () => {
  const baseCapabilities = {
    vpn: false,
    vpnError: null as string | null,
    accessibility: false,
    usage: false,
    notification: false,
    batteryUnrestricted: false,
    deviceAdmin: false,
    privateDns: null as string | null,
  };

  const baseSettings = {
    websiteEnabled: false,
    dnsMode: "vpn" as const,
    accessibilityConsent: false,
    strictMinutes: 0,
    goals: ["websites", "apps"],
  };

  it("calculates 0% when all capabilities are down and goals require websites and apps", () => {
    const health = computeProtectionHealth({
      settings: baseSettings,
      capabilities: baseCapabilities,
    });

    expect(health.percent).toBe(0);
    expect(health.isFullyProtected).toBe(false);
    expect(health.webHealthy).toBe(false);
    expect(health.appHealthy).toBe(false);
    expect(health.healthValue).toBe("0%");
    expect(health.healthDetail).toBe("Protection needs setup");
  });

  it("reports 'Checking capabilities…' and '…' when reconciling is in progress", () => {
    const health = computeProtectionHealth(
      {
        settings: baseSettings,
        capabilities: baseCapabilities,
      },
      true
    );

    expect(health.healthValue).toBe("…");
    expect(health.healthDetail).toBe("Checking capabilities…");
  });

  it("calculates 100% when Local VPN and App Accessibility are both active for dual goals", () => {
    const health = computeProtectionHealth({
      settings: {
        ...baseSettings,
        websiteEnabled: true,
        accessibilityConsent: true,
        goals: ["websites", "apps"],
      },
      capabilities: {
        ...baseCapabilities,
        vpn: true,
        accessibility: true,
        usage: true,
      },
    });

    expect(health.percent).toBe(100);
    expect(health.isFullyProtected).toBe(true);
    expect(health.webHealthy).toBe(true);
    expect(health.appHealthy).toBe(true);
    expect(health.healthValue).toBe("100%");
    expect(health.healthDetail).toBe("All systems active");
  });

  it("calculates 100% for Website-only goal when Local VPN is healthy without penalizing for disabled apps", () => {
    const health = computeProtectionHealth({
      settings: {
        ...baseSettings,
        websiteEnabled: true,
        accessibilityConsent: false,
        goals: ["websites"],
      },
      capabilities: {
        ...baseCapabilities,
        vpn: true,
        accessibility: false,
      },
    });

    expect(health.percent).toBe(100);
    expect(health.isFullyProtected).toBe(true);
    expect(health.webHealthy).toBe(true);
    expect(health.appHealthy).toBe(false);
    expect(health.healthValue).toBe("100%");
    expect(health.healthDetail).toBe("All systems active");
  });

  it("evaluates Private DNS mode truthfully when configured", () => {
    // 1. Private DNS configured and detected
    const healthyDns = computeProtectionHealth({
      settings: {
        ...baseSettings,
        websiteEnabled: true,
        dnsMode: "private",
        goals: ["websites"],
      },
      capabilities: {
        ...baseCapabilities,
        vpn: false, // VPN tunnel not required in Private DNS mode
        privateDns: "family.cloudflare-dns.com",
      },
    });

    expect(healthyDns.webHealthy).toBe(true);
    expect(healthyDns.percent).toBe(100);
    expect(healthyDns.isFullyProtected).toBe(true);

    // 2. Private DNS mode enabled but Android has no active private DNS host set
    const missingDns = computeProtectionHealth({
      settings: {
        ...baseSettings,
        websiteEnabled: true,
        dnsMode: "private",
        goals: ["websites"],
      },
      capabilities: {
        ...baseCapabilities,
        vpn: false,
        privateDns: null,
      },
    });

    expect(missingDns.webHealthy).toBe(false);
    expect(missingDns.percent).toBe(0);
    expect(missingDns.isFullyProtected).toBe(false);
  });

  it("detects VPN error condition in VPN mode even if vpn flag is true", () => {
    const health = computeProtectionHealth({
      settings: {
        ...baseSettings,
        websiteEnabled: true,
        dnsMode: "vpn",
        goals: ["websites", "apps"],
      },
      capabilities: {
        ...baseCapabilities,
        vpn: true,
        vpnError: "VPN revoked by Android system",
        accessibility: true,
      },
    });

    expect(health.webHealthy).toBe(false);
  });

  it("reports 50% and contextual message when only Web is active and user has dual goals", () => {
    const health = computeProtectionHealth({
      settings: {
        ...baseSettings,
        websiteEnabled: true,
        accessibilityConsent: false,
        goals: ["websites", "apps"],
      },
      capabilities: {
        ...baseCapabilities,
        vpn: true,
        accessibility: false,
      },
    });

    expect(health.percent).toBe(50);
    expect(health.isFullyProtected).toBe(false);
    expect(health.healthDetail).toBe("Web active · App controls off");
  });

  it("reports 50% and contextual message when only App controls are active and user has dual goals", () => {
    const health = computeProtectionHealth({
      settings: {
        ...baseSettings,
        websiteEnabled: false,
        accessibilityConsent: true,
        goals: ["websites", "apps"],
      },
      capabilities: {
        ...baseCapabilities,
        vpn: false,
        accessibility: true,
      },
    });

    expect(health.percent).toBe(50);
    expect(health.isFullyProtected).toBe(false);
    expect(health.healthDetail).toBe("App controls active · Web filter off");
  });
});
