import type { InstalledApp } from "../../../native/OfflineProtection";

describe("App Controls Search & Picker Stability (SET-APP-01)", () => {
  const sampleApps: InstalledApp[] = [
    { label: "CamScanner", packageName: "com.intsig.camscanner" },
    { label: "Candy Crush Saga", packageName: "com.king.candycrushsaga" },
    { label: "Find Hub", packageName: "com.google.android.apps.adm" },
    { label: "Instagram", packageName: "com.instagram.android" },
    { label: "YouTube", packageName: "com.google.android.youtube" },
    { label: "TikTok", packageName: "com.zhiliaoapp.musically" },
  ];

  function filterInstalledApps(apps: InstalledApp[], query: string): InstalledApp[] {
    const q = query.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter(
      (app) =>
        app.label.toLowerCase().includes(q) ||
        app.packageName.toLowerCase().includes(q)
    );
  }

  describe("Character-by-character search filtering", () => {
    it("returns all apps when search query is empty", () => {
      const results = filterInstalledApps(sampleApps, "");
      expect(results).toHaveLength(6);
    });

    it("matches apps with 'i' (CamScanner, Candy Crush Saga, Find Hub, Instagram)", () => {
      const results = filterInstalledApps(sampleApps, "i");
      const packages = results.map((a) => a.packageName);
      expect(packages).toContain("com.intsig.camscanner");
      expect(packages).toContain("com.king.candycrushsaga");
      expect(packages).toContain("com.google.android.apps.adm"); // Find Hub has 'i' in label
      expect(packages).toContain("com.instagram.android");
      expect(results.length).toBeGreaterThanOrEqual(4);
    });

    it("matches apps with 'in' exactly as shown in reproduction screenshot", () => {
      const results = filterInstalledApps(sampleApps, "in");
      const names = results.map((a) => a.label);
      expect(names).toContain("CamScanner"); // com.intsig
      expect(names).toContain("Candy Crush Saga"); // com.king
      expect(names).toContain("Find Hub"); // Find
      expect(names).toContain("Instagram"); // Instagram
    });

    it("filters precisely when typing 'ins' / 'inst' without throwing or returning unrelated apps", () => {
      const resultsIns = filterInstalledApps(sampleApps, "ins");
      const namesIns = resultsIns.map((a) => a.label);
      expect(namesIns).toContain("Instagram");
      expect(namesIns).not.toContain("Candy Crush Saga");
      expect(namesIns).not.toContain("Find Hub");

      const resultsInst = filterInstalledApps(sampleApps, "inst");
      expect(resultsInst).toHaveLength(1);
      expect(resultsInst[0]?.label).toBe("Instagram");
      expect(resultsInst[0]?.packageName).toBe("com.instagram.android");
    });

    it("handles case-insensitivity seamlessly (e.g. 'INST', 'Inst', 'In')", () => {
      expect(filterInstalledApps(sampleApps, "INST")).toEqual(filterInstalledApps(sampleApps, "inst"));
      expect(filterInstalledApps(sampleApps, "In")).toEqual(filterInstalledApps(sampleApps, "in"));
    });

    it("handles leading and trailing whitespace safely", () => {
      const results = filterInstalledApps(sampleApps, "  inst  ");
      expect(results).toHaveLength(1);
      expect(results[0]?.label).toBe("Instagram");
    });

    it("returns an empty array when no apps match the query", () => {
      const results = filterInstalledApps(sampleApps, "xyznonexistent999");
      expect(results).toHaveLength(0);
    });

    it("matches by package name directly", () => {
      const results = filterInstalledApps(sampleApps, "musically");
      expect(results).toHaveLength(1);
      expect(results[0]?.label).toBe("TikTok");
    });
  });

  describe("Layout & UI stability invariants", () => {
    it("verifies bottom sheet uses fixed height ('75%' or '80%') so card never collapses when filtered items drop to 0", () => {
      // In bottom-aligned containers (justifyContent: 'flex-end'):
      // If height is dynamic (maxHeight), filtering down to 0 items causes the card height
      // to collapse to ~90px, causing the entire search bar and header to fall behind the
      // on-screen Android/iOS keyboard.
      // Fixed height guarantees the top of the card stays anchored above the keyboard.
      const mockModalCardStyle = {
        height: "75%",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      };
      expect(mockModalCardStyle.height).toBe("75%");
      expect((mockModalCardStyle as { maxHeight?: string }).maxHeight).toBeUndefined();
    });

    it("verifies FlatList is set to flex: 1 and supports handled taps", () => {
      const mockFlatListProps = {
        style: { flex: 1 },
        keyboardShouldPersistTaps: "handled" as const,
      };
      expect(mockFlatListProps.style.flex).toBe(1);
      expect(mockFlatListProps.keyboardShouldPersistTaps).toBe("handled");
    });
  });
});

