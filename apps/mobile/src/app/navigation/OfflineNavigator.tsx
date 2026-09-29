import { useEffect, useRef, useState } from "react";
import { Animated, BackHandler, Easing, KeyboardAvoidingView, Linking, PanResponder, Platform, Pressable, ScrollView, StatusBar, Text, View } from "react-native";
import { useOffline } from "../providers/OfflineProvider";
import { Body, Button, Heading, Icon, Loading, Panel, type IconName, useReducedMotion } from "../../components/OfflineUI";
import { ToastNotification } from "../../components/ToastNotification";
import { OfflineHome } from "../../features/dashboard/screens/OfflineHome";
import { ProtectionHealthScreen } from "../../features/protection/screens/ProtectionHealthScreen";
import { BurstActiveScreen } from "../../features/burst/screens/BurstActiveScreen";
import { BurstOutcomeScreen } from "../../features/burst/screens/BurstOutcomeScreen";
import { WebsiteProtectionScreen } from "../../features/protection/screens/WebsiteProtectionScreen";
import { VisualProtectionScreen } from "../../features/protection/screens/VisualProtectionScreen";
import { AccountScreen } from "../../features/auth/screens/AccountScreen";
import { ProgressOverviewScreen } from "../../features/recovery/screens/ProgressOverviewScreen";
import { FapTrackerScreen } from "../../features/fapTracker/screens/FapTrackerScreen";
import { LogTrackerEventScreen } from "../../features/fapTracker/screens/LogTrackerEventScreen";
import { OnboardingFlow } from "../../features/onboarding/OnboardingFlow";
import { BurstSettingsScreen } from "../../features/burst/screens/BurstSettingsScreen";
import { FapTrackerSettingsScreen } from "../../features/fapTracker/screens/FapTrackerSettingsScreen";
import { ShortFormProtectionScreen } from "../../features/protection/screens/ShortFormProtectionScreen";
import { AppControlsScreen } from "../../features/protection/screens/AppControlsScreen";
import { ScheduleEditorScreen } from "../../features/protection/screens/ScheduleEditorScreen";
import { PendingChangeScreen } from "../../features/protection/screens/PendingChangeScreen";
import {
  PermissionDisclosureScreen,
  type PermissionDisclosureType,
  PermissionDeniedScreen,
  type PermissionDeniedType,
  DegradedStateScreen,
  AppLimitReachedScreen,
  ScheduledBlockScreen,
  SyncIssueScreen,
  VisualCoverScreen,
} from "../../features/enforcement";

interface NavigationEntry {
  route: string;
  params?: Record<string, unknown>;
}

const tabs: { route: string; label: string; icon: IconName }[] = [
  { route: "home", label: "Home", icon: "home-outline" },
  { route: "progress", label: "Progress", icon: "chart-bar" },
  { route: "burst", label: "Burst", icon: "lightning-bolt-outline" },
  { route: "settings", label: "Settings", icon: "cog-outline" },
];

