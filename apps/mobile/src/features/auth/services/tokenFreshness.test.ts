import { isSessionStale, readJwtExpiry } from "./tokenFreshness";

function jwt(exp?: number): string {
  const b64 = (o: object) => (globalThis as unknown as { btoa: (v: string) => string }).btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${b64({ alg: "HS256" })}.${b64(exp === undefined ? {} : { exp })}.sig`;
}

describe("tokenFreshness", () => {
  it("reads exp from a JWT", () => {
    expect(readJwtExpiry(jwt(1000))).toBe(1000);
    expect(readJwtExpiry("not-a-jwt")).toBeNull();
  });

  it("is fresh when well before expiry", () => {
    expect(isSessionStale({ accessToken: jwt(10_000) }, 1000)).toBe(false);
  });

  it("is stale inside the skew window or after expiry", () => {
    expect(isSessionStale({ accessToken: jwt(1030) }, 1000)).toBe(true);
    expect(isSessionStale({ accessToken: jwt(900) }, 1000)).toBe(true);
  });

  it("prefers JWT exp over a wrong stored expiresAt", () => {
    expect(isSessionStale({ accessToken: jwt(900), expiresAt: 99_999 }, 1000)).toBe(true);
  });

  it("falls back to expiresAt, and is stale when nothing is known", () => {
    expect(isSessionStale({ accessToken: "opaque", expiresAt: 10_000 }, 1000)).toBe(false);
    expect(isSessionStale({ accessToken: "opaque" }, 1000)).toBe(true);
  });
});
