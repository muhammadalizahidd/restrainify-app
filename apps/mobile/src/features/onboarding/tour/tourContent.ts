import type { IconName } from "../../../components/OfflineUI";

export type TourDemoId = "site" | "explicit" | "inapp" | "limits" | "settingsLock" | "uninstall";

export interface TourSlide {
  demo: TourDemoId;
  /** Same names as the home screen's "Your protection" cards. */
  feature: string;
  title: string;
  body: string;
  /** Shown before the user tries the demo. */
  tryHint: string;
  /** Shown once the demo has played. */
  doneHint: string;
  doneIcon: IconName;
}

/** One slide per home-screen protection, in the same order as the home grid. */
export const TOUR_SLIDES: readonly TourSlide[] = [
  {
    demo: "site",
    feature: "Site Blocker",
    title: "Adult sites never load",
    body: "Restrainify blocks adult and bypass sites in every browser and app, on Wi-Fi and mobile data.",
    tryHint: "Tap Visit to try it",
    doneHint: "Blocked before it loaded",
    doneIcon: "check",
  },
  {
    demo: "explicit",
    feature: "Explicit Content Filter",
    title: "Explicit posts get covered",
    body: "On-device AI checks your feeds and covers explicit images and videos. Nothing is uploaded.",
    tryHint: "Tap Scan to try it",
    doneHint: "Covered on your phone in an instant",
    doneIcon: "check",
  },
  {
    demo: "inapp",
    feature: "In-App Blocker",
    title: "Reels stop. Chats keep working.",
    body: "Block just the endless feed in Instagram, YouTube, TikTok, Facebook and Snapchat, or the whole app.",
    tryHint: "Tap the Reels tab to try it",
    doneHint: "Reels blocked, messages still open",
    doneIcon: "check",
  },
  {
    demo: "limits",
    feature: "App Limits",
    title: "Daily limits that hold",
    body: "Give any app a daily time budget and quiet hours. When time is up, it stays closed until tomorrow.",
    tryHint: "Drag to set a limit",
    doneHint: "Limit set for today",
    doneIcon: "check",
  },
  {
    demo: "settingsLock",
    feature: "Settings Lock",
    title: "No turning it off on a whim",
    body: "Lock your protection for a set time. Filters, limits and blocks can't be weakened until the timer ends.",
    tryHint: "Try switching a filter off",
    doneHint: "Locked for 58 more minutes",
    doneIcon: "lock",
  },
  {
    demo: "uninstall",
    feature: "Uninstall Lock",
    title: "Stays installed when it counts",
    body: "Choose 1 to 90 days. Until then, Restrainify blocks the screens used to uninstall it or remove its permissions.",
    tryHint: "Tap Uninstall to try it",
    doneHint: "Uninstall blocked for 30 days",
    doneIcon: "shield-lock-outline",
  },
];

/** Home-screen cards recapped on the final screen. */
export const TOUR_RECAP: readonly { name: string; icon: IconName }[] = [
  { name: "Site Blocker", icon: "web" },
  { name: "Explicit Content Filter", icon: "eye-off-outline" },
  { name: "In-App Blocker", icon: "play-box-outline" },
  { name: "App Limits", icon: "cellphone-cog" },
  { name: "Settings Lock", icon: "lock-outline" },
  { name: "Uninstall Lock", icon: "shield-lock-outline" },
];

/** If the user doesn't try a demo, its result plays by itself after this long, so nobody gets stuck. */
export const TOUR_AUTOPLAY_MS = 3500;
