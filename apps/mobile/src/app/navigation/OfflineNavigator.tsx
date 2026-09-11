import { useEffect, useState } from "react";
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, Text, View } from "react-native";
import { useOffline } from "../providers/OfflineProvider";
import { Body, Button, Heading, Icon, Loading, Panel, type IconName } from "../../components/OfflineUI";
import { OfflineHome } from "../../features/dashboard/screens/OfflineHome";
import { ProtectionHealthScreen } from "../../features/protection/screens/ProtectionHealthScreen";
import { BurstActiveScreen } from "../../features/burst/screens/BurstActiveScreen";
import { BurstOutcomeScreen } from "../../features/burst/screens/BurstOutcomeScreen";
import { RecoveryProgressScreen } from "../../features/recovery/screens/RecoveryProgressScreen";
import { ScreenTimeScreen } from "../../features/screenTime/screens/ScreenTimeScreen";
import { AppUsageDetailScreen } from "../../features/screenTime/screens/AppUsageDetailScreen";
import { WebsiteProtectionScreen } from "../../features/protection/screens/WebsiteProtectionScreen";
import { VisualProtectionScreen } from "../../features/protection/screens/VisualProtectionScreen";
import { StrictModeScreen } from "../../features/protection/screens/StrictModeScreen";
import { AccountScreen } from "../../features/auth/screens/AccountScreen";
import { ProgressOverviewScreen } from "../../features/recovery/screens/ProgressOverviewScreen";
import { RecoveryJournalScreen } from "../../features/journal/screens/RecoveryJournalScreen";
import { LogUrgeScreen } from "../../features/journal/screens/LogUrgeScreen";
import { LogRelapseScreen } from "../../features/journal/screens/LogRelapseScreen";
import { FapTrackerScreen } from "../../features/fapTracker/screens/FapTrackerScreen";
import { LogTrackerEventScreen } from "../../features/fapTracker/screens/LogTrackerEventScreen";
import { Onboarding } from "../../features/offline/RecoveryScreens";
import { ToolsScreen } from "../../features/tools/screens/ToolsScreen";
import { RecoverySettingsScreen } from "../../features/settings/screens/RecoverySettingsScreen";
import { BurstSettingsScreen } from "../../features/burst/screens/BurstSettingsScreen";
import { FapTrackerSettingsScreen } from "../../features/fapTracker/screens/FapTrackerSettingsScreen";
import { SettingsHubScreen } from "../../features/settings/screens/SettingsHubScreen";
import { DomainManagerScreen } from "../../features/protection/screens/DomainManagerScreen";
import { ScopedOverridesScreen } from "../../features/protection/screens/ScopedOverridesScreen";
import { ProtectedVisualContextsScreen } from "../../features/protection/screens/ProtectedVisualContextsScreen";
import { ShortFormProtectionScreen } from "../../features/protection/screens/ShortFormProtectionScreen";
import { AppControlsScreen } from "../../features/protection/screens/AppControlsScreen";
import { AppLimitScreen } from "../../features/protection/screens/AppLimitScreen";
import { ScheduleEditorScreen } from "../../features/protection/screens/ScheduleEditorScreen";
import { PendingChangeScreen } from "../../features/protection/screens/PendingChangeScreen";
import { NotificationsSettingsScreen } from "../../features/settings/screens/NotificationsSettingsScreen";
import { CloudSyncScreen } from "../../features/sync/screens/CloudSyncScreen";
import { DataPrivacyScreen } from "../../features/settings/screens/DataPrivacyScreen";
import { DeleteAccountScreen } from "../../features/auth/screens/DeleteAccountScreen";
import { ResetLocalDataScreen } from "../../features/settings/screens/ResetLocalDataScreen";

interface NavigationEntry {
  route: string;
  params?: Record<string, unknown>;
}

const tabs: { route: string; label: string; icon: IconName }[] = [
  { route: "home", label: "Home", icon: "home-outline" },
  { route: "progress", label: "Progress", icon: "chart-bar" },
  { route: "journal", label: "Journal", icon: "notebook-outline" },
  { route: "tools", label: "Tools", icon: "view-grid-outline" },
  { route: "settings", label: "Settings", icon: "cog-outline" },
];

