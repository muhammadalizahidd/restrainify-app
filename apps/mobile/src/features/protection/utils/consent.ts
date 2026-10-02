import type { OfflineSnapshot } from "../../../native/OfflineProtection";

/** True once the user has accepted the website-filtering (VPN) disclosure. Required before the VPN may start. */
export function hasVpnConsent(data: OfflineSnapshot | null | undefined): boolean {
  return Boolean(data?.settings.vpnConsent);
}

/** True once the user has accepted the Visual filter (screen analysis) disclosure. */
export function hasVisualConsent(data: OfflineSnapshot | null | undefined): boolean {
  return Boolean(data?.settings.visualConsent);
}

/** Route params that open the in-app disclosure for the given capability and return the user afterwards. */
export function disclosureParams(
  permissionType: "vpn" | "visual" | "accessibility" | "usage",
  returnRoute: string,
  returnModal?: string
): Record<string, unknown> {
  return { permissionType, returnRoute, ...(returnModal ? { returnModal } : {}) };
}
