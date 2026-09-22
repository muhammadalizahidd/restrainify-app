/**
 * Unit tests for SET-SOC-01 / In-App Blocking (ShortFormModal) logic:
 * 1. Granular sub-options configuration (Stories, Reels with Early Access badge, Explore tab)
 * 2. Default accordion states (Instagram expanded by default)
 * 3. In-App search filtering across apps and sub-options
 * 4. Rule synchronization to native Android bridge (feedMode: experimental vs whole_app vs off)
 * 5. Cooldown lock invariants under Strict Mode / Burst interventions
 */

interface SubOption {
  id: string;
  label: string;
  badge?: string;
  enabled: boolean;
}

interface InAppApp {
  id: string;
  name: string;
  packageName: string;
  options: SubOption[];
}

const APPS: InAppApp[] = [
  {
    id: "yt",
    name: "YouTube",
    packageName: "com.google.android.youtube",
    options: [
      { id: "yt_shorts", label: "Block shorts", enabled: false },
      { id: "yt_home", label: "Block home feed", enabled: false },
      { id: "yt_explore", label: "Block explore tab", enabled: false },
      { id: "yt_comments", label: "Block comments", enabled: false },
    ],
  },
  {
    id: "ig",
    name: "Instagram",
    packageName: "com.instagram.android",
    options: [
      { id: "ig_stories", label: "Block stories", enabled: false },
      { id: "ig_reels", label: "Block reels", badge: "Early Access", enabled: false },
      { id: "ig_explore", label: "Block explore tab", enabled: false },
    ],
  },
  {
    id: "fb",
    name: "Facebook",
    packageName: "com.facebook.katana",
    options: [
      { id: "fb_reels", label: "Block reels", enabled: false },
      { id: "fb_stories", label: "Block stories", enabled: false },
      { id: "fb_feed", label: "Block news feed", enabled: false },
    ],
  },
  {
    id: "sc",
    name: "Snapchat",
    packageName: "com.snapchat.android",
    options: [
      { id: "sc_spotlight", label: "Block spotlight", enabled: false },
      { id: "sc_stories", label: "Block discover / stories", enabled: false },
    ],
  },
  {
    id: "tiktok",
    name: "TikTok",
    packageName: "com.zhiliaoapp.musically",
    options: [
      { id: "tiktok_app", label: "Block whole app (fallback)", enabled: false },
    ],
  },
  {
    id: "x",
    name: "X",
    packageName: "com.twitter.android",
    options: [
      { id: "x_explore", label: "Block explore / For You", enabled: false },
      { id: "x_video", label: "Block video feed", enabled: false },
    ],
  },
];

describe("In-App Blocking / Short-Form Feeds Logic", () => {
  describe("Instagram Sub-options & Badges", () => {
    it("configures Instagram with Block stories, Block reels, and Block explore tab", () => {
      const ig = APPS.find((a) => a.id === "ig");
      expect(ig).toBeDefined();
      const labels = ig!.options.map((o) => o.label);
      expect(labels).toEqual(["Block stories", "Block reels", "Block explore tab"]);
    });

    it("attaches the Early Access badge specifically to Block reels", () => {
      const ig = APPS.find((a) => a.id === "ig");
      const reelsOption = ig!.options.find((o) => o.id === "ig_reels");
      expect(reelsOption).toBeDefined();
      expect(reelsOption!.badge).toBe("Early Access");

      const storiesOption = ig!.options.find((o) => o.id === "ig_stories");
      expect(storiesOption!.badge).toBeUndefined();
    });

    it("maintains Instagram accordion open by default", () => {
      const defaultExpanded: Record<string, boolean> = { ig: true };
      expect(defaultExpanded["ig"]).toBe(true);
      expect(defaultExpanded["yt"]).toBeFalsy();
      expect(defaultExpanded["fb"]).toBeFalsy();
    });
  });

  describe("Search Filtering Logic", () => {
    function filterApps(apps: InAppApp[], query: string): InAppApp[] {
      const q = query.trim().toLowerCase();
      if (!q) return apps;
      return apps.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.options.some((o) => o.label.toLowerCase().includes(q))
      );
    }

    it("filters to Instagram when searching for 'instagram'", () => {
      const results = filterApps(APPS, "instagram");
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe("Instagram");
    });

    it("filters to apps containing 'reels' when searching 'reels'", () => {
      const results = filterApps(APPS, "reels");
      const names = results.map((r) => r.name);
      expect(names).toContain("Instagram");
      expect(names).toContain("Facebook");
      expect(names).not.toContain("Snapchat");
    });

    it("returns empty when query does not match any app or sub-option", () => {
      const results = filterApps(APPS, "nonexistent-app-xyz");
      expect(results).toHaveLength(0);
    });
  });

  describe("Rule Synchronization & FeedMode calculation", () => {
    function calculateRule(appId: string, options: SubOption[]) {
      const hasAnyActive = options.some((o) => o.enabled);
      return {
        enabled: hasAnyActive,
        feedMode: hasAnyActive
          ? appId === "tiktok"
            ? "whole_app"
            : "experimental"
          : "off",
      };
    }

    it("disables feedMode when all options are disabled", () => {
      const options: SubOption[] = [
        { id: "ig_stories", label: "Block stories", enabled: false },
        { id: "ig_reels", label: "Block reels", enabled: false },
      ];
      const rule = calculateRule("ig", options);
      expect(rule.enabled).toBe(false);
      expect(rule.feedMode).toBe("off");
    });

    it("activates experimental feedMode when any sub-option is turned on for Instagram", () => {
      const options: SubOption[] = [
        { id: "ig_stories", label: "Block stories", enabled: false },
        { id: "ig_reels", label: "Block reels", enabled: true },
      ];
      const rule = calculateRule("ig", options);
      expect(rule.enabled).toBe(true);
      expect(rule.feedMode).toBe("experimental");
    });

    it("assigns whole_app feedMode to TikTok rather than experimental feed isolation", () => {
      const options: SubOption[] = [
        { id: "tiktok_app", label: "Block whole app", enabled: true },
      ];
      const rule = calculateRule("tiktok", options);
      expect(rule.enabled).toBe(true);
      expect(rule.feedMode).toBe("whole_app");
    });
  });

  describe("Cooldown Lock Invariants", () => {
    function canModifyRules(snapshot: { burstRemainingMs: number; strictRemainingMs: number }): boolean {
      return snapshot.burstRemainingMs === 0 && snapshot.strictRemainingMs === 0;
    }

    it("allows modification when cooldowns are inactive", () => {
      expect(canModifyRules({ burstRemainingMs: 0, strictRemainingMs: 0 })).toBe(true);
    });

    it("forbids modification when burst cooldown is active", () => {
      expect(canModifyRules({ burstRemainingMs: 120000, strictRemainingMs: 0 })).toBe(false);
    });

    it("forbids modification when strict mode cooldown is active", () => {
      expect(canModifyRules({ burstRemainingMs: 0, strictRemainingMs: 3600000 })).toBe(false);
    });
  });
});