export function OfflineNavigator() {
  const { snapshot, palette, error, clearError, refresh, dark, busy } = useOffline();
  const [current, setCurrent] = useState<NavigationEntry>({ route: "home" });
  const [history, setHistory] = useState<NavigationEntry[]>([]);
  const route = current.route;

  const open = (next: string, params?: Record<string, unknown>) => {
    setHistory((value) => [...value, current]);
    setCurrent({ route: next, params });
  };

  const back = () => {
    const prev = history.at(-1) ?? { route: "home" };
    setCurrent(prev);
    setHistory((value) => value.slice(0, -1));
  };

  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (current.route !== "home") {
        const prev = history.at(-1) ?? { route: "home" };
        setCurrent(prev);
        setHistory((value) => value.slice(0, -1));
        return true;
      }
      return false;
    });
    return () => listener.remove();
  }, [current, history]);

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
      <Onboarding
        finish={() => {
          setCurrent({ route: "home" });
          setHistory([]);
        }}
      />
    );
  } else {
    switch (route) {
      case "home":
        content = <OfflineHome open={open} />;
        break;
      case "progress":
        content = <ProgressOverviewScreen open={open} />;
        break;
      case "recovery-progress":
        content = <RecoveryProgressScreen open={open} onBack={back} />;
        break;
      case "screen-time":
        content = <ScreenTimeScreen open={open} onBack={back} />;
        break;
      case "app-detail":
        content = (
          <AppUsageDetailScreen
            packageName={(current.params?.packageName as string) ?? ""}
            open={open}
            onBack={back}
          />
        );
        break;
      case "journal":
        content = <RecoveryJournalScreen open={open} />;
        break;
      case "log-urge":
        content = <LogUrgeScreen open={open} onBack={back} />;
        break;
      case "log-relapse":
        content = <LogRelapseScreen open={open} onBack={back} />;
        break;
      case "fap-tracker":
      case "tracker":
        content = <FapTrackerScreen open={open} onBack={back} />;
        break;
      case "log-fap":
        content = <LogTrackerEventScreen open={open} onBack={back} />;
        break;
      case "tools":
        content = <ToolsScreen open={open} />;
        break;
      case "settings":
        content = <SettingsHubScreen open={open} />;
        break;
      case "domain-manager":
      case "domains":
        content = <DomainManagerScreen open={open} onBack={back} />;
        break;
      case "overrides":
      case "scoped-overrides":
        content = <ScopedOverridesScreen open={open} onBack={back} />;
        break;
      case "visual-contexts":
      case "protected-contexts":
        content = <ProtectedVisualContextsScreen open={open} onBack={back} />;
        break;
      case "short-form":
        content = <ShortFormProtectionScreen open={open} onBack={back} />;
        break;
      case "app-controls":
        content = <AppControlsScreen open={open} onBack={back} />;
        break;
      case "app-limit":
        content = (
          <AppLimitScreen
            packageName={(current.params?.packageName as string) ?? "com.instagram.android"}
            label={(current.params?.label as string) ?? "Instagram"}
            open={open}
            onBack={back}
          />
        );
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
      case "notifications":
        content = <NotificationsSettingsScreen open={open} onBack={back} />;
        break;
      case "cloud-sync":
        content = <CloudSyncScreen open={open} onBack={back} />;
        break;
      case "data-privacy":
        content = <DataPrivacyScreen open={open} onBack={back} />;
        break;
      case "delete-account":
        content = <DeleteAccountScreen open={open} onBack={back} />;
        break;
      case "reset-local":
      case "delete-local":
        content = <ResetLocalDataScreen open={open} onBack={back} />;
        break;
      case "recovery-settings":
        content = <RecoverySettingsScreen open={open} onBack={back} />;
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
        content = <StrictModeScreen open={open} onBack={back} />;
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
        content = <BurstActiveScreen open={open} onBack={back} />;
        break;
      case "burst-outcome":
        content = <BurstOutcomeScreen open={open} onBack={back} />;
        break;
      case "privacy":
        content = <DataPrivacyScreen open={open} onBack={back} />;
        break;
      default:
        content = (
          <>
            <Heading
              title="Visual filtering"
              subtitle="Not included in this offline edition."
            />
            <Panel>
              <Body>
                No screen captures or visual analysis are running. Website and app
                restrictions work independently of a visual model.
              </Body>
            </Panel>
          </>
        );
    }
  }

  const statusBarHeight = StatusBar.currentHeight ?? 0;
  const topInset = Platform.OS === "android" ? Math.max(statusBarHeight, 24) : 0;

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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <ScrollView
          key={route}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 24,
            gap: 12,
          }}
          showsVerticalScrollIndicator={false}
        >
          {snapshot?.settings.onboardingComplete &&
            !tabs.some((tab) => tab.route === route) &&
            route !== "permissions" &&
            route !== "protection-health" &&
            route !== "burst" &&
            route !== "burst-outcome" &&
            route !== "recovery-progress" &&
            route !== "screen-time" &&
            route !== "app-detail" &&
            route !== "website-protection" &&
            route !== "visual-protection" &&
            route !== "visual" &&
            route !== "strict-mode" &&
            route !== "strict" &&
            route !== "account" &&
            route !== "domain-manager" &&
            route !== "domains" &&
            route !== "overrides" &&
            route !== "scoped-overrides" &&
            route !== "visual-contexts" &&
            route !== "protected-contexts" &&
            route !== "short-form" &&
            route !== "app-controls" &&
            route !== "apps" &&
            route !== "social" &&
            route !== "app-limit" &&
            route !== "schedule-editor" &&
            route !== "pending-change" &&
            route !== "pending-cooldown" &&
            route !== "notifications" &&
            route !== "cloud-sync" &&
            route !== "data-privacy" &&
            route !== "privacy" &&
            route !== "delete-account" &&
            route !== "reset-local" &&
            route !== "delete-local" &&
            route !== "recovery-settings" &&
            route !== "burst-settings" &&
            route !== "fap-settings" &&
            route !== "fap-tracker-settings" &&
            route !== "log-urge" &&
            route !== "log-relapse" &&
            route !== "fap-tracker" &&
            route !== "tracker" &&
            route !== "log-fap" && (
              <Pressable
                accessibilityLabel="Go back"
                onPress={back}
                style={{
                  flexDirection: "row",
                  gap: 6,
                  alignItems: "center",
                  minHeight: 44,
                }}
              >
                <Icon name="arrow-left" />
                <Body>Back</Body>
              </Pressable>
            )}
          {error && snapshot && (
            <View
              accessibilityRole="alert"
              style={{
                backgroundColor: palette.dangerSurface,
                borderRadius: 14,
                padding: 14,
                gap: 8,
              }}
            >
              <Body>{error}</Body>
              <Button title="Dismiss" tone="secondary" onPress={clearError} />
            </View>
          )}
          {snapshot?.storageError && (
            <Panel>
              <Body>{snapshot.storageError}</Body>
            </Panel>
          )}
          {content}
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
              onPress={() => {
                setCurrent({ route: tab.route });
                setHistory([]);
              }}
              style={{
                flex: 1,
                minHeight: 56,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
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
                size={22}
              />
              <Text
                style={{
                  color:
                    tab.route === route
                      ? palette.brandPrimary
                      : palette.textMuted,
                  fontSize: 9,
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
