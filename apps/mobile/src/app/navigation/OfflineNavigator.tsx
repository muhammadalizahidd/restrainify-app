import { useEffect, useState } from "react";
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, Text, View } from "react-native";
import { useOffline } from "../providers/OfflineProvider";
import { Body, Button, Heading, Icon, Loading, Panel, type IconName } from "../../components/OfflineUI";
import { OfflineHome } from "../../features/dashboard/screens/OfflineHome";
import { AppsScreen, PrivacyScreen, SettingsScreen, WebsiteScreen } from "../../features/offline/ProtectionScreens";
import { ProtectionHealthScreen } from "../../features/protection/screens/ProtectionHealthScreen";
import { BurstActiveScreen } from "../../features/burst/screens/BurstActiveScreen";
import { BurstOutcomeScreen } from "../../features/burst/screens/BurstOutcomeScreen";
import { RecoveryProgressScreen } from "../../features/recovery/screens/RecoveryProgressScreen";
import { ScreenTimeScreen } from "../../features/screenTime/screens/ScreenTimeScreen";
import { AppUsageDetailScreen } from "../../features/screenTime/screens/AppUsageDetailScreen";
import { JournalScreen, Onboarding, ProgressScreen, ToolsScreen } from "../../features/offline/RecoveryScreens";

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
        content = <ProgressScreen open={open} />;
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
        content = <JournalScreen />;
        break;
      case "tracker":
        content = <JournalScreen tracker />;
        break;
      case "tools":
        content = <ToolsScreen open={open} />;
        break;
      case "settings":
        content = <SettingsScreen open={open} />;
        break;
      case "protection-health":
      case "permissions":
        content = <ProtectionHealthScreen open={open} onBack={back} />;
        break;
      case "web":
        content = <WebsiteScreen />;
        break;
      case "apps":
        content = <AppsScreen />;
        break;
      case "social":
        content = <AppsScreen socialOnly />;
        break;
      case "burst":
        content = <BurstActiveScreen open={open} onBack={back} />;
        break;
      case "burst-outcome":
        content = <BurstOutcomeScreen open={open} onBack={back} />;
        break;
      case "privacy":
        content = <PrivacyScreen />;
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
            route !== "app-detail" && (
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
