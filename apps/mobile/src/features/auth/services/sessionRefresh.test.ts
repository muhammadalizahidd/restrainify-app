import type { MobileSession } from "../types";
import {
  createSessionRefreshGate,
  sessionNeedsRefresh,
  SESSION_REFRESH_BUFFER_SECONDS,
} from "./sessionRefresh";

const expiringSession: MobileSession = {
  accessToken: "old-access-token",
  refreshToken: "old-refresh-token",
  expiresAt: 1_000,
};

const replacementSession: MobileSession = {
  accessToken: "new-access-token",
  refreshToken: "new-refresh-token",
  expiresAt: 4_600,
};

describe("session refresh lifecycle", () => {
  it("refreshes at the five-minute boundary and when older sessions lack expiry metadata", () => {
    expect(
      sessionNeedsRefresh(expiringSession, 1_000 - SESSION_REFRESH_BUFFER_SECONDS - 0.001),
    ).toBe(false);
    expect(sessionNeedsRefresh(expiringSession, 1_000 - SESSION_REFRESH_BUFFER_SECONDS)).toBe(true);
    expect(
      sessionNeedsRefresh({
        accessToken: "legacy-access-token",
        refreshToken: "legacy-refresh-token",
      }),
    ).toBe(true);
  });

  it("returns an unexpired session without rotating its refresh token", async () => {
    const refreshSession = jest.fn(async () => replacementSession);
    const persistSession = jest.fn(async () => {});
    const gate = createSessionRefreshGate(refreshSession, persistSession);
    const unexpiredSession = { ...expiringSession, expiresAt: 10_000 };

    await expect(gate.ensureFresh(unexpiredSession, 1_000)).resolves.toBe(unexpiredSession);
    expect(refreshSession).not.toHaveBeenCalled();
    expect(persistSession).not.toHaveBeenCalled();
  });

  it("serializes concurrent refreshes and returns the persisted replacement to every caller", async () => {
    let resolveRefresh: ((session: MobileSession) => void) | undefined;
    let resolvePersist: (() => void) | undefined;
    const refreshSession = jest.fn(
      () =>
        new Promise<MobileSession>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const persistSession = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvePersist = resolve;
        }),
    );
    const gate = createSessionRefreshGate(refreshSession, persistSession);

    const firstCaller = gate.ensureFresh(expiringSession, 900);
    const secondCaller = gate.ensureFresh(expiringSession, 900);

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(refreshSession).toHaveBeenCalledWith("old-refresh-token");

    resolveRefresh!(replacementSession);
    await Promise.resolve();
    expect(persistSession).toHaveBeenCalledWith(replacementSession);

    resolvePersist!();
    await expect(Promise.all([firstCaller, secondCaller])).resolves.toEqual([
      replacementSession,
      replacementSession,
    ]);
  });

  it("does not attach a new sign-in session to a different token rotation", async () => {
    const newSignInSession = {
      ...expiringSession,
      accessToken: "new-sign-in-access-token",
      refreshToken: "new-sign-in-refresh-token",
    };
    const replacementForNewSignIn = {
      ...replacementSession,
      accessToken: "new-sign-in-replacement-access-token",
      refreshToken: "new-sign-in-replacement-refresh-token",
    };
    const refreshSession = jest.fn(async (refreshToken: string) =>
      refreshToken === expiringSession.refreshToken ? replacementSession : replacementForNewSignIn,
    );
    const persistSession = jest.fn(async () => {});
    const gate = createSessionRefreshGate(refreshSession, persistSession);

    const priorSessionRefresh = gate.ensureFresh(expiringSession, 900);
    const newSignInRefresh = gate.ensureFresh(newSignInSession, 900);

    await expect(Promise.all([priorSessionRefresh, newSignInRefresh])).resolves.toEqual([
      replacementSession,
      replacementForNewSignIn,
    ]);
    expect(refreshSession).toHaveBeenCalledTimes(2);
  });

  it("does not publish a replacement session when secure storage rejects it", async () => {
    const refreshSession = jest.fn(async () => replacementSession);
    const persistSession = jest.fn(async () => {
      throw new Error("SecureStore unavailable");
    });
    const gate = createSessionRefreshGate(refreshSession, persistSession);

    await expect(gate.ensureFresh(expiringSession, 900)).rejects.toThrow("SecureStore unavailable");
  });
});
