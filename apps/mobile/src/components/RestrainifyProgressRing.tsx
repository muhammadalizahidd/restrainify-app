import { requireNativeComponent, type ViewProps } from "react-native";

export interface RestrainifyProgressRingProps extends ViewProps {
  progress: number;
}

/**
 * NativeProgressRing wraps the Android native RestrainifyProgressRing component.
 * In React Native, requireNativeComponent must be called only once per component
 * name to prevent invariant registration collisions.
 */
export const NativeProgressRing = requireNativeComponent<RestrainifyProgressRingProps>(
  "RestrainifyProgressRing"
);
