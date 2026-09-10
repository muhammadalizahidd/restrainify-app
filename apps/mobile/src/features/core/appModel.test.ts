import { addCustomDomain, addTrackerEvent, claimDailyReward, createInitialState, getRecoverySnapshot, logRecoveryEvent, triggerBurst, updateSettings } from "./appModel";

describe("Restrainify local domain rules", () => {
  it("allows one daily reward per local day", () => {
    const first = claimDailyReward(createInitialState(), "2026-09-10T08:00:00.000Z");
    const duplicate = claimDailyReward(first, "2026-09-10T20:00:00.000Z");
    expect(duplicate.reward).toEqual(first.reward);
    expect(claimDailyReward(first, "2026-09-11T08:00:00.000Z").reward.balance).toBe(20);
  });

  it("does not create tracker events before an explicit opt-in", () => {
    const initial = createInitialState();
    expect(addTrackerEvent(initial).trackerEvents).toHaveLength(0);
    expect(addTrackerEvent(updateSettings(initial, { fapTrackerEnabled: true })).trackerEvents).toHaveLength(1);
  });

  it("validates custom domains and makes Burst active", () => {
    const withDomain = addCustomDomain(createInitialState(), "https://example.org/a-path");
    expect(withDomain.customDomains).toEqual(["example.org"]);
    expect(addCustomDomain(withDomain, "not a domain").customDomains).toEqual(["example.org"]);
    const burstState = triggerBurst(withDomain, "2026-09-10T08:00:00.000Z");
    expect(getRecoverySnapshot(burstState.recoveryEvents, burstState.burst, "2026-09-10T08:01:00.000Z").burstActive).toBe(true);
  });

  it("tracks today's urges without treating a relapse as lost history", () => {
    const state = logRecoveryEvent(createInitialState(), "urge", "Evening", "2026-09-10T18:00:00.000Z");
    expect(getRecoverySnapshot(state.recoveryEvents, state.burst, "2026-09-10T19:00:00.000Z").urgesLoggedToday).toBe(1);
  });
});
