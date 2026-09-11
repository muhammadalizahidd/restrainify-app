describe("Tools Action Hub (TOOL-01) Logic & Invariants", () => {
  function computeCapabilitiesHealth(capabilities: {
    vpn: boolean;
    accessibility: boolean;
    usage: boolean;
    vpnError: string | null;
  }): { isHealthy: boolean; label: string } {
    const isHealthy =
      capabilities.vpn &&
      capabilities.accessibility &&
      capabilities.usage &&
      !capabilities.vpnError;

    return {
      isHealthy,
      label: isHealthy ? "100%" : "Attention",
    };
  }

  function formatBurstRemaining(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  describe("Capabilities health calculation", () => {
    it("reports 100% when all three required capabilities are active without error", () => {
      const caps = {
        vpn: true,
        accessibility: true,
        usage: true,
        vpnError: null,
      };
      const result = computeCapabilitiesHealth(caps);
      expect(result.isHealthy).toBe(true);
      expect(result.label).toBe("100%");
    });

    it("reports Attention when VPN is disconnected", () => {
      const caps = {
        vpn: false,
        accessibility: true,
        usage: true,
        vpnError: null,
      };
      const result = computeCapabilitiesHealth(caps);
      expect(result.isHealthy).toBe(false);
      expect(result.label).toBe("Attention");
    });

    it("reports Attention when VPN error exists", () => {
      const caps = {
        vpn: true,
        accessibility: true,
        usage: true,
        vpnError: "Local DNS port bind error",
      };
      const result = computeCapabilitiesHealth(caps);
      expect(result.isHealthy).toBe(false);
      expect(result.label).toBe("Attention");
    });
  });

  describe("Burst remaining formatting", () => {
    it("formats minutes and seconds with zero padding", () => {
      expect(formatBurstRemaining(12 * 60 * 1000 + 34 * 1000)).toBe("12:34");
      expect(formatBurstRemaining(5 * 1000)).toBe("00:05");
      expect(formatBurstRemaining(0)).toBe("00:00");
    });
  });
});
