/**
 * Canonical social packages and mapping utilities.
 * Keeps web domains, variant packages, and feed rules synchronized across Android and React Native.
 */

export const CANONICAL_SOCIAL_PACKAGES: Record<string, string> = {
  "com.instagram.android": "com.instagram.android",
  "com.instagram.lite": "com.instagram.android",
  "com.instagram.barcelona": "com.instagram.android",
  "com.google.android.youtube": "com.google.android.youtube",
  "com.facebook.katana": "com.facebook.katana",
  "com.facebook.lite": "com.facebook.katana",
  "com.facebook.orca": "com.facebook.katana",
  "com.snapchat.android": "com.snapchat.android",
  "com.zhiliaoapp.musically": "com.zhiliaoapp.musically",
  "com.zhiliaoapp.musically.go": "com.zhiliaoapp.musically",
  "com.ss.android.ugc.trill": "com.zhiliaoapp.musically",
  "com.twitter.android": "com.twitter.android",
  "com.twitter.android.lite": "com.twitter.android",
  "com.reddit.frontpage": "com.reddit.frontpage",
  "com.pinterest": "com.pinterest",
  "com.pinterest.twa": "com.pinterest",
};

export const DEFAULT_FEED_PACKAGES = [
  "com.instagram.android",
  "com.google.android.youtube",
  "com.facebook.katana",
  "com.snapchat.android",
  "com.zhiliaoapp.musically",
];

export function getCanonicalSocialPackage(pkg: string): string {
  const clean = (pkg || "").trim().toLowerCase();
  return CANONICAL_SOCIAL_PACKAGES[clean] || clean;
}

export function isSameSocialApp(pkgA: string, pkgB: string): boolean {
  if (!pkgA || !pkgB) return false;
  if (pkgA.trim().toLowerCase() === pkgB.trim().toLowerCase()) return true;
  return getCanonicalSocialPackage(pkgA) === getCanonicalSocialPackage(pkgB);
}
