import { CUSTOM_DAY_OPTIONS, UNINSTALL_DAY_PRESETS, dayLabel } from "./uninstallDuration";

describe("uninstall lock duration", () => {
  it("offers six presets so they fill two rows of three", () => {
    expect([...UNINSTALL_DAY_PRESETS]).toEqual([1, 7, 14, 30, 60, 90]);
  });

  it("lets the custom picker choose every whole day from 1 to 90", () => {
    expect(CUSTOM_DAY_OPTIONS).toHaveLength(90);
    expect(CUSTOM_DAY_OPTIONS[0]).toBe(1);
    expect(CUSTOM_DAY_OPTIONS[89]).toBe(90);
  });

  it("labels singular and plural days", () => {
    expect(dayLabel(1)).toBe("1 day");
    expect(dayLabel(14)).toBe("14 days");
  });
});