export function OfflineNavigator() {
  const { snapshot, palette, error, clearError, refresh, dark, busy } = useOffline();
  const [current, setCurrent] = useState<NavigationEntry>({ route: "home" });
  const [history, setHistory] = useState<NavigationEntry[]>([]);
  const routeMotion = useRef(new Animated.Value(1)).current;
  const routeDirection = useRef(1);
  const routeRef = useRef(current.route);
  const reduceMotion = useReducedMotion();
  const route = current.route;
  const open = (next: string, params?: Record<string, unknown>) => {
    routeDirection.current = 1;
    setHistory((value) => [...value, current]);
    setCurrent({ route: next, params });
  };

  const back = () => {
    routeDirection.current = -1;
    const prev = history.length > 0 ? history[history.length - 1] : { route: "home" };
    setCurrent(prev);
    setHistory((value) => value.slice(0, -1));
  };
  const selectTab = (nextRoute: string) => {
    const currentIndex = tabs.findIndex((tab) => tab.route === route);
    const nextIndex = tabs.findIndex((tab) => tab.route === nextRoute);
    if (currentIndex === nextIndex) return;
    routeDirection.current = nextIndex > currentIndex ? 1 : -1;
    setCurrent({ route: nextRoute });
    setHistory([]);
  };
  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => {
      const isTabRoute = tabs.some((tab) => tab.route === routeRef.current);
      return isTabRoute && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
    },
    onPanResponderRelease: (_, gesture) => {
      const currentIndex = tabs.findIndex((tab) => tab.route === routeRef.current);
      if (currentIndex < 0 || Math.abs(gesture.dx) < 56 || Math.abs(gesture.dx) <= Math.abs(gesture.dy)) return;
      const direction = gesture.dx < 0 ? 1 : -1;
      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= tabs.length) return;
      routeDirection.current = direction;
      setCurrent({ route: tabs[nextIndex].route });
      setHistory([]);
    },
  })).current;

  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (current.route !== "home") {
        back();
        return true;
      }
      return false;
    });
    return () => listener.remove();
  }, [current, history]);
  useEffect(() => {
    routeRef.current = route;
  }, [route]);
  useEffect(() => {
    if (reduceMotion) {
      routeMotion.setValue(1);
      return;
    }
    routeMotion.setValue(0);
    Animated.timing(routeMotion, {
      toValue: 1,
      duration: 380,
      easing: Easing.bezier(0.22, 0.61, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [reduceMotion, route, routeMotion]);

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      try {
        const match = event.url.match(/restrainify:\/\/([^?]+)(?:\?(.*))?/);
        if (match) {
          const routeName = match[1];
          const query = match[2];
          const params: Record<string, unknown> = {};
          if (query) {
            query.split("&").forEach((part) => {
              const [k, v] = part.split("=");
              if (k) {
                const key = decodeURIComponent(k);
                const val = decodeURIComponent(v || "");
                const num = Number(val);
                params[key] = !isNaN(num) && val !== "" ? num : val;
              }
            });
          }
          if (routeName) {
            open(routeName, params);
          }
        }
      } catch {
        // Ignore malformed links
      }
    };

    void Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });
    const sub = Linking.addEventListener("url", handleUrl);
    return () => sub.remove();
  }, []);

  let content;
  if (!snapshot) {
    content = error ? (
      <>
        <Heading title="Your local data needs attention" />
        <Body>{error}</Body>
        <Button title="Try again" onPress={() => void refresh()} />
      </>
    ) : (
      <Loading />
    );
  } else if (!snapshot.settings.onboardingComplete) {
    content = (
      <OnboardingFlow
        onComplete={() => {
          routeDirection.current = 1;
          setCurrent({ route: "home" });
          setHistory([]);
        }}
      />
    );
  } else {
    switch (route) {
      case "onboarding":
        content = (
          <OnboardingFlow
            onComplete={() => {
              routeDirection.current = 1;
              setCurrent({ route: "home" });
              setHistory([]);
            }}
          />
        );
        break;
      case "home":
        content = <OfflineHome open={open} />;
        break;
      case "progress":
        content = <ProgressOverviewScreen open={open} />;
        break;
      case "fap-tracker":
      case "tracker":
        content = <FapTrackerScreen open={open} onBack={back} />;
        break;
      case "log-fap":
        content = <LogTrackerEventScreen open={open} onBack={back} />;
        break;
      case "settings":
        content = <AccountScreen open={open} />;
        break;
      case "short-form":
        content = <ShortFormProtectionScreen open={open} onBack={back} />;
        break;
      case "app-controls":
        content = <AppControlsScreen open={open} onBack={back} />;
        break;
      case "schedule-editor":
        content = (
          <ScheduleEditorScreen
            packageName={(current.params?.packageName as string) ?? "com.instagram.android"}
            label={(current.params?.label as string) ?? "Instagram"}
            open={open}
            onBack={back}
          />
        );
        break;
      case "pending-change":
      case "pending-cooldown":
        content = (
          <PendingChangeScreen
            reason={(current.params?.reason as string) ?? "Disable protected setting"}
            open={open}
            onBack={back}
          />
        );
        break;
      case "data-privacy":
        void Linking.openURL("https://restrainify.com/privacy");
        content = <AccountScreen open={open} onBack={back} />;
        break;
      case "burst-settings":
        content = <BurstSettingsScreen open={open} onBack={back} />;
        break;
      case "fap-settings":
      case "fap-tracker-settings":
        content = <FapTrackerSettingsScreen open={open} onBack={back} />;
        break;
      case "protection-health":
      case "permissions":
        content = <ProtectionHealthScreen open={open} onBack={back} />;
        break;
      case "website-protection":
        content = <WebsiteProtectionScreen open={open} onBack={back} />;
        break;
      case "visual-protection":
      case "visual":
        content = <VisualProtectionScreen open={open} onBack={back} />;
        break;
      case "strict-mode":
      case "strict":
        content = <OfflineHome open={open} />;
        break;
      case "account":
        content = <AccountScreen open={open} onBack={back} />;
        break;
      case "web":
        content = <WebsiteProtectionScreen open={open} onBack={back} />;
        break;
      case "apps":
        content = <AppControlsScreen open={open} onBack={back} />;
        break;
      case "social":
        content = <ShortFormProtectionScreen open={open} onBack={back} />;
        break;
      case "burst":
        content = (
          <BurstActiveScreen
            open={open}
            initialModal={current.params?.modal as string | undefined}
            onBack={history.length > 0 ? back : undefined}
          />
        );
        break;
      case "burst-outcome":
        content = <BurstOutcomeScreen open={open} onBack={back} />;
        break;
      case "privacy":
        void Linking.openURL("https://restrainify.com/privacy");
        content = <AccountScreen open={open} onBack={back} />;
        break;
      case "permission-disclosure":
      case "permissions-disclosure":
        content = (
          <PermissionDisclosureScreen
            permissionType={
              (current.params?.permissionType as PermissionDisclosureType) ?? "usage"
            }
            returnRoute={current.params?.returnRoute as string | undefined}
            returnModal={current.params?.returnModal as string | undefined}
            open={open}
            onBack={back}
          />
        );
        break;
      case "permission-denied":
        content = (
          <PermissionDeniedScreen
            permissionType={
              (current.params?.permissionType as PermissionDeniedType) ?? "usage"
            }
            returnRoute={current.params?.returnRoute as string | undefined}
            returnModal={current.params?.returnModal as string | undefined}
            open={open}
            onBack={back}
          />
        );
        break;
      case "degraded-state":
      case "degraded":
        content = <DegradedStateScreen open={open} onBack={back} />;
        break;
      case "app-limit-reached":
        content = (
          <AppLimitReachedScreen
            packageName={current.params?.packageName as string | undefined}
            appName={current.params?.appName as string | undefined}
            limitMinutes={current.params?.limitMinutes as number | undefined}
            open={open}
            onBack={back}
          />
        );
        break;
      case "scheduled-block":
        content = (
          <ScheduledBlockScreen
            packageName={current.params?.packageName as string | undefined}
            appName={current.params?.appName as string | undefined}
            scheduleText={current.params?.scheduleText as string | undefined}
            open={open}
            onBack={back}
          />
        );
        break;
      case "sync-issue":
        content = <SyncIssueScreen open={open} onBack={back} />;
        break;
      case "visual-cover":
        content = <VisualCoverScreen open={open} onBack={back} />;
        break;
      default:
        content = (
          <OfflineHome
            open={open}
            initialModal={current.params?.modal as string | undefined}
          />
        );
        break;
    }
  }

  const statusBarHeight = StatusBar.currentHeight ?? 0;
  const topInset = Platform.OS === "android" ? Math.max(statusBarHeight, 50) : 20;

  return (
    <View style={{ flex: 1, backgroundColor: palette.backgroundPrimary }}>
      <StatusBar
        barStyle={dark ? "light-content" : "dark-content"}
        backgroundColor={palette.backgroundPrimary}
        translucent
      />
      <View
        style={{
          height: topInset,
          backgroundColor: palette.backgroundPrimary,
          width: "100%",
        }}
      />
      {/* Floating non-intrusive Toast Notification Overlay */}
      <ToastNotification
        message={error}
        onDismiss={clearError}
        topInset={topInset}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <ScrollView
          {...panResponder.panHandlers}
          disableScrollViewPanResponder
          key={route}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 32,
            gap: 12,
          }}
          showsVerticalScrollIndicator={false}
        >
          {snapshot?.storageError && (
            <Panel>
              <Body>{snapshot.storageError}</Body>
            </Panel>
          )}
          <Animated.View style={{ opacity: routeMotion.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ translateX: routeMotion.interpolate({ inputRange: [0, 1], outputRange: [56 * routeDirection.current, 0] }) }] }}>
            {content}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      {snapshot?.settings.onboardingComplete && (
        <View
          accessibilityRole="tablist"
          style={{
            flexDirection: "row",
            backgroundColor: palette.surfacePrimary,
            borderWidth: 1,
            borderColor: palette.borderSubtle,
            borderRadius: 22,
            marginHorizontal: 16,
            marginBottom: Platform.OS === "android" ? 14 : 8,
            padding: 5,
          }}
        >
          {tabs.map((tab) => (
            <Pressable
              key={tab.route}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab.route === route }}
              onPress={() => selectTab(tab.route)}
              style={{
                flex: 1,
                minHeight: 60,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                backgroundColor:
                  tab.route === route ? palette.surfaceMuted : "transparent",
              }}
            >
              <Icon
                name={tab.icon}
                color={
                  tab.route === route
                    ? palette.brandPrimary
                    : palette.textMuted
                }
                size={24}
              />
              <Text
                style={{
                  color:
                    tab.route === route
                      ? palette.brandPrimary
                      : palette.textMuted,
                  fontSize: 11,
                  fontWeight: tab.route === route ? "700" : "400",
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {busy && (
        <Text
          accessibilityLiveRegion="polite"
          style={{
            color: palette.textMuted,
            fontSize: 10,
            textAlign: "center",
          }}
        >
          Saving on this device…
        </Text>
      )}
    </View>
  );
}
